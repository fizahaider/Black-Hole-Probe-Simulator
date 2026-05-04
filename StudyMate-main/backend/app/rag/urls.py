from django.urls import path
from .views import (
    RAGChatView,
    DocumentUploadView,
    DocumentListView,
    DocumentDeleteView,
    ConversationHistoryView,
    RebuildIndexView,
    KnowledgeSpaceListCreateView,
    KnowledgeSpaceDetailView,
)

app_name = 'rag'

urlpatterns = [
    path('chat/', RAGChatView.as_view(), name='rag_chat'),
    path('documents/upload/', DocumentUploadView.as_view(), name='rag_document_upload'),
    path('documents/', DocumentListView.as_view(), name='rag_document_list'),
    path('documents/<uuid:document_id>/', DocumentDeleteView.as_view(), name='rag_document_delete'),
    path('chat/history/', ConversationHistoryView.as_view(), name='rag_chat_history'),
    path('rebuild-index/', RebuildIndexView.as_view(), name='rag_rebuild_index'),
    path('knowledge-spaces/', KnowledgeSpaceListCreateView.as_view(), name='knowledge_space_list_create'),
    path('knowledge-spaces/<uuid:pk>/', KnowledgeSpaceDetailView.as_view(), name='knowledge_space_detail'),
]

