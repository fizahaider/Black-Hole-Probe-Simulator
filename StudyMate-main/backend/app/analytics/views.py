from collections import defaultdict
from datetime import timedelta

from django.db.models import Avg
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import UserProgress
from document_ai.models import QuizAttempt, StudyPlan
from rag.models import UserMastery
from prep_hub.models import PrepPlan


def _fmt_day(value):
    return timezone.localtime(value).strftime('%b %d')


def _safe_percent(value):
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return 0.0


def get_quiz_trend(user):
    attempts = (
        QuizAttempt.objects.filter(user=user)
        .exclude(user_answers={})
        .order_by('created_at')
        .values('score', 'created_at')
    )
    return [
        {
            'date': _fmt_day(row['created_at']),
            'score': _safe_percent(row['score']),
        }
        for row in attempts
    ]


def get_weak_concepts(user):
    weak = (
        UserMastery.objects.filter(user=user, attempts__gt=0)
        .select_related('concept', 'concept__document')
        .order_by('score')[:5]
    )
    results = []
    for mastery in weak:
        concept = mastery.concept
        results.append(
            {
                'concept': concept.name,
                'document': concept.document.title,
                'mastery': round(max(0.0, mastery.score) * 100),
                'attempts': mastery.attempts,
                'last_tried': _fmt_day(mastery.last_attempt) if mastery.last_attempt else None,
            }
        )
    return results


def get_mastery_distribution(user):
    scores = list(UserMastery.objects.filter(user=user).values_list('score', flat=True))
    return {
        'mastered': sum(1 for s in scores if s >= 0.9),
        'proficient': sum(1 for s in scores if 0.7 <= s < 0.9),
        'learning': sum(1 for s in scores if 0.3 <= s < 0.7),
        'struggling': sum(1 for s in scores if s < 0.3),
    }


def _extract_completion_date(slot):
    if not isinstance(slot, dict):
        return None
    for key in ('completed_date', 'completed_at', 'updated_at', 'date'):
        raw = slot.get(key)
        if not raw:
            continue
        try:
            parsed = timezone.datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
        except ValueError:
            continue
        if parsed.tzinfo is None:
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed.date()
    return None


def get_activity_heatmap(user):
    activity = defaultdict(int)
    now = timezone.now()
    start_date = (now - timedelta(days=83)).date()

    attempts = QuizAttempt.objects.filter(user=user, created_at__date__gte=start_date).values_list('created_at', flat=True)
    for created_at in attempts:
        activity[timezone.localtime(created_at).date().isoformat()] += 1

    plans = StudyPlan.objects.filter(user=user, created_at__date__gte=start_date).values('plan_content', 'last_progress_update')
    for plan in plans:
        schedule = (plan.get('plan_content') or {}).get('schedule', [])
        fallback_date = timezone.localtime(plan['last_progress_update']).date().isoformat()
        for slot in schedule:
            if isinstance(slot, dict) and slot.get('completed'):
                completed_on = _extract_completion_date(slot)
                key = completed_on.isoformat() if completed_on else fallback_date
                if key >= start_date.isoformat():
                    activity[key] += 1

    result = []
    for i in range(83, -1, -1):
        day = (now - timedelta(days=i)).date()
        key = day.isoformat()
        result.append({'date': key, 'count': activity.get(key, 0)})
    return result


def get_ai_insights(user):
    insights = []

    weakest = UserMastery.objects.filter(user=user).select_related('concept').order_by('score').first()
    if weakest and weakest.score < 0.5:
        insights.append(
            {
                'type': 'warning',
                'icon': 'warning',
                'text': (
                    f"You're struggling with '{weakest.concept.name}' - "
                    f"{round(weakest.score * 100)}% mastery after {weakest.attempts} attempts."
                ),
            }
        )

    week_ago = timezone.now() - timedelta(days=7)
    recent_attempts = QuizAttempt.objects.filter(user=user, created_at__gte=week_ago).exclude(user_answers={})
    if recent_attempts.exists():
        avg = recent_attempts.aggregate(avg=Avg('score')).get('avg')
        insights.append(
            {
                'type': 'success',
                'icon': 'trend',
                'text': f"Your average quiz score this week is {_safe_percent(avg)}%.",
            }
        )

    stale_date = timezone.now() - timedelta(days=7)
    stale_count = UserMastery.objects.filter(user=user, last_attempt__lt=stale_date, score__lt=0.9).count()
    if stale_count:
        insights.append(
            {
                'type': 'info',
                'icon': 'clock',
                'text': f'{stale_count} concept(s) have not been reviewed in over 7 days and are not mastered yet.',
            }
        )

    progress = UserProgress.objects.filter(user=user).first()
    if progress and progress.streak_count >= 3:
        insights.append(
            {
                'type': 'success',
                'icon': 'streak',
                'text': f"{progress.streak_count} day streak - you're building a strong study habit.",
            }
        )

    return insights


def get_exam_readiness(user):
    scores = list(UserMastery.objects.filter(user=user).values_list('score', flat=True))
    if not scores:
        return {'score': 0, 'label': 'Not Started'}

    avg_score = sum(scores) / len(scores)
    score = round(avg_score * 100)
    if score >= 85:
        label = 'Exam Ready'
    elif score >= 65:
        label = 'Almost There'
    elif score >= 40:
        label = 'In Progress'
    else:
        label = 'Needs Work'
    return {'score': score, 'label': label}


def get_top_stats(user):
    streak = get_streak(user)
    mastery_qs = UserMastery.objects.filter(user=user)
    week_ago = timezone.now() - timedelta(days=7)
    weekly_quizzes = QuizAttempt.objects.filter(user=user, created_at__gte=week_ago).exclude(user_answers={}).count()
    return {
        'streak_days': streak['count'],
        'mastered_concepts': mastery_qs.filter(score__gte=0.9).count(),
        'weekly_quizzes': weekly_quizzes,
        'total_concepts': mastery_qs.count(),
    }


def get_streak(user):
    progress = UserProgress.objects.filter(user=user).first()
    if not progress:
        return {'count': 0, 'last_date': None}

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    if progress.last_completed_task_date and progress.last_completed_task_date < yesterday:
        progress.streak_count = 0
        progress.save(update_fields=['streak_count'])

    return {
        'count': progress.streak_count,
        'last_date': str(progress.last_completed_task_date) if progress.last_completed_task_date else None,
    }


def get_prep_hub_stats(user):
    plans = PrepPlan.objects.filter(user=user)
    total_plans = plans.count()
    active_focus = plans.filter(is_active_focus=True).order_by('-updated_at').first()
    if not active_focus:
        active_focus = plans.filter(status='active').order_by('-updated_at').first()
    if not active_focus:
        return {
            'total_plans': total_plans,
            'active_topic': None,
            'completion_percent': 0,
            'saved_resources': 0,
            'next_best_action': None,
        }

    progress = active_focus.progress_payload or {}
    total_tasks = progress.get('total_task_count', 0)
    completed_tasks = len(progress.get('completed_task_ids', []))
    completion_percent = round((completed_tasks / total_tasks) * 100) if total_tasks else 0
    current_phase_index = progress.get('current_phase_index', 0)
    phases = (active_focus.result_payload or {}).get('phases') or []
    active_phase = phases[current_phase_index] if current_phase_index < len(phases) else None
    next_best_action = None
    if active_phase:
        next_best_action = f"Continue phase: {active_phase.get('title', f'Phase {current_phase_index + 1}')}"
    elif completion_percent >= 100:
        next_best_action = "Plan completed. Generate a new prep mission."
    else:
        next_best_action = "Resume your prep roadmap."

    return {
        'total_plans': total_plans,
        'active_topic': active_focus.topic,
        'completion_percent': completion_percent,
        'saved_resources': len(progress.get('saved_resource_urls', [])),
        'next_best_action': next_best_action,
    }


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                'quiz_trend': get_quiz_trend(user),
                'weak_concepts': get_weak_concepts(user),
                'mastery_distribution': get_mastery_distribution(user),
                'activity_heatmap': get_activity_heatmap(user),
                'insights': get_ai_insights(user),
                'exam_readiness': get_exam_readiness(user),
                'streak': get_streak(user),
                'top_stats': get_top_stats(user),
                'prep_hub': get_prep_hub_stats(user),
            }
        )

