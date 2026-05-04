from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Document, Conversation, ChatMessage, VectorIndex, KnowledgeSpace, DocumentChunk

class KnowledgeSpaceSerializer(serializers.ModelSerializer):
    """Serializer for KnowledgeSpace"""
    document_count = serializers.IntegerField(source='documents.count', read_only=True)
    
    class Meta:
        model = KnowledgeSpace
        fields = ['id', 'name', 'description', 'document_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'document_count']

class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""
    space_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = ['id', 'space_id', 'title', 'file_type', 'uploaded_at', 'processed', 'metadata']
        read_only_fields = ['id', 'uploaded_at', 'processed', 'space_id']
        
    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_space_id(self, obj):
        return str(obj.space.id) if obj.space else None

class DocumentChunkSerializer(serializers.ModelSerializer):
    """Serializer for DocumentChunk"""
    document_title = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentChunk
        fields = ['id', 'text', 'document', 'document_title', 'metadata']
        read_only_fields = ['id', 'document', 'document_title']

    @extend_schema_field(serializers.CharField())
    def get_document_title(self, obj):
        try:
            return obj.document.title
        except:
            return "Unknown Document"

class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for ChatMessage"""
    sources = DocumentChunkSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'sources', 'created_at', 'metadata']
        read_only_fields = ['id', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation"""
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    space_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'space_id', 'created_at', 'updated_at', 'messages', 'message_count', 'personality']
        read_only_fields = ['id', 'created_at', 'updated_at', 'space_id']

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_space_id(self, obj):
        return str(obj.space.id) if obj.space else None

class ChatRequestSerializer(serializers.Serializer):
    """Request serializer for chat endpoint"""
    message = serializers.CharField(required=True, max_length=2000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    space_id = serializers.UUIDField(required=False, allow_null=True)
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

class ChatSourceSerializer(serializers.Serializer):
    """Serializer for source references in chat answers"""
    chunk_id = serializers.UUIDField()
    text_preview = serializers.CharField()
    section = serializers.CharField(required=False, allow_null=True)
    page = serializers.IntegerField(required=False, allow_null=True)
    confidence = serializers.FloatField(required=False, allow_null=True)

class ChatResponseSerializer(serializers.Serializer):
    """Response serializer for chat endpoint"""
    answer = serializers.CharField()
    conversation_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    personality = serializers.CharField()
    references = ChatSourceSerializer(many=True, required=False)
    confidence = serializers.FloatField(required=False, allow_null=True)
    metadata = serializers.JSONField(required=False)

class RAGDocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload"""
    file = serializers.FileField(required=True)
    title = serializers.CharField(required=False, max_length=255, allow_blank=True)
    space_id = serializers.UUIDField(required=False, allow_null=True)

class VectorIndexSerializer(serializers.ModelSerializer):
    """Serializer for VectorIndex"""
    class Meta:
        model = VectorIndex
        fields = ['id', 'index_path', 'document_count', 'chunk_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
