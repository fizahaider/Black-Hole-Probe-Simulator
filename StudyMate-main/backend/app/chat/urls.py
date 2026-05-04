from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConversationViewSet,
    ChatMessageViewSet,
    ConversationParticipantViewSet,
    ConversationInviteViewSet,
    MessageAttachmentViewSet,
    DebugSessionView
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='chat-conversation')
router.register(r'messages', ChatMessageViewSet, basename='chat-message')
router.register(r'participants', ConversationParticipantViewSet, basename='chat-participant')
router.register(r'invites', ConversationInviteViewSet, basename='chat-invite')
router.register(r'attachments', MessageAttachmentViewSet, basename='chat-attachment')

urlpatterns = [
    path(
        'messages/<uuid:pk>/reactions/',
        ChatMessageViewSet.as_view({'patch': 'toggle_reaction'}),
        name='chat-message-reactions',
    ),
    path(
        'messages/<uuid:pk>/for-everyone/',
        ChatMessageViewSet.as_view({'delete': 'delete_for_everyone'}),
        name='chat-message-delete-for-everyone',
    ),
    path(
        'attachments/<uuid:pk>/download/',
        MessageAttachmentViewSet.as_view({'get': 'download'}),
        name='chat-attachment-download',
    ),
    path('debug/session-test/', DebugSessionView.as_view(), name='debug-session-test'),
    path('', include(router.urls)),
]
