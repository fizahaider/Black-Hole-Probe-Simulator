from django.contrib import admin
from .models import PrepPlan


@admin.register(PrepPlan)
class PrepPlanAdmin(admin.ModelAdmin):
    list_display = (
        'topic',
        'user',
        'goal',
        'level',
        'status',
        'is_active_focus',
        'duration_days',
        'hours_per_day',
        'preferred_format',
        'updated_at',
    )
    list_filter = ('goal', 'level', 'status', 'is_active_focus', 'preferred_format', 'generated_with_web_search', 'created_at')
    search_fields = ('topic', 'user__email', 'user__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user',)

