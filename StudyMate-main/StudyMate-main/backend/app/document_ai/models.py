from django.db import models
from django.conf import settings
import uuid

class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    space = models.ForeignKey('rag.KnowledgeSpace', on_delete=models.CASCADE, related_name='quizzes', null=True, blank=True)
    documents = models.ManyToManyField('rag.Document', related_name='quizzes')
    
    questions = models.JSONField(default=list)                           
    user_answers = models.JSONField(default=dict)                    
    score = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Quiz {self.id} - {self.score}%"

class FlashcardDeck(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='flashcard_decks')
    space = models.ForeignKey('rag.KnowledgeSpace', on_delete=models.CASCADE, related_name='flashcards', null=True, blank=True)
    documents = models.ManyToManyField('rag.Document', related_name='flashcards')
    
    cards = models.JSONField(default=list)                         
    topic = models.CharField(max_length=255, default="General")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Flashcards: {self.topic}"

class StudyPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_plans')
    space = models.ForeignKey('rag.KnowledgeSpace', on_delete=models.CASCADE, related_name='study_plans', null=True, blank=True)
    documents = models.ManyToManyField('rag.Document', related_name='study_plans')
    
    plan_content = models.JSONField(default=dict)                       
    status = models.CharField(max_length=50, default="active")                                    
    last_progress_update = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Study Plan {self.created_at.date()} - {self.status}"

class Summary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='summaries')
    space = models.ForeignKey('rag.KnowledgeSpace', on_delete=models.CASCADE, related_name='summaries', null=True, blank=True)
    documents = models.ManyToManyField('rag.Document', related_name='generated_summaries')
    
    content = models.TextField()
    summary_type = models.CharField(max_length=50, default="general")                                   
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        first_doc = self.documents.first()
        return f"Summary of {first_doc.title if first_doc else 'Multiple Documents'}"

class MindMap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mind_maps')
    space = models.ForeignKey('rag.KnowledgeSpace', on_delete=models.CASCADE, related_name='mind_maps', null=True, blank=True)
    documents = models.ManyToManyField('rag.Document', related_name='mind_maps')
    
    content = models.JSONField(default=dict)                         
    title = models.CharField(max_length=255, default="Main Topic")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Mind Map: {self.title}"
