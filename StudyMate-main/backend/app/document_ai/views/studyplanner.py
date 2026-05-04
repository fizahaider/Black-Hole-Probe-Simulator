import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from account.models import UserProgress
from account.services.notifications import create_notification
from ..serializers import StudyPlannerRequestSerializer, StudyPlannerResponseSerializer, StudyPlanSerializer
from ..services.studyplan_service import StudyPlanService
from ..models import StudyPlan


def _resolve_study_plan_document_pk(pk, data):
    """
    URL pk from documents/<uuid>/studyplanner/ is used when present.
    Otherwise resolve from body (document_id, document_ids, or space-only).
    """
    if pk and str(pk) not in ("0", "None"):
        return pk
    document_id = data.get("document_id")
    doc_ids = data.get("document_ids")
    if not document_id and isinstance(doc_ids, (list, tuple)) and len(doc_ids) > 0:
        document_id = doc_ids[0]
    space_id = data.get("space_id")
    if document_id:
        return document_id
    if space_id:
        return None
    raise ValueError("document_id, document_ids, or space_id is required for generation")


class DocumentStudyPlannerView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: StudyPlanSerializer(many=True)},
        description="List study plans for a specific space."
    )
    def get(self, request, pk=None, *args, **kwargs):
        space_id = request.query_params.get('space_id')
        if space_id:
            plans = StudyPlan.objects.filter(user=request.user, space_id=space_id).order_by('-created_at')
        else:
            plans = StudyPlan.objects.filter(user=request.user).order_by('-created_at')
            
        serializer = StudyPlanSerializer(plans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=StudyPlannerRequestSerializer,
        responses={200: StudyPlannerResponseSerializer},
        description="Generate a state-of-the-art, personalized study plan based on the document content."
    )
    def post(self, request, pk=None, *args, **kwargs):
        try:
            pk = _resolve_study_plan_document_pk(pk, request.data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = StudyPlannerRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = StudyPlanService.generate_study_plan(
                document_id=pk,
                user=request.user,
                time_per_day=serializer.validated_data['time_per_day'],
                total_days=serializer.validated_data.get('total_days', 7),
                skill_level=serializer.validated_data['skill_level'],
                focus=serializer.validated_data['focus'],
                learning_style=serializer.validated_data.get('learning_style', 'interactive'),
                revision_strategy=serializer.validated_data.get('revision_strategy', 'mixed'),
                document_ids=request.data.get('document_ids'),
                space_id=request.data.get('space_id')
            )
            return Response(plan, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentStudyPlannerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=StudyPlanSerializer,
        responses={200: StudyPlanSerializer},
        description="Update a study plan (e.g., ticking off tasks) and increment user streak."
    )
    def patch(self, request, pk, *args, **kwargs):
        try:
            plan = StudyPlan.objects.get(id=pk, user=request.user)
        except StudyPlan.DoesNotExist:
            return Response({"error": "Study plan not found"}, status=status.HTTP_404_NOT_FOUND)

        old_schedule = []
        if isinstance(plan.plan_content, dict):
            old_schedule = plan.plan_content.get('schedule') or []

        serializer = StudyPlanSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            incoming_plan_content = serializer.validated_data.get('plan_content')
            incoming_schedule = []
            if isinstance(incoming_plan_content, dict):
                incoming_schedule = incoming_plan_content.get('schedule') or []

            today = timezone.localdate()
            plan_start_date = timezone.localtime(plan.created_at).date()
            elapsed_days = max(0, (today - plan_start_date).days)
            max_allowed_day = elapsed_days + 1

            for i, new_task in enumerate(incoming_schedule):
                if not isinstance(new_task, dict):
                    continue
                old_task = old_schedule[i] if i < len(old_schedule) and isinstance(old_schedule[i], dict) else {}
                old_completed = bool(old_task.get('completed'))
                new_completed = bool(new_task.get('completed'))
                if not new_completed or old_completed:
                    continue
                try:
                    task_day = int(new_task.get('day', new_task.get('day_number', i + 1)))
                except (TypeError, ValueError):
                    task_day = i + 1
                if task_day > max_allowed_day:
                    return Response(
                        {
                            "error": (
                                f"Day {task_day} cannot be completed yet. "
                                f"Only tasks up to Day {max_allowed_day} are available today."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            serializer.save()

                                                              
            progress, created = UserProgress.objects.get_or_create(user=request.user)
            today = timezone.localdate()
            
                                                                                
            plan_content = serializer.instance.plan_content
            schedule = plan_content.get('schedule', []) if isinstance(plan_content, dict) else []
            if schedule and all(task.get('completed', False) for task in schedule):
                serializer.instance.status = 'completed'
            else:
                serializer.instance.status = 'active'
            serializer.instance.save(update_fields=['status'])
            
                                                                                                          
            has_completed_task = any(task.get('completed', False) for task in schedule)
            
            if has_completed_task and progress.last_completed_task_date != today:
                if progress.last_completed_task_date == today - datetime.timedelta(days=1):
                    progress.streak_count += 1
                else:
                    progress.streak_count = 1                            
                
                progress.last_completed_task_date = today
                progress.save()

            if serializer.instance.status == 'completed':
                create_notification(
                    request.user,
                    title='Study plan complete',
                    body='You finished every task in one of your roadmaps.',
                    kind='study',
                    link='/dashboard/study',
                )
            else:
                for i, new_task in enumerate(schedule):
                    if not isinstance(new_task, dict):
                        continue
                    old_task = old_schedule[i] if i < len(old_schedule) and isinstance(old_schedule[i], dict) else {}
                    old_c = bool(old_task.get('completed'))
                    new_c = bool(new_task.get('completed'))
                    if new_c and not old_c:
                        day = new_task.get('day', new_task.get('day_number', i + 1))
                        create_notification(
                            request.user,
                            title='Study task checked off',
                            body=f'You completed Day {day} in your study plan.',
                            kind='study',
                            link='/dashboard/study',
                        )

            return Response({"data": serializer.data, "current_streak": progress.streak_count}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

