from django.contrib import admin
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from account.models import (
    User,
    Contact,
    Newsletter,
    Notification,
    LearningProfile,
    UserProgress,
)


class UserAdmin(BaseUserAdmin):
    list_filter = ['is_active', 'is_staff']
    list_display = ['name', 'email', 'is_staff', 'created_at']

    ordering = ['id', 'name']
    search_fields = ['email', 'name']
    readonly_fields = ['last_login', 'created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        (_('Personal Information'), {
            'fields': ('name', 'image')
        }),
        (_('Permissions'), {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'user_permissions'
            )
        }),
        (_('Important Dates'), {
            'fields': ('last_login', 'created_at', 'updated_at')
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2', 'name', 'image',
                'is_active', 'is_staff', 'is_superuser',
            ),
        }),
    )

    list_per_page = 25
    filter_horizontal = ('groups', 'user_permissions')


class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'submitted_at')
    list_filter = ('submitted_at',)
    search_fields = ('name', 'email', 'subject')
    ordering = ('-submitted_at',)
    readonly_fields = [field.name for field in Contact._meta.fields]

class NewsletterAdmin(admin.ModelAdmin):
    list_display = ('email', 'subscribed_at')
    search_fields = ('email',)
    ordering = ('-subscribed_at',)
    readonly_fields = [field.name for field in Newsletter._meta.fields]


class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'kind', 'read_at', 'created_at')
    list_filter = ('kind', 'read_at')
    search_fields = ('title', 'body', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ['id', 'created_at']
    autocomplete_fields = ('user',)


class LearningProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'default_personality',
        'default_depth',
        'learning_style',
        'skill_level',
        'revision_strategy',
        'updated_at',
    )
    list_filter = (
        'default_personality',
        'default_depth',
        'learning_style',
        'skill_level',
        'revision_strategy',
        'updated_at',
    )
    search_fields = ('user__email', 'user__name')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('user',)


class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'streak_count', 'last_completed_task_date', 'created_at')
    list_filter = ('last_completed_task_date', 'created_at')
    search_fields = ('user__email', 'user__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    autocomplete_fields = ('user',)


admin.site.register(User, UserAdmin)
admin.site.register(Contact, ContactAdmin)
admin.site.register(Newsletter, NewsletterAdmin)
admin.site.register(Notification, NotificationAdmin)
admin.site.register(LearningProfile, LearningProfileAdmin)
admin.site.register(UserProgress, UserProgressAdmin)
admin.site.unregister(Group)