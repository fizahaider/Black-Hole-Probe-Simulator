from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PrepPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('topic', models.CharField(max_length=255)),
                ('goal', models.CharField(choices=[('interview', 'Interview Preparation'), ('exam', 'Exam Preparation'), ('placement', 'Placement Readiness'), ('skill_building', 'Skill Building'), ('project', 'Project Oriented')], max_length=32)),
                ('level', models.CharField(choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')], max_length=32)),
                ('duration_days', models.PositiveIntegerField()),
                ('hours_per_day', models.FloatField()),
                ('preferred_format', models.CharField(choices=[('mixed', 'Mixed'), ('video', 'Video'), ('article', 'Articles'), ('practice', 'Practice'), ('repo', 'Repositories')], default='mixed', max_length=32)),
                ('result_payload', models.JSONField(default=dict)),
                ('generated_with_web_search', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prep_plans', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),
        migrations.AddIndex(
            model_name='prepplan',
            index=models.Index(fields=['user', '-updated_at'], name='prep_hub_pr_user_id_18c6a2_idx'),
        ),
        migrations.AddIndex(
            model_name='prepplan',
            index=models.Index(fields=['topic'], name='prep_hub_pr_topic_0afaf1_idx'),
        ),
    ]

