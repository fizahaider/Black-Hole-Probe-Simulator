from django.contrib import admin
from .models import QuizAttempt, FlashcardDeck, StudyPlan, Summary, MindMap


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'space', 'score', 'question_count', 'created_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__email', 'user__name', 'space__name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')
    filter_horizontal = ('documents',)

    @admin.display(description='Questions')
    def question_count(self, obj):
        return len(obj.questions or [])


@admin.register(FlashcardDeck)
class FlashcardDeckAdmin(admin.ModelAdmin):
    list_display = ('topic', 'user', 'space', 'card_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('topic', 'user__email', 'space__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')
    filter_horizontal = ('documents',)

    @admin.display(description='Cards')
    def card_count(self, obj):
        return len(obj.cards or [])


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'space', 'status', 'created_at', 'last_progress_update')
    list_filter = ('status', 'created_at', 'updated_at', 'last_progress_update')
    search_fields = ('user__email', 'user__name', 'space__name')
    ordering = ('-last_progress_update',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_progress_update')
    autocomplete_fields = ('user', 'space')
    filter_horizontal = ('documents',)


@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'space', 'summary_type', 'created_at', 'updated_at')
    list_filter = ('summary_type', 'created_at', 'updated_at')
    search_fields = ('user__email', 'space__name', 'content')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')
    filter_horizontal = ('documents',)


@admin.register(MindMap)
class MindMapAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'space', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('title', 'user__email', 'space__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user', 'space')
    filter_horizontal = ('documents',)
