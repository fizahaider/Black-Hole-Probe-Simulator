from django.contrib import admin
from .models import (
    KnowledgeSpace,
    Document,
    DocumentChunk,
    VectorIndex,
    Concept,
    ConceptAsset,
    UserMastery,
    StudySession,
)


@admin.register(KnowledgeSpace)
class KnowledgeSpaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'description', 'user__email', 'user__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user',)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'space', 'file_type', 'processed', 'uploaded_at', 'updated_at')
    list_filter = ('file_type', 'processed', 'uploaded_at', 'updated_at')
    search_fields = ('title', 'user__email', 'user__name', 'space__name')
    ordering = ('-uploaded_at',)
    readonly_fields = ('id', 'uploaded_at', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'chunk_index', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('document__title', 'document__user__email')
    ordering = ('document', 'chunk_index')
    readonly_fields = ('id', 'created_at')
    autocomplete_fields = ('document',)


@admin.register(VectorIndex)
class VectorIndexAdmin(admin.ModelAdmin):
    list_display = ('user', 'space', 'document_count', 'chunk_count', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__email', 'space__name', 'index_path')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')


@admin.register(Concept)
class ConceptAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'document', 'parent', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('name', 'document__title', 'document__user__email')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at')
    autocomplete_fields = ('document', 'parent')


@admin.register(ConceptAsset)
class ConceptAssetAdmin(admin.ModelAdmin):
    list_display = ('concept', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('concept__name', 'concept__document__title')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('concept',)


@admin.register(UserMastery)
class UserMasteryAdmin(admin.ModelAdmin):
    list_display = ('user', 'concept', 'score', 'attempts', 'last_attempt')
    list_filter = ('last_attempt', 'concept__type')
    search_fields = ('user__email', 'concept__name', 'concept__document__title')
    ordering = ('-last_attempt', '-score')
    readonly_fields = ('id', 'last_attempt')
    autocomplete_fields = ('user', 'concept')


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = (
        'conversation',
        'leader',
        'is_active',
        'is_paused',
        'current_phase',
        'cycle',
        'duration',
        'started_at',
    )
    list_filter = ('is_active', 'is_paused', 'current_phase', 'started_at')
    search_fields = (
        'leader__email',
        'conversation__title',
        'conversation__user__email',
    )
    ordering = ('-started_at',)
    readonly_fields = ('id', 'started_at', 'created_at', 'updated_at')
    autocomplete_fields = ('conversation', 'leader')
