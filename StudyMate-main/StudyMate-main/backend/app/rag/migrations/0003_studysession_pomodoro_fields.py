from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rag", "0002_studysession"),
    ]

    operations = [
        migrations.AddField(
            model_name="studysession",
            name="current_cycle",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="studysession",
            name="is_break",
            field=models.BooleanField(default=False),
        ),
    ]
