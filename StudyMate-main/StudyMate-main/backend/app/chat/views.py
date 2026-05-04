from rest_framework import viewsets, permissions, status, mixins, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from account.services.notifications import create_notification
from rag.models import Conversation, ChatMessage, ConversationParticipant, ConversationInvite, MessageAttachment, ParticipantRole, InviteStatus, Document, MessageType
from uuid import UUID
from decimal import Decimal
from .serializers import (
    ConversationSerializer, 
    ChatMessageSerializer, 
    ConversationParticipantSerializer, 
    ConversationInviteSerializer, 
    MessageAttachmentSerializer,
    ConversationCreateSerializer,
    ParticipantAddSerializer,
    InviteCreateSerializer,
    InviteUpdateSerializer,
    MessageCreateSerializer
)

User = get_user_model()

from rest_framework.views import APIView
class DebugSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        from rag.models import StudySession
        conv_id = request.query_params.get('conversation_id')
        if conv_id:
            session_exists = StudySession.objects.filter(conversation_id=conv_id, is_active=True).exists()
        else:
            session_exists = StudySession.objects.filter(is_active=True).exists()
            
        return Response({
            "status": "ok",
            "session_exists": session_exists
        })


def make_json_safe(value):
    if isinstance(value, dict):
        return {str(k): make_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [make_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [make_json_safe(item) for item in value]
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except Exception:
            pass
    return value

class IsParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.participants.filter(user=request.user).exists() or obj.user == request.user

class IsConversationAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
                                                               
        if obj.user == request.user:
            return True
        return obj.participants.filter(user=request.user, role=ParticipantRole.ADMIN).exists()

class IsConversationOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

class CanViewMessages(permissions.BasePermission):
    def has_permission(self, request, view):
                                                                              
        conv_id = request.query_params.get('conversation')
        if not conv_id:
            return True
        return Conversation.objects.filter(
            Q(id=conv_id) & (Q(user=request.user) | Q(participants__user=request.user))
        ).distinct().exists()

class ConversationViewSet(viewsets.ModelViewSet):
    """
    API for managing conversations.
    Supports creating conversations and listing/retrieving ones the user is part of.
    """
    def get_permissions(self):
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsConversationOwner()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsConversationAdmin()]
        if self.action == 'retrieve':
            return [permissions.IsAuthenticated(), IsParticipant()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ConversationCreateSerializer
        return ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        if self.action == 'list':
            return Conversation.objects.filter(
                Q(user=user) | Q(participants__user=user)
            ).distinct().order_by('-updated_at')
        return Conversation.objects.all().order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        is_group = validated.get('is_group', False)
        metadata = validated.get('metadata') or {}
        dm_with_user_id = metadata.get('dm_with_user_id')

        if not is_group and dm_with_user_id:
            target_user = User.objects.filter(id=dm_with_user_id).first()
            if target_user:
                existing = Conversation.objects.filter(
                    is_group=False,
                    document__isnull=True
                ).filter(
                    Q(user=request.user, participants__user=target_user) |
                    Q(user=target_user, participants__user=request.user)
                ).distinct().first()
                if existing:
                    data = ConversationSerializer(existing, context=self.get_serializer_context()).data
                    return Response(data, status=status.HTTP_200_OK)

        self.perform_create(serializer)
                                                                                                
        full_serializer = ConversationSerializer(serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(full_serializer.data)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        conversation = serializer.save(user=self.request.user)
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=self.request.user,
            role=ParticipantRole.ADMIN
        )
        if not conversation.is_group:
            metadata = conversation.metadata or {}
            dm_with_user_id = metadata.get('dm_with_user_id')
            if dm_with_user_id:
                target_user = User.objects.filter(id=dm_with_user_id).first()
                if target_user and target_user != self.request.user:
                    try:
                        ConversationParticipant.objects.create(
                            conversation=conversation,
                            user=target_user,
                            role=ParticipantRole.MEMBER
                        )
                                                                              
                        channel_layer = get_channel_layer()
                        if channel_layer:
                            async_to_sync(channel_layer.group_send)(
                                f'user_notifications_{target_user.id}',
                                make_json_safe({
                                    'type': 'membership_updated',
                                    'conversation_id': str(conversation.id),
                                    'action': 'created'
                                })
                            )
                    except IntegrityError:
                        pass

                            
    @action(detail=True, methods=['get', 'post'], url_path='participants')
    def participants(self, request, pk=None):
        conversation = self.get_object()

        if request.method == 'GET':
            parts = conversation.participants.all()
            serializer = ConversationParticipantSerializer(parts, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            is_admin = conversation.user == request.user or conversation.participants.filter(
                user=request.user,
                role=ParticipantRole.ADMIN,
            ).exists()
            if not is_admin:
                return Response({"detail": "Only admins can add participants."}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = ParticipantAddSerializer(data=request.data)
            if serializer.is_valid():
                email = serializer.validated_data['user_email']
                role = serializer.validated_data['role']
                
                try:
                    target_user = User.objects.get(email=email)
                except User.DoesNotExist:
                    return Response({"detail": f"User with email {email} not found."}, status=status.HTTP_404_NOT_FOUND)
                
                try:
                    participant = ConversationParticipant.objects.create(
                        conversation=conversation,
                        user=target_user,
                        role=role
                    )
                    
                                                       
                    channel_layer = get_channel_layer()
                    if channel_layer:
                                                   
                        user_name = target_user.name or target_user.email
                        system_content = f"👋 {user_name} joined the group"
                        msg = ChatMessage.objects.create(
                            conversation=conversation,
                            role='system',
                            content=system_content,
                            message_type=MessageType.SYSTEM
                        )
                        msg_data = make_json_safe(ChatMessageSerializer(msg, context=self.get_serializer_context()).data)
                        async_to_sync(channel_layer.group_send)(
                            f'chat_{conversation.id}',
                            {
                                'type': 'chat_message',
                                'message': msg_data
                            }
                        )
                                                                                    
                        async_to_sync(channel_layer.group_send)(
                            f'user_notifications_{target_user.id}',
                            make_json_safe({
                                'type': 'membership_updated',
                                'conversation_id': str(conversation.id),
                                'action': 'added'
                            })
                        )
                    
                    return Response(ConversationParticipantSerializer(participant).data, status=status.HTTP_201_CREATED)
                except IntegrityError:
                    return Response({"detail": "User is already a participant."}, status=status.HTTP_400_BAD_REQUEST)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path=r'participants/(?P<user_id>[^/.]+)')
    def remove_participant(self, request, user_id=None, pk=None):
        conversation = self.get_object()
        
                                      
        if not conversation.participants.filter(user=request.user).exists():
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        participant = get_object_or_404(ConversationParticipant, conversation=conversation, user__id=user_id)
        
        if str(conversation.user_id) == user_id:
            return Response({"detail": "Conversation owner cannot be removed. Delete the conversation instead."}, status=status.HTTP_400_BAD_REQUEST)

                                                                                        
        is_admin = conversation.participants.filter(user=request.user, role=ParticipantRole.ADMIN).exists()
        if not is_admin and str(request.user.id) != user_id:
            return Response({"detail": "Only admins can remove other participants."}, status=status.HTTP_403_FORBIDDEN)
            
        user_name = participant.user.name or participant.user.email
        participant.delete()

                                           
        channel_layer = get_channel_layer()
        if channel_layer:
                                       
            chat_type_text = "group" if conversation.is_group else "conversation"
            system_content = f"🚫 {user_name} was removed from the {chat_type_text}"
            msg = ChatMessage.objects.create(
                conversation=conversation,
                role='system',
                content=system_content,
                message_type=MessageType.SYSTEM
            )
            msg_data = make_json_safe(ChatMessageSerializer(msg, context=self.get_serializer_context()).data)
            async_to_sync(channel_layer.group_send)(
                f'chat_{conversation.id}',
                {
                    'type': 'chat_message',
                    'message': msg_data
                }
            )
                                        
            async_to_sync(channel_layer.group_send)(
                f'user_notifications_{user_id}',
                make_json_safe({
                    'type': 'conversation_removed',
                    'conversation_id': str(conversation.id),
                    'reason': 'removed'
                })
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path=r'participants/(?P<user_id>[^/.]+)/role')
    def update_participant_role(self, request, user_id=None, pk=None):
        conversation = self.get_object()

        is_admin = conversation.user == request.user or conversation.participants.filter(
            user=request.user,
            role=ParticipantRole.ADMIN
        ).exists()
        if not is_admin:
            return Response({"detail": "Only admins can update participant roles."}, status=status.HTTP_403_FORBIDDEN)

        if str(conversation.user_id) == str(user_id):
            return Response({"detail": "Conversation owner role cannot be changed."}, status=status.HTTP_400_BAD_REQUEST)

        participant = get_object_or_404(ConversationParticipant, conversation=conversation, user__id=user_id)
        next_role = request.data.get('role')
        if next_role not in dict(ParticipantRole.choices):
            return Response({"detail": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        participant.role = next_role
        participant.save(update_fields=['role'])
        return Response(ConversationParticipantSerializer(participant).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        conversation = self.get_object()

        if conversation.user == request.user:
            return Response(
                {"detail": "Owner cannot leave. Delete the conversation instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant = ConversationParticipant.objects.filter(
            conversation=conversation,
            user=request.user,
        ).first()

        user_name = request.user.name or request.user.email
        participant.delete()

                                           
        channel_layer = get_channel_layer()
        if channel_layer:
            chat_type_text = "group" if conversation.is_group else "conversation"
            system_content = f"🚪 {user_name} left the {chat_type_text}"
            msg = ChatMessage.objects.create(
                conversation=conversation,
                role='system',
                content=system_content,
                message_type=MessageType.SYSTEM
            )
            msg_data = make_json_safe(ChatMessageSerializer(msg, context=self.get_serializer_context()).data)
            async_to_sync(channel_layer.group_send)(
                f'chat_{conversation.id}',
                {
                    'type': 'chat_message',
                    'message': msg_data
                }
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

                      
    @action(detail=True, methods=['post'], url_path='invites')
    def invites(self, request, pk=None):
        conversation = self.get_object()
        
        is_admin = conversation.user == request.user or conversation.participants.filter(
            user=request.user,
            role=ParticipantRole.ADMIN
        ).exists()
        if not is_admin:
            return Response({"detail": "Only admins can invite participants."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = InviteCreateSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['invitee_email'].strip().lower()
            
            if conversation.participants.filter(user__email__iexact=email).exists():
                return Response({"detail": "User is already a participant."}, status=status.HTTP_400_BAD_REQUEST)

            existing_pending = conversation.invites.filter(
                invitee_email__iexact=email,
                status=InviteStatus.PENDING,
            ).order_by('-created_at').first()
            if existing_pending:
                return Response(ConversationInviteSerializer(existing_pending).data, status=status.HTTP_200_OK)
            
            target_user = User.objects.filter(email__iexact=email).first()
            
            invite = ConversationInvite.objects.create(
                conversation=conversation,
                inviter=request.user,
                invitee_email=email,
                invitee_user=target_user
            )
            if target_user:
                ct = (conversation.title or 'a conversation').strip() or 'a conversation'
                create_notification(
                    target_user,
                    title='Chat invite',
                    body=f'{request.user.name} invited you to “{ct}”.',
                    kind='chat',
                    link='/dashboard/chat',
                )
                
                                            
                channel_layer = get_channel_layer()
                if channel_layer:
                    invite_data = make_json_safe(ConversationInviteSerializer(invite).data)
                    async_to_sync(channel_layer.group_send)(
                        f'user_notifications_{target_user.id}',
                        {
                            'type': 'invite_received',
                            'data': invite_data
                        }
                    )
            return Response(ConversationInviteSerializer(invite).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='active-study-session')
    def get_active_study_session(self, request, pk=None):
        conversation = self.get_object()
        session = conversation.study_sessions.filter(is_active=True).first()
        if not session:
            return Response({"status": "ended", "active": False})
            
        from django.utils import timezone
        if session.is_paused:
             end_ref = session.paused_at
        else:
             end_ref = timezone.now()
        
                                                    
        elapsed_seconds = (end_ref - session.started_at).total_seconds() - session.total_paused_duration
        
        return Response({
            "active": True,
            "id": str(session.id),
            "status": "paused" if session.is_paused else "active",
            "is_paused": session.is_paused,
            "is_active": session.is_active,
            "started_at": session.started_at.isoformat(),
            "paused_at": session.paused_at.isoformat() if session.paused_at else None,
            "total_paused_duration": session.total_paused_duration,
            "elapsed_time": int(elapsed_seconds),
            "timestamp": end_ref.isoformat(),
            "cycle": session.cycle,
            "current_phase": session.current_phase,
            "is_break": session.current_phase == 'break',
            "leader": {"id": str(session.leader.id), "name": getattr(session.leader, 'name', session.leader.email)}
        })


class ChatMessageViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    API for listing and sending messages inside a conversation.
    """
    permission_classes = [permissions.IsAuthenticated, CanViewMessages]

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return ChatMessageSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ChatMessage.objects.filter(
            Q(conversation__user=user) | Q(conversation__participants__user=user)
        ).distinct().order_by('-created_at')

        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)

        after = self.request.query_params.get('after')
        if after:
            qs = qs.filter(created_at__gt=after)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        message = serializer.instance
        output_serializer = ChatMessageSerializer(
            message,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        conversation = serializer.validated_data['conversation']
        attachment_document_ids = serializer.validated_data.get('attachment_document_ids') or []
        if not conversation.participants.filter(user=self.request.user).exists() and conversation.user != self.request.user:
            raise serializers.ValidationError("You are not a participant of this conversation.")
        
        message = serializer.save(sender=self.request.user, role='user')

        if attachment_document_ids:
            documents = Document.objects.filter(
                id__in=attachment_document_ids,
                user=self.request.user,
            )
            attachments = []
            for document in documents:
                file_size = 0
                mime_type = 'application/octet-stream'
                if document.file:
                    try:
                        file_size = document.file.size or 0
                    except Exception:
                        file_size = 0
                if document.file_type == 'pdf':
                    mime_type = 'application/pdf'
                elif document.file_type == 'image':
                    mime_type = 'image/*'
                elif document.file_type == 'text':
                    mime_type = 'text/plain'

                attachments.append(
                    MessageAttachment(
                        message=message,
                        document=document,
                        uploader=self.request.user,
                        mime_type=mime_type,
                        file_size=file_size,
                    )
                )
            if attachments:
                MessageAttachment.objects.bulk_create(attachments)
        
        Conversation.objects.filter(id=conversation.id).update(updated_at=timezone.now())
        
                                                                                            
        message.refresh_from_db()

        channel_layer = get_channel_layer()
        if channel_layer is not None:
                                                                                 
                                                                                      
            broadcast_serializer = ChatMessageSerializer(
                message, 
                context=self.get_serializer_context()
            )
            message_data = make_json_safe(broadcast_serializer.data)
            async_to_sync(channel_layer.group_send)(
                f'chat_{conversation.id}',
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )

    def _broadcast_message_update(self, message):
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        message_data = make_json_safe(
            ChatMessageSerializer(message, context=self.get_serializer_context()).data
        )
        async_to_sync(channel_layer.group_send)(
            f'chat_{message.conversation_id}',
            {
                'type': 'chat_message',
                'message': message_data
            }
        )

    @action(detail=True, methods=['patch'], url_path='reactions')
    def toggle_reaction(self, request, pk=None):
        message = self.get_object()
        conversation = message.conversation
        if not conversation.participants.filter(user=request.user).exists() and conversation.user != request.user:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        emoji = (request.data.get('emoji') or '').strip()
        if not emoji:
            return Response({"detail": "Emoji is required."}, status=status.HTTP_400_BAD_REQUEST)

        metadata = message.metadata or {}
        reactions = metadata.get('reactions') or {}
        emoji_bucket = reactions.get(emoji) or []
        user_key = str(request.user.id)
        entry = {"user_id": user_key, "user_email": request.user.email}
        existing_index = next((idx for idx, item in enumerate(emoji_bucket) if str(item.get('user_id')) == user_key), -1)
        if existing_index >= 0:
            emoji_bucket.pop(existing_index)
        else:
            emoji_bucket.append(entry)

        if emoji_bucket:
            reactions[emoji] = emoji_bucket
        else:
            reactions.pop(emoji, None)

        metadata['reactions'] = reactions
        message.metadata = metadata
        message.save(update_fields=['metadata'])
        self._broadcast_message_update(message)
        return Response(ChatMessageSerializer(message, context=self.get_serializer_context()).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='for-everyone')
    def delete_for_everyone(self, request, pk=None):
        message = self.get_object()
        conversation = message.conversation
        is_sender = message.sender_id == request.user.id
        is_group_admin = False
        if conversation.is_group:
            is_group_admin = conversation.user == request.user or conversation.participants.filter(
                user=request.user,
                role=ParticipantRole.ADMIN
            ).exists()
        if not (is_sender or is_group_admin):
            return Response(
                {"detail": "You can delete your own messages. Group admins can delete any group participant message."},
                status=status.HTTP_403_FORBIDDEN
            )

        metadata = message.metadata or {}
        metadata['deleted_for_everyone'] = True
        metadata['deleted_by'] = request.user.email
        metadata['deleted_at'] = timezone.now().isoformat()
        metadata.pop('reactions', None)
        message.metadata = metadata
        message.content = "This message was deleted."
        message.save(update_fields=['content', 'metadata'])
        self._broadcast_message_update(message)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationParticipantViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API for listing participants overall.
    """
    serializer_class = ConversationParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ConversationParticipant.objects.filter(
            Q(conversation__user=user) | Q(conversation__participants__user=user)
        ).distinct().select_related('user')


class ConversationInviteViewSet(mixins.RetrieveModelMixin, mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """
    API for listing and responding to invites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return InviteUpdateSerializer
        return ConversationInviteSerializer

    def get_queryset(self):
        user = self.request.user
        return ConversationInvite.objects.filter(
            Q(invitee_user=user) | Q(invitee_email__iexact=user.email)
        ).distinct().order_by('-created_at')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        if instance.invitee_email != request.user.email and instance.invitee_user != request.user:
            return Response({"detail": "Not authorized to respond to this invite."}, status=status.HTTP_403_FORBIDDEN)
        
        now = timezone.now()
        if instance.expires_at and instance.expires_at < now:
            if instance.status != InviteStatus.EXPIRED:
                instance.status = InviteStatus.EXPIRED
                instance.save(update_fields=['status'])
            return Response({"detail": "Invite has expired."}, status=status.HTTP_400_BAD_REQUEST)
        
        if instance.status in [InviteStatus.ACCEPTED, InviteStatus.REJECTED, InviteStatus.EXPIRED]:
            return Response({"detail": "Invite is no longer valid."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        new_status = serializer.validated_data.get('status')
        
        if new_status == InviteStatus.ACCEPTED and instance.status != InviteStatus.ACCEPTED:
            try:
                ConversationParticipant.objects.create(
                    conversation=instance.conversation,
                    user=request.user,
                    role=ParticipantRole.MEMBER
                )
            except IntegrityError:
                pass

            ConversationInvite.objects.filter(
                conversation=instance.conversation,
                invitee_email__iexact=request.user.email,
                status=InviteStatus.PENDING,
            ).exclude(id=instance.id).update(status=InviteStatus.REJECTED)
        elif new_status == InviteStatus.REJECTED:
            ConversationInvite.objects.filter(
                conversation=instance.conversation,
                invitee_email__iexact=request.user.email,
                status=InviteStatus.PENDING,
            ).exclude(id=instance.id).update(status=InviteStatus.REJECTED)
        
        self.perform_update(serializer)
        return Response(ConversationInviteSerializer(instance).data)

class MessageAttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API for listing attachments in user's conversations.
    """
    serializer_class = MessageAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MessageAttachment.objects.filter(
            Q(message__conversation__user=user) | Q(message__conversation__participants__user=user)
        ).distinct()

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        attachment = self.get_object()
        document_file = attachment.document.file
        if not document_file:
            return Response({"detail": "Attachment file is not available."}, status=status.HTTP_404_NOT_FOUND)
        document_file.open('rb')
        filename = attachment.document.title or document_file.name.split('/')[-1]
        return FileResponse(document_file, as_attachment=False, filename=filename)
