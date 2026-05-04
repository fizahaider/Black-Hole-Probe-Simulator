                                               

import django.db.models.deletion
import django.utils.timezone
import rag.models
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Concept',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('heading', 'Heading/Section'), ('core_concept', 'Core Concept'), ('paired_concept', 'Paired/Comparative Concept'), ('example', 'Example/Application')], default='core_concept', max_length=50)),
                ('name', models.CharField(max_length=255)),
                ('anchor_chunks', models.JSONField(default=list, help_text='List of chunk IDs or indices that act as anchors')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='rag.concept')),
            ],
        ),
        migrations.CreateModel(
            name='ConceptAsset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('summary', models.TextField(blank=True, default='')),
                ('flashcards', models.JSONField(default=list, help_text='List of flashcard objects {front, back}')),
                ('quiz_questions', models.JSONField(default=list, help_text='List of quiz objects {question, options, answer}')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('concept', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='asset', to='rag.concept')),
            ],
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('file', models.FileField(upload_to='rag_uploads/')),
                ('file_type', models.CharField(default='pdf', max_length=50)),
                ('text_content', models.TextField(blank=True, default='')),
                ('essence', models.TextField(blank=True, default='', help_text='High-level 200-word context summary (Document DNA)')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('uploaded_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('processed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rag_documents', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default='New Conversation', max_length=255)),
                ('personality', models.CharField(default='neutral', max_length=50)),
                ('is_group', models.BooleanField(default=False)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations', to=settings.AUTH_USER_MODEL)),
                ('document', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='conversations', to='rag.document')),
                ('sources', models.ManyToManyField(blank=True, related_name='mentioned_in_conversations', to='rag.document')),
            ],
        ),
        migrations.AddField(
            model_name='concept',
            name='document',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='concepts', to='rag.document'),
        ),
        migrations.CreateModel(
            name='DocumentChunk',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('chunk_index', models.IntegerField()),
                ('text', models.TextField()),
                ('embedding', models.BinaryField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chunks', to='rag.document')),
            ],
            options={
                'ordering': ['chunk_index'],
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('user', 'User'), ('assistant', 'Assistant'), ('system', 'System')], max_length=10)),
                ('content', models.TextField()),
                ('message_type', models.CharField(choices=[('text', 'Text'), ('file', 'File'), ('system', 'System'), ('ai', 'AI')], default='text', max_length=20)),
                ('edited_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sender', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='rag.conversation')),
                ('sources', models.ManyToManyField(blank=True, related_name='message_mentions', to='rag.documentchunk')),
            ],
        ),
        migrations.CreateModel(
            name='KnowledgeSpace',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='knowledge_spaces', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='document',
            name='space',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='rag.knowledgespace'),
        ),
        migrations.AddField(
            model_name='conversation',
            name='space',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='conversations', to='rag.knowledgespace'),
        ),
        migrations.CreateModel(
            name='MessageAttachment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('mime_type', models.CharField(max_length=100)),
                ('file_size', models.PositiveIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='message_attachments', to='rag.document')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='rag.chatmessage')),
                ('uploader', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='UserMastery',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('score', models.FloatField(default=0.0, help_text='Mastery score from 0 to 1')),
                ('attempts', models.IntegerField(default=0)),
                ('last_attempt', models.DateTimeField(auto_now=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('concept', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_mastery', to='rag.concept')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mastery_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'User masteries',
            },
        ),
        migrations.CreateModel(
            name='VectorIndex',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('index_path', models.CharField(max_length=255)),
                ('document_count', models.IntegerField(default=0)),
                ('chunk_count', models.IntegerField(default=0)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('space', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='vector_indices', to='rag.knowledgespace')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ConversationInvite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('invitee_email', models.EmailField(max_length=254)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('expired', 'Expired')], default='pending', max_length=20)),
                ('token', models.CharField(default=rag.models.generate_invite_token, max_length=64, unique=True)),
                ('expires_at', models.DateTimeField(default=rag.models.default_expiry)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invites', to='rag.conversation')),
                ('invitee_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_invites', to=settings.AUTH_USER_MODEL)),
                ('inviter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_invites', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['invitee_email', 'status'], name='rag_convers_invitee_1f6f74_idx'), models.Index(fields=['token'], name='rag_convers_token_0ba702_idx')],
            },
        ),
        migrations.CreateModel(
            name='ConversationParticipant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('admin', 'Admin'), ('member', 'Member'), ('guest', 'Guest')], default='member', max_length=20)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='rag.conversation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversation_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'conversation'], name='rag_convers_user_id_713eab_idx')],
                'constraints': [models.UniqueConstraint(fields=('conversation', 'user'), name='unique_conversation_participant')],
            },
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['conversation', 'created_at'], name='rag_chatmes_convers_7ef103_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['updated_at'], name='rag_convers_updated_18696b_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='usermastery',
            unique_together={('user', 'concept')},
        ),
    ]
