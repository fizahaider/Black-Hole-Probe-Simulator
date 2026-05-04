from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule

class Command(BaseCommand):
    help = 'Setup Celery Beat schedule for StudyMate daily briefing emails'

    def handle(self, *args, **kwargs):
                                              
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour='8',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
            timezone='UTC'
        )

        task_name = 'Send Daily Study Briefing Emails'
        
        task, created = PeriodicTask.objects.get_or_create(
            name=task_name,
            defaults={
                'crontab': schedule,
                'task': 'document_ai.tasks.send_daily_study_briefing',
            }
        )

        if not created:
            task.crontab = schedule
            task.task = 'document_ai.tasks.send_daily_study_briefing'
            task.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully updated periodic task: "{task_name}"'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully created periodic task: "{task_name}"'))
