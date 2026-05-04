from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import secrets
from datetime import timedelta

class KnowledgeSpace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='knowledge_spaces')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.email})"

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rag_documents')
    space = models.ForeignKey(KnowledgeSpace, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='rag_uploads/')
    file_type = models.CharField(max_length=50, default='pdf')
    text_content = models.TextField(blank=True, default='')
    essence = models.TextField(blank=True, default='', help_text="High-level 200-word context summary (Document DNA)")
    metadata = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(default=timezone.now)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.id})"

class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    text = models.TextField()
    embedding = models.BinaryField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['chunk_index']

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title}"

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    space = models.ForeignKey(KnowledgeSpace, on_delete=models.SET_NULL, related_name='conversations', null=True, blank=True)
    sources = models.ManyToManyField('Document', related_name='mentioned_in_conversations', blank=True)
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, related_name='conversations', null=True, blank=True)
    title = models.CharField(max_length=255, default="New Conversation")
    personality = models.CharField(max_length=50, default="neutral")
    is_group = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['updated_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.personality})"

class MessageType(models.TextChoices):
    TEXT = 'text', 'Text'
    FILE = 'file', 'File'
    SYSTEM = 'system', 'System'
    AI = 'ai', 'AI'

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    sources = models.ManyToManyField(DocumentChunk, related_name='message_mentions', blank=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.TEXT)
    edited_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."

class ParticipantRole(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    MEMBER = 'member', 'Member'
    GUEST = 'guest', 'Guest'

class ConversationParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversation_participations')
    role = models.CharField(max_length=20, choices=ParticipantRole.choices, default=ParticipantRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['conversation', 'user'], name='unique_conversation_participant')
        ]
        indexes = [
            models.Index(fields=['user', 'conversation']),
        ]

    def __str__(self):
        return f"{self.user.email} in {self.conversation.id}"

class InviteStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'

def generate_invite_token():
    return secrets.token_urlsafe(32)

def default_expiry():
    return timezone.now() + timedelta(days=7)

class ConversationInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='invites')
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invites')
    invitee_email = models.EmailField()
    invitee_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_invites')
    status = models.CharField(max_length=20, choices=InviteStatus.choices, default=InviteStatus.PENDING)
    token = models.CharField(max_length=64, unique=True, default=generate_invite_token)
    expires_at = models.DateTimeField(default=default_expiry)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['invitee_email', 'status']),
            models.Index(fields=['token']),
        ]

    def __str__(self):
        return f"Invite to {self.invitee_email} for {self.conversation.id}"

class MessageAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='attachments')
    document = models.ForeignKey('Document', on_delete=models.CASCADE, related_name='message_attachments')
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    mime_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for Message {self.message.id}"

class VectorIndex(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    space = models.ForeignKey(KnowledgeSpace, on_delete=models.CASCADE, related_name='vector_indices', null=True, blank=True)
    index_path = models.CharField(max_length=255)
    document_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Concept(models.Model):
    CONCEPT_TYPES = [
        ('heading', 'Heading/Section'),
        ('core_concept', 'Core Concept'),
        ('paired_concept', 'Paired/Comparative Concept'),
        ('example', 'Example/Application'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='concepts')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    type = models.CharField(max_length=50, choices=CONCEPT_TYPES, default='core_concept')
    name = models.CharField(max_length=255)
                                                      
    anchor_chunks = models.JSONField(default=list, help_text="List of chunk IDs or indices that act as anchors")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.document.title})"

class ConceptAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    concept = models.OneToOneField(Concept, on_delete=models.CASCADE, related_name='asset')
    summary = models.TextField(blank=True, default='')
    flashcards = models.JSONField(default=list, help_text="List of flashcard objects {front, back}")
    quiz_questions = models.JSONField(default=list, help_text="List of quiz objects {question, options, answer}")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Assets for {self.concept.name}"

class UserMastery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mastery_records')
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name='user_mastery')
    score = models.FloatField(default=0.0, help_text="Mastery score from 0 to 1")
    attempts = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('user', 'concept')
        verbose_name_plural = "User masteries"

    def __str__(self):
        return f"{self.user.email} Mastery: {self.concept.name} ({self.score})"


class StudySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='study_sessions')
    leader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_paused = models.BooleanField(default=False)
    paused_at = models.DateTimeField(null=True, blank=True)
    total_paused_duration = models.IntegerField(default=0)              
    current_phase = models.CharField(max_length=20, default='focus')                    
    cycle = models.PositiveSmallIntegerField(default=1)
    duration = models.IntegerField(default=1500)              
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session in {self.conversation.id} (Active: {self.is_active})"
