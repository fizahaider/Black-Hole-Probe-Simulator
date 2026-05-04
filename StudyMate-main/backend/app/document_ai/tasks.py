import logging

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from account.models import User
from .models import StudyPlan

logger = logging.getLogger(__name__)

@shared_task
def send_daily_study_briefing():
    users = User.objects.filter(is_active=True)
    
    for user in users:
                                
        active_plans = StudyPlan.objects.filter(user=user, status='active')
        if not active_plans.exists():
            continue
            
        tasks_for_today = []
        for plan in active_plans:
            space_name = plan.space.name if plan.space else "General"
            tasks_for_today.append(f"Continue your '{space_name}' mastery plan.")

        if tasks_for_today:
            import datetime
            streak = getattr(user, 'progress', None)
            streak_count = streak.streak_count if streak else 0
            
            is_expiring_today = False
            if streak and streak_count > 0:
                is_expiring_today = streak.last_completed_task_date != datetime.date.today()
                
            context = {
                'name': user.name,
                'streak': streak_count,
                'is_expiring_today': is_expiring_today,
                'tasks': tasks_for_today,
                'front_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            }
            
            html_content = render_to_string('emails/daily_briefing.html', context)
            
            try:
                send_mail(
                    subject='Your Daily StudyMate Briefing 📅',
                    message='Please view this email in an HTML compatible client.',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@studymate.com'),
                    recipient_list=[user.email],
                    html_message=html_content,
                    fail_silently=False,
                )
            except Exception:
                logger.exception(
                    'send_daily_study_briefing: failed to email user_id=%s email=%s',
                    user.pk,
                    user.email,
                )
