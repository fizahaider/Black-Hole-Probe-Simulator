from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('prep_hub', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='prepplan',
            name='is_active_focus',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='prepplan',
            name='progress_payload',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='prepplan',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('active', 'Active'), ('completed', 'Completed'), ('archived', 'Archived')], default='active', max_length=16),
        ),
    ]

