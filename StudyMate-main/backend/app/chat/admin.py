from django.contrib import admin
from rag.models import Conversation, ChatMessage, ConversationParticipant, ConversationInvite, MessageAttachment

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'space', 'is_group', 'personality', 'updated_at')
    list_filter = ('is_group', 'personality', 'created_at', 'updated_at')
    search_fields = ('title', 'user__email', 'user__name', 'space__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space', 'document')
    filter_horizontal = ('sources',)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'role', 'sender', 'message_type', 'created_at', 'edited_at')
    list_filter = ('role', 'message_type', 'created_at')
    search_fields = ('content', 'sender__email', 'conversation__title')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at')
    autocomplete_fields = ('conversation', 'sender')
    filter_horizontal = ('sources',)

@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'user', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('user__email', 'conversation__title')
    ordering = ('-joined_at',)
    readonly_fields = ('id', 'joined_at')
    autocomplete_fields = ('conversation', 'user')

@admin.register(ConversationInvite)
class ConversationInviteAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'inviter', 'invitee_email', 'status', 'expires_at', 'created_at')
    list_filter = ('status', 'expires_at', 'created_at')
    search_fields = ('invitee_email', 'inviter__email', 'conversation__title')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'token', 'created_at')
    autocomplete_fields = ('conversation', 'inviter', 'invitee_user')

@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('message', 'document', 'uploader', 'mime_type', 'file_size', 'created_at')
    list_filter = ('created_at', 'mime_type')
    search_fields = ('uploader__email', 'document__title')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at')
    autocomplete_fields = ('message', 'document', 'uploader')
