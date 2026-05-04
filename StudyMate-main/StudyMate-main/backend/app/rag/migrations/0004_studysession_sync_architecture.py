from django.db import migrations, models
from datetime import timedelta
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('rag', '0003_studysession_pomodoro_fields'),
    ]

    operations = [
        migrations.RenameField(
            model_name='studysession',
            old_name='started_by',
            new_name='leader',
        ),
        migrations.RenameField(
            model_name='studysession',
            old_name='start_time',
            new_name='started_at',
        ),
        migrations.RemoveField(
            model_name='studysession',
            name='is_break',
        ),
        migrations.AddField(
            model_name='studysession',
            name='current_phase',
            field=models.CharField(default='focus', max_length=20),
        ),
        migrations.RenameField(
            model_name='studysession',
            old_name='current_cycle',
            new_name='cycle',
        ),
        migrations.AddField(
            model_name='studysession',
            name='duration',
            field=models.IntegerField(default=1500),
        ),
        migrations.RemoveField(
            model_name='studysession',
            name='total_paused_duration',
        ),
        migrations.AddField(
            model_name='studysession',
            name='total_paused_duration',
            field=models.IntegerField(default=0),
        ),
    ]
