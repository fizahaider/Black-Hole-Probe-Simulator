from rest_framework import serializers
from .models import PrepPlan


class PrepPlanGenerateSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=255)
    goal = serializers.ChoiceField(choices=[choice[0] for choice in PrepPlan.GOAL_CHOICES])
    level = serializers.ChoiceField(choices=[choice[0] for choice in PrepPlan.LEVEL_CHOICES])
    duration_days = serializers.IntegerField(min_value=3, max_value=180)
    hours_per_day = serializers.FloatField(min_value=0.5, max_value=12)
    preferred_format = serializers.ChoiceField(choices=[choice[0] for choice in PrepPlan.FORMAT_CHOICES])
    use_web_search = serializers.BooleanField(required=False, default=False)


class PrepPlanRenameSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=255)


class PrepPlanRegenerateSerializer(serializers.Serializer):
    use_web_search = serializers.BooleanField(required=False, default=False)


class PrepPlanSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()

    class Meta:
        model = PrepPlan
        fields = [
            'id',
            'topic',
            'goal',
            'level',
            'duration_days',
            'hours_per_day',
            'preferred_format',
            'status',
            'is_active_focus',
            'result_payload',
            'progress_payload',
            'progress',
            'generated_with_web_search',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'result_payload', 'generated_with_web_search', 'created_at', 'updated_at']

    def get_progress(self, obj):
        payload = obj.progress_payload or {}
        completed = payload.get('completed_task_ids', [])
        completed_count = len(completed)
        total = payload.get('total_task_count', 0)
        pct = round((completed_count / total) * 100) if total else 0
        return {
            'completed_tasks': completed_count,
            'total_tasks': total,
            'completion_percent': pct,
            'current_phase_index': payload.get('current_phase_index', 0),
        }


class PrepPlanSummarySerializer(serializers.ModelSerializer):
    overview = serializers.SerializerMethodField()
    completion_percent = serializers.SerializerMethodField()

    class Meta:
        model = PrepPlan
        fields = [
            'id',
            'topic',
            'goal',
            'level',
            'duration_days',
            'hours_per_day',
            'preferred_format',
            'status',
            'is_active_focus',
            'completion_percent',
            'overview',
            'updated_at',
        ]

    def get_overview(self, obj):
        return (obj.result_payload or {}).get('overview', '')

    def get_completion_percent(self, obj):
        payload = obj.progress_payload or {}
        total = payload.get('total_task_count', 0)
        completed_count = len(payload.get('completed_task_ids', []))
        return round((completed_count / total) * 100) if total else 0


class PrepTaskToggleSerializer(serializers.Serializer):
    phase_index = serializers.IntegerField(min_value=0)
    task_index = serializers.IntegerField(min_value=0)
    completed = serializers.BooleanField(required=False, default=True)


class PrepPhaseStartSerializer(serializers.Serializer):
    phase_index = serializers.IntegerField(min_value=0)

