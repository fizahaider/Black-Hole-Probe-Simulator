from rest_framework import serializers
from rag.models import Conversation, ChatMessage, ConversationParticipant, ConversationInvite, MessageAttachment, ParticipantRole, InviteStatus
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.urls.exceptions import NoReverseMatch

User = get_user_model()

class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    user_name = serializers.ReadOnlyField(source='user.name')
    
    class Meta:
        model = ConversationParticipant
        fields = ['id', 'user', 'user_email', 'user_name', 'role', 'joined_at']

class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'user', 'document', 'title', 'personality', 'is_group', 'metadata', 'created_at', 'updated_at', 'participants']

class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'personality', 'is_group', 'metadata']
        read_only_fields = ['id']

class ParticipantAddSerializer(serializers.Serializer):
    user_email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ParticipantRole.choices, default=ParticipantRole.MEMBER)

class InviteCreateSerializer(serializers.Serializer):
    invitee_email = serializers.EmailField()

class InviteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationInvite
        fields = ['status']
    
    def validate_status(self, value):
        if value not in [InviteStatus.ACCEPTED, InviteStatus.REJECTED]:
            raise serializers.ValidationError("Can only accept or reject an invite.")
        return value

class MessageCreateSerializer(serializers.ModelSerializer):
    attachment_document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = ChatMessage
        fields = ['conversation', 'content', 'message_type', 'metadata', 'attachment_document_ids']

    def create(self, validated_data):
        validated_data.pop('attachment_document_ids', None)
        return super().create(validated_data)

class MessageAttachmentSerializer(serializers.ModelSerializer):
    document_title = serializers.ReadOnlyField(source='document.title')
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'document', 'document_title', 'uploader', 'mime_type', 'file_size', 'created_at', 'download_url']

    def get_download_url(self, obj):
        request = self.context.get('request')
        try:
            path = reverse('chat-attachment-download', kwargs={'pk': obj.id})
        except NoReverseMatch:
            return None
        if request:
            return request.build_absolute_uri(path)
        return path

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source='sender.email')
    sender_name = serializers.ReadOnlyField(source='sender.name')
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'role', 'content', 
            'sender', 'sender_email', 'sender_name', 
            'message_type', 'edited_at', 'metadata', 
            'created_at', 'attachments'
        ]

class ConversationInviteSerializer(serializers.ModelSerializer):
    inviter_email = serializers.ReadOnlyField(source='inviter.email')
    
    class Meta:
        model = ConversationInvite
        fields = ['id', 'conversation', 'inviter', 'inviter_email', 'invitee_email', 'invitee_user', 'status', 'token', 'expires_at', 'created_at']
