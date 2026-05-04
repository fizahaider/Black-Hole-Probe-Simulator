import uuid
from django.conf import settings
from django.db import models


class PrepPlan(models.Model):
    GOAL_CHOICES = [
        ('interview', 'Interview Preparation'),
        ('exam', 'Exam Preparation'),
        ('placement', 'Placement Readiness'),
        ('skill_building', 'Skill Building'),
        ('project', 'Project Oriented'),
    ]
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    FORMAT_CHOICES = [
        ('mixed', 'Mixed'),
        ('video', 'Video'),
        ('article', 'Articles'),
        ('practice', 'Practice'),
        ('repo', 'Repositories'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='prep_plans')
    topic = models.CharField(max_length=255)
    goal = models.CharField(max_length=32, choices=GOAL_CHOICES)
    level = models.CharField(max_length=32, choices=LEVEL_CHOICES)
    duration_days = models.PositiveIntegerField()
    hours_per_day = models.FloatField()
    preferred_format = models.CharField(max_length=32, choices=FORMAT_CHOICES, default='mixed')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active')
    is_active_focus = models.BooleanField(default=False)

    result_payload = models.JSONField(default=dict)
    progress_payload = models.JSONField(default=dict)
    generated_with_web_search = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['topic']),
        ]

    def __str__(self):
        return f"{self.topic} ({self.user.email})"

