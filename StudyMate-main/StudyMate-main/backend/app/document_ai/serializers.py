from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import QuizAttempt, FlashcardDeck, StudyPlan, Summary, MindMap


class TextToSpeechSerializer(serializers.Serializer):
    text = serializers.CharField()
    voice_id = serializers.CharField(required=False)

class SpeechToTextSerializer(serializers.Serializer):
    audio = serializers.FileField()


class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    space_id = serializers.UUIDField(required=False, allow_null=True)

class DocumentUploadResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    message = serializers.CharField()
    text = serializers.CharField()
    page_count = serializers.IntegerField()

class DocumentChatSerializer(serializers.Serializer):
    document_id = serializers.UUIDField(required=False, allow_null=True)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False
    )
    question = serializers.CharField()
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    personality = serializers.ChoiceField(
        choices=["neutral", "academic", "companion", "humorous", "therapeutic"],
        default="neutral",
        required=False
    )
    depth = serializers.ChoiceField(
        choices=["concise", "detailed", "step-by-step"],
        default="detailed",
        required=False
    )
    stream = serializers.BooleanField(default=False, required=False)

class DocumentChatResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()

class DocumentSummarySerializer(serializers.Serializer):
    document_id = serializers.UUIDField(required=False)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False
    )
    space_id = serializers.UUIDField(required=False)

    summary_length = serializers.ChoiceField(
        choices=["short", "medium", "detailed"], 
        required=False, 
        default="medium"
    )
    tone = serializers.ChoiceField(
        choices=["neutral", "academic", "professional", "simple", "friendly", "technical"], 
        required=False, 
        default="neutral"
    )
    purpose = serializers.ChoiceField(
        choices=["study_notes", "presentation", "executive_overview", "revision", "non_technical"], 
        required=False, 
        default="revision"
    )
    emphasis = serializers.ChoiceField(
        choices=["key_points", "definitions", "results", "steps", "pros_cons"], 
        required=False, 
        default="key_points"
    )
    structure = serializers.ChoiceField(
        choices=["paragraph", "bullet_points", "numbered"], 
        required=False, 
        default="paragraph"
    )

class DocumentSummaryResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    space_id = serializers.UUIDField(required=False, allow_null=True)
    summary = serializers.CharField()

class FlashcardSerializer(serializers.Serializer):
    front = serializers.CharField()
    back = serializers.CharField()

class DocumentFlashcardsResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    space_id = serializers.UUIDField(required=False, allow_null=True)
    flashcards = FlashcardSerializer(many=True)

class DocumentQuizRequestSerializer(serializers.Serializer):
    document_id = serializers.UUIDField(required=False)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False
    )
    space_id = serializers.UUIDField(required=False)
    num_questions = serializers.IntegerField(min_value=1, max_value=50, default=5)
    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard", "mixed"], 
        default="mixed"
    )
    include_hints = serializers.BooleanField(default=False)
    conceptual_focus = serializers.BooleanField(default=False)

class QuizQuestionSerializer(serializers.Serializer):
    question = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())
    correct_answer = serializers.CharField()
    hint = serializers.CharField(required=False, allow_null=True)
    source_reference = serializers.CharField(required=False, allow_null=True)

class DocumentQuizResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    space_id = serializers.UUIDField(required=False, allow_null=True)
    questions = QuizQuestionSerializer(many=True)

class StudyPlannerRequestSerializer(serializers.Serializer):
    time_per_day = serializers.IntegerField(min_value=1, help_text="Hours per day")
    total_days = serializers.IntegerField(min_value=1, max_value=180, required=False, default=7, help_text="Total days for the study plan")
    skill_level = serializers.ChoiceField(choices=["beginner", "intermediate", "advanced"])
    focus = serializers.ListField(
        child=serializers.ChoiceField(choices=["read", "quiz", "flashcards", "review"]),
        min_length=1
    )
    learning_style = serializers.ChoiceField(
        choices=["textual", "visual", "interactive"], 
        required=False, 
        default="interactive"
    )
    revision_strategy = serializers.ChoiceField(
        choices=["spaced_repetition", "review-heavy", "mixed"], 
        required=False, 
        default="mixed"
    )

class StudyPlanTaskSerializer(serializers.Serializer):
    day = serializers.IntegerField()
    task = serializers.CharField()
    task_type = serializers.ChoiceField(choices=["read", "quiz", "flashcards", "review"])
    estimated_time = serializers.IntegerField(help_text="Minutes")
    references = serializers.ListField(child=serializers.CharField(), required=False)

class StudyPlannerResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    space_id = serializers.UUIDField(required=False, allow_null=True)
    schedule = StudyPlanTaskSerializer(many=True)
    total_days = serializers.IntegerField(required=False)

class QuizAttemptSerializer(serializers.ModelSerializer):
    space_id = serializers.UUIDField(read_only=True, allow_null=True)
    document_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizAttempt
        fields = ['id', 'space_id', 'document_ids', 'questions', 'user_answers', 'score', 'created_at']
        read_only_fields = ['id', 'created_at', 'space_id', 'document_ids']
    
    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_document_ids(self, obj):
        return [str(doc.id) for doc in obj.documents.all()]

class FlashcardDeckSerializer(serializers.ModelSerializer):
    space_id = serializers.UUIDField(read_only=True, allow_null=True)
    document_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = FlashcardDeck
        fields = ['id', 'space_id', 'document_ids', 'cards', 'topic', 'created_at']
        read_only_fields = ['id', 'created_at', 'space_id', 'document_ids']
    
    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_document_ids(self, obj):
        return [str(doc.id) for doc in obj.documents.all()]

class StudyPlanSerializer(serializers.ModelSerializer):
    space_id = serializers.UUIDField(read_only=True, allow_null=True)
    document_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = StudyPlan
        fields = ['id', 'space_id', 'document_ids', 'plan_content', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'space_id', 'document_ids']
    
    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_document_ids(self, obj):
        return [str(doc.id) for doc in obj.documents.all()]

class SummaryModelSerializer(serializers.ModelSerializer):
    space_id = serializers.UUIDField(read_only=True, allow_null=True)
    document_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = Summary
        fields = ['id', 'space_id', 'document_ids', 'content', 'summary_type', 'created_at']
        read_only_fields = ['id', 'created_at', 'space_id', 'document_ids']
    
    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_document_ids(self, obj):
        return [str(doc.id) for doc in obj.documents.all()]

class MindMapRequestSerializer(serializers.Serializer):
    document_id = serializers.UUIDField(required=False)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False
    )
    space_id = serializers.UUIDField(required=False)

class MindMapResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    space_id = serializers.UUIDField(required=False, allow_null=True)
    mind_map = serializers.JSONField()

class MindMapModelSerializer(serializers.ModelSerializer):
    space_id = serializers.UUIDField(read_only=True, allow_null=True)
    document_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = MindMap
        fields = ['id', 'space_id', 'document_ids', 'content', 'title', 'created_at']
        read_only_fields = ['id', 'created_at', 'space_id', 'document_ids']
    
    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_document_ids(self, obj):
        return [str(doc.id) for doc in obj.documents.all()]
