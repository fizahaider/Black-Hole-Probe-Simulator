import json
import logging
from rest_framework import generics, status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from document_ai.services.groq_client import groq_client
from .models import PrepPlan
from .serializers import (
    PrepPlanGenerateSerializer,
    PrepPlanSerializer,
    PrepPlanSummarySerializer,
    PrepPlanRenameSerializer,
    PrepPlanRegenerateSerializer,
    PrepTaskToggleSerializer,
    PrepPhaseStartSerializer,
)
from document_ai.models import StudyPlan

logger = logging.getLogger(__name__)


def _default_progress_payload(parsed_result):
    phases = parsed_result.get('phases') or []
    total_task_count = 0
    for phase in phases:
        total_task_count += len(phase.get('tasks') or [])
    return {
        'current_phase_index': 0,
        'completed_task_ids': [],
        'total_task_count': total_task_count,
        'saved_resource_urls': [],
        'last_action': None,
    }


def _task_id(phase_index, task_index):
    return f"{phase_index}:{task_index}"


def _completion_percent(progress_payload):
    total = progress_payload.get('total_task_count', 0)
    completed_count = len(progress_payload.get('completed_task_ids', []))
    return round((completed_count / total) * 100) if total else 0


def _build_prompts(payload, use_web_search=False):
    web_search_directive = (
        "If your model/runtime supports live web search, use it to prefer up-to-date, high-quality resources. "
        "If not available, gracefully fall back to strong canonical resources from model knowledge."
        if use_web_search
        else "Use strong canonical learning resources with stable URLs."
    )

    system_prompt = (
        "You are a high-end preparation strategist. "
        "Return ONLY a strict JSON object (no markdown) tailored for student prep roadmaps. "
        "Prioritize structured, phase-based execution plans and practical resources.\n\n"
        f"Resource strategy: {web_search_directive}\n\n"
        "Required JSON schema:\n"
        "{\n"
        '  "topic": string,\n'
        '  "goal": string,\n'
        '  "level": string,\n'
        '  "duration_days": number,\n'
        '  "hours_per_day": number,\n'
        '  "preferred_format": string,\n'
        '  "overview": string,\n'
        '  "phases": [\n'
        "    {\n"
        '      "title": string,\n'
        '      "objective": string,\n'
        '      "duration_label": string,\n'
        '      "tasks": [string, ...]\n'
        "    }\n"
        "  ],\n"
        '  "resources": [\n'
        "    {\n"
        '      "title": string,\n'
        '      "url": string,\n'
        '      "type": "video" | "article" | "practice" | "repo",\n'
        '      "difficulty": "beginner" | "intermediate" | "advanced",\n'
        '      "estimated_time": string,\n'
        '      "why_recommended": string,\n'
        '      "phase_tag": string\n'
        "    }\n"
        "  ],\n"
        '  "next_step": string\n'
        "}\n\n"
        "Rules:\n"
        "- Generate 3 to 6 phases.\n"
        "- Each phase should include 3 to 6 practical tasks.\n"
        "- Generate 8 to 14 resources with real-looking URLs.\n"
        "- CRITICAL: Resources must be SPECIFIC and ACTIONABLE, not generic.\n"
        "  * For DSA/coding: Link to specific problem sets (e.g., LeetCode problem numbers, specific HackerRank challenges, GeeksforGeeks articles on exact topics)\n"
        "  * For theory: Link to specific chapters, sections, or tutorials (not homepages)\n"
        "  * For projects: Link to specific GitHub repos with clear READMEs or starter code\n"
        "  * For videos: Link to specific playlist items or tutorial videos (not channel homepages)\n"
        "- Every URL should take the student directly to actionable content they can start immediately.\n"
        "- Avoid generic URLs like 'leetcode.com' or 'youtube.com'. Use specific paths like 'leetcode.com/problems/two-sum/' or 'youtube.com/watch?v=specific-id'.\n"
        "- Keep output concise but actionable.\n"
        "- Ensure valid JSON only."
    )
    user_prompt = (
        f"Build a personalized preparation roadmap:\n"
        f"- Topic: {payload['topic']}\n"
        f"- Goal: {payload['goal']}\n"
        f"- Level: {payload['level']}\n"
        f"- Duration days: {payload['duration_days']}\n"
        f"- Hours/day: {payload['hours_per_day']}\n"
        f"- Preferred format: {payload['preferred_format']}\n"
    )
    return system_prompt, user_prompt


def _generate_payload(payload, use_web_search=False):
    system_prompt, user_prompt = _build_prompts(payload, use_web_search=use_web_search)
    completion = groq_client.get_completion(system_prompt, user_prompt)
    parsed = json.loads(completion)
    parsed['topic'] = payload['topic']
    parsed['goal'] = payload['goal']
    parsed['level'] = payload['level']
    parsed['duration_days'] = payload['duration_days']
    parsed['hours_per_day'] = payload['hours_per_day']
    parsed['preferred_format'] = payload['preferred_format']
    parsed.setdefault('phases', [])
    parsed.setdefault('resources', [])
    parsed.setdefault('overview', '')
    parsed.setdefault('next_step', '')
    return parsed


class PrepPlanListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrepPlanSummarySerializer

    def get_queryset(self):
        return PrepPlan.objects.filter(user=self.request.user).order_by('-updated_at')


class PrepPlanDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrepPlanSerializer

    def get_queryset(self):
        return PrepPlan.objects.filter(user=self.request.user)


class PrepPlanGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PrepPlanGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        use_web_search = bool(payload.get('use_web_search', False))

        try:
            parsed = _generate_payload(payload, use_web_search=use_web_search)
            web_search_used = False
        except Exception as exc:
            logger.exception("Prep Hub generation failed")
            return Response(
                {"error": f"Failed to generate plan: {str(exc)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        prep_plan = PrepPlan.objects.create(
            user=request.user,
            topic=payload['topic'],
            goal=payload['goal'],
            level=payload['level'],
            duration_days=payload['duration_days'],
            hours_per_day=payload['hours_per_day'],
            preferred_format=payload['preferred_format'],
            status='active',
            result_payload=parsed,
            progress_payload=_default_progress_payload(parsed),
            generated_with_web_search=web_search_used,
        )

        return Response(
            {
                "id": str(prep_plan.id),
                "status": prep_plan.status,
                "is_active_focus": prep_plan.is_active_focus,
                "progress_payload": prep_plan.progress_payload,
                "progress": {
                    "completed_tasks": 0,
                    "total_tasks": prep_plan.progress_payload.get('total_task_count', 0),
                    "completion_percent": 0,
                    "current_phase_index": prep_plan.progress_payload.get('current_phase_index', 0),
                },
                "web_search_requested": use_web_search,
                "web_search_used": web_search_used,
                **parsed,
            },
            status=status.HTTP_201_CREATED,
        )


class PrepPlanRenameView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        serializer = PrepPlanRenameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_topic = serializer.validated_data['topic']
        plan.topic = new_topic
        payload = plan.result_payload or {}
        payload['topic'] = new_topic
        plan.result_payload = payload
        plan.save(update_fields=['topic', 'result_payload', 'updated_at'])
        return Response({"ok": True, "id": str(plan.id), "topic": plan.topic})


class PrepPlanDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PrepPlanRegenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        serializer = PrepPlanRegenerateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        use_web_search = serializer.validated_data.get('use_web_search', False)

        payload = {
            'topic': plan.topic,
            'goal': plan.goal,
            'level': plan.level,
            'duration_days': plan.duration_days,
            'hours_per_day': plan.hours_per_day,
            'preferred_format': plan.preferred_format,
        }
        try:
            parsed = _generate_payload(payload, use_web_search=use_web_search)
            web_search_used = False
        except Exception as exc:
            logger.exception("Prep Hub regenerate failed")
            return Response(
                {"error": f"Failed to regenerate plan: {str(exc)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        plan.result_payload = parsed
        plan.progress_payload = _default_progress_payload(parsed)
        plan.status = 'active'
        plan.generated_with_web_search = web_search_used
        plan.updated_at = timezone.now()
        plan.save(update_fields=['result_payload', 'progress_payload', 'status', 'generated_with_web_search', 'updated_at'])

        return Response(
            {
                "id": str(plan.id),
                "status": plan.status,
                "is_active_focus": plan.is_active_focus,
                "progress_payload": plan.progress_payload,
                "progress": {
                    "completed_tasks": len(plan.progress_payload.get('completed_task_ids', [])),
                    "total_tasks": plan.progress_payload.get('total_task_count', 0),
                    "completion_percent": _completion_percent(plan.progress_payload),
                    "current_phase_index": plan.progress_payload.get('current_phase_index', 0),
                },
                "web_search_requested": use_web_search,
                "web_search_used": web_search_used,
                **parsed,
            },
            status=status.HTTP_200_OK,
        )


class PrepPlanSetFocusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        PrepPlan.objects.filter(user=request.user, is_active_focus=True).exclude(pk=plan.pk).update(is_active_focus=False)
        plan.is_active_focus = True
        if plan.status == 'draft':
            plan.status = 'active'
        plan.save(update_fields=['is_active_focus', 'status', 'updated_at'])
        return Response({"ok": True, "id": str(plan.id), "is_active_focus": True})


class PrepPlanStartPhaseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        serializer = PrepPhaseStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phase_index = serializer.validated_data['phase_index']
        phases = (plan.result_payload or {}).get('phases') or []
        if phase_index >= len(phases):
            return Response({"error": "Invalid phase index."}, status=status.HTTP_400_BAD_REQUEST)
        progress = plan.progress_payload or {}
        progress['current_phase_index'] = phase_index
        progress['last_action'] = f"started_phase_{phase_index}"
        plan.progress_payload = progress
        if plan.status == 'draft':
            plan.status = 'active'
        plan.save(update_fields=['progress_payload', 'status', 'updated_at'])
        return Response({"ok": True, "current_phase_index": phase_index})


class PrepPlanToggleTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        serializer = PrepTaskToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phase_index = serializer.validated_data['phase_index']
        task_index = serializer.validated_data['task_index']
        completed = serializer.validated_data.get('completed', True)

        phases = (plan.result_payload or {}).get('phases') or []
        if phase_index >= len(phases):
            return Response({"error": "Invalid phase index."}, status=status.HTTP_400_BAD_REQUEST)
        tasks = phases[phase_index].get('tasks') or []
        if task_index >= len(tasks):
            return Response({"error": "Invalid task index."}, status=status.HTTP_400_BAD_REQUEST)

        progress = plan.progress_payload or {}
        completed_ids = set(progress.get('completed_task_ids', []))
        current_task_id = _task_id(phase_index, task_index)
        if completed:
            completed_ids.add(current_task_id)
        else:
            completed_ids.discard(current_task_id)

        progress['completed_task_ids'] = sorted(completed_ids)
        progress['total_task_count'] = progress.get('total_task_count') or _default_progress_payload(plan.result_payload).get('total_task_count', 0)
        progress['last_action'] = f"toggle_task_{phase_index}_{task_index}_{'done' if completed else 'pending'}"
        plan.progress_payload = progress
        if plan.status == 'draft':
            plan.status = 'active'
        if progress['total_task_count'] and len(progress['completed_task_ids']) >= progress['total_task_count']:
            plan.status = 'completed'
        elif plan.status == 'completed' and len(progress['completed_task_ids']) < progress['total_task_count']:
            plan.status = 'active'
        plan.save(update_fields=['progress_payload', 'status', 'updated_at'])

        return Response({
            "ok": True,
            "completion_percent": _completion_percent(progress),
            "status": plan.status,
        })


class PrepPlanSaveResourceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        url = str(request.data.get('url', '')).strip()
        if not url:
            return Response({"error": "url is required"}, status=status.HTTP_400_BAD_REQUEST)
        progress = plan.progress_payload or {}
        urls = set(progress.get('saved_resource_urls', []))
        urls.add(url)
        progress['saved_resource_urls'] = sorted(urls)
        progress['last_action'] = "saved_resource"
        plan.progress_payload = progress
        plan.save(update_fields=['progress_payload', 'updated_at'])
        return Response({"ok": True, "saved_resource_count": len(progress['saved_resource_urls'])})


class PrepPlanConvertStudyPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(PrepPlan, pk=pk, user=request.user)
        phases = (plan.result_payload or {}).get('phases') or []
        if not phases:
            return Response({"error": "No phases found to convert."}, status=status.HTTP_400_BAD_REQUEST)

        schedule = []
        day_counter = 1
        for phase in phases:
            phase_title = phase.get('title', 'Phase')
            for task in phase.get('tasks') or []:
                schedule.append({
                    "day": day_counter,
                    "task": f"[{phase_title}] {task}",
                    "task_type": "review",
                    "estimated_time": f"{plan.hours_per_day}h",
                    "completed": False,
                })
                day_counter += 1

        plan_content = {
            "topic": plan.topic,
            "source": "prep_hub",
            "prep_plan_id": str(plan.id),
            "schedule": schedule,
        }
        study_plan = StudyPlan.objects.create(
            user=request.user,
            space=None,
            plan_content=plan_content,
            status="active",
        )
        progress = plan.progress_payload or {}
        progress['last_action'] = f"converted_to_study_plan_{study_plan.id}"
        plan.progress_payload = progress
        plan.save(update_fields=['progress_payload', 'updated_at'])
        return Response({
            "ok": True,
            "study_plan_id": str(study_plan.id),
            "schedule_count": len(schedule),
        })

