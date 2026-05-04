from django.db import models
from django.conf import settings
import uuid

class KnowledgeSpace(models.Model):
    DIFFICULTY_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='knowledge_spaces')
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    goal = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='Intermediate')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.subject})"

class Concept(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(KnowledgeSpace, on_delete=models.CASCADE, related_name='concepts')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dependencies = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='required_by')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Space: {self.space.name})"

class MasteryLevel(models.Model):
    MASTERY_CHOICES = [
        ('Weak', 'Weak'),
        ('Moderate', 'Moderate'),
        ('Strong', 'Strong'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name='mastery_levels')
    level = models.CharField(max_length=15, choices=MASTERY_CHOICES, default='Weak')
    last_assessed = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'concept')

    def __str__(self):
        return f"{self.concept.name}: {self.level}"
