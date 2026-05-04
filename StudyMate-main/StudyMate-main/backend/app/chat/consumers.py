import json
import uuid
import asyncio
from datetime import timedelta
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rag.models import Conversation, ConversationParticipant, ChatMessage, MessageType
import traceback
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

FOCUS_SECONDS = 25 * 60
SHORT_BREAK_SECONDS = 5 * 60
LONG_BREAK_SECONDS = 15 * 60
MAX_CYCLES = 4

def get_user_display_name(user):
    if not user:
        return "User"
    return (
        getattr(user, 'name', None)
        or getattr(user, 'full_name', None)
        or getattr(user, 'email', None)
        or "User"
    )

async def serialize_chat_message(message):
    from .serializers import ChatMessageSerializer
    from rest_framework.test import APIRequestFactory
    factory = APIRequestFactory()
    request = factory.get('/')
    
    def get_data():
        serializer = ChatMessageSerializer(message, context={'request': request})
        return _json_safe(serializer.data)
        
    return await sync_to_async(get_data)()


def _json_safe(value):
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, uuid.UUID):
        return str(value)
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except:
            pass
    return value

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
            self.room_group_name = f'chat_{self.conversation_id}'
            self.user = self.scope.get('user')

            if not self.user or not self.user.is_authenticated:
                await self.close()
                return

                              
            has_permission = await self.check_participant(self.user.id, self.conversation_id)
            if not has_permission:
                await self.close()
                return

                             
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            
                                                    
            session_data = await self.get_active_session_data()
            if session_data:
                await self.send(text_data=json.dumps({
                    "type": "session_update",
                    "status": "resumed" if not session_data.get('is_paused') else "paused",
                    "remainingSeconds": session_data.get('remaining_time', 0),
                    "data": session_data
                }))
            else:
                await self.send(text_data=json.dumps({
                    "type": "session_update",
                    "status": "ended",
                    "remainingSeconds": 0,
                    "data": None
                }))
        except Exception as e:
            logger.error(f"WebSocket connect error: {e}")
            traceback.print_exc()
            try:
                await self.accept()
            except:
                pass

    async def disconnect(self, close_code):
        try:
                              
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            logger.error(f"WS disconnect error: {e}")

                                                       
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action') or (data.get('type') == 'session_control' and data.get('action'))
            
            if action == 'start':
                await self.handle_start_session()
            elif action == 'pause':
                await self.handle_pause_session()
            elif action == 'resume':
                await self.handle_resume_session()
            elif action == 'end':
                await self.handle_end_session()
            elif data.get('type') == 'chat_message':
                                                                             
                pass
        except Exception as e:
            logger.error(f"WS receive error: {e}")
            traceback.print_exc()

                                                           
    async def chat_message(self, event):
                                   
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'data': event['message']
        }))

    async def session_update(self, event):
        session_data = event.get("session")
        status = event.get("status", "started")
        remaining = 0
        if session_data:
            remaining = session_data.get('remaining_time', 0)
        
        await self.send(text_data=json.dumps({
            "type": "session_update",
            "status": status,
            "remainingSeconds": int(remaining),
            "data": session_data
        }))


    async def handle_start_session(self):
        now = timezone.now()
        session_data = await self.start_new_session(now)
        await self.broadcast_session(session_data, "started")
        user_name = get_user_display_name(self.user)
        msg = await self.create_system_message(f"📚 {user_name} started a study session")
        await self.broadcast_system_message(msg)

    async def handle_pause_session(self):
        now = timezone.now()
        session_data = await self.toggle_session_pause(True, now)
        if session_data:
            await self.broadcast_session(session_data, "paused")
            msg = await self.create_system_message("⏸️ Session paused")
            await self.broadcast_system_message(msg)

    async def handle_resume_session(self):
        now = timezone.now()
        session_data = await self.toggle_session_pause(False, now)
        if session_data:
            await self.broadcast_session(session_data, "resumed")
            msg = await self.create_system_message("▶️ Session resumed")
            await self.broadcast_system_message(msg)

    async def handle_end_session(self):
        now = timezone.now()
        await self.end_session_db(now)
        await self.broadcast_session(None, "ended")
        msg = await self.create_system_message("🛑 Session ended")
        await self.broadcast_system_message(msg)

    async def broadcast_session(self, session_data, status="started"):
        payload = _json_safe(session_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "session.update",
                "session": payload,
                "status": status
            }
        )

    async def broadcast_system_message(self, message):
        message_data = await serialize_chat_message(message)
        payload = _json_safe(message_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'message': payload
            }
        )

    async def start_new_session(self, now):
        from rag.models import StudySession
        
        def do_create():
                                                    
            StudySession.objects.filter(conversation_id=self.conversation_id, is_active=True).update(is_active=False)
            
            session = StudySession.objects.create(
                conversation_id=self.conversation_id,
                leader=self.user,
                started_at=now,
                is_active=True,
                is_paused=False,
                paused_at=None,
                total_paused_duration=0,
                cycle=1,
                current_phase='focus',
                duration=FOCUS_SECONDS
            )
            return self._serialize_session_sync(session)
            
        return await sync_to_async(do_create)()

    async def toggle_session_pause(self, pause, now):
        from rag.models import StudySession
        
        def do_toggle():
            session = StudySession.objects.filter(conversation_id=self.conversation_id, is_active=True).first()
            if session and session.is_paused != pause:
                if pause:
                    session.is_paused = True
                    session.paused_at = now
                else:
                    if session.paused_at:
                        pause_duration = (now - session.paused_at).total_seconds()
                        session.total_paused_duration += int(pause_duration)
                    session.is_paused = False
                    session.paused_at = None
                session.save()
                return self._serialize_session_sync(session)
            return None
            
        return await sync_to_async(do_toggle)()

    async def end_session_db(self, now):
        from rag.models import StudySession
        
        def do_end():
            session = StudySession.objects.filter(conversation_id=self.conversation_id, is_active=True).first()
            if session:
                if session.is_paused and session.paused_at:
                    pause_duration = (now - session.paused_at).total_seconds()
                    session.total_paused_duration += int(pause_duration)
                session.is_active = False
                session.is_paused = False
                session.paused_at = None
                session.save()
                return str(session.id)
            return None
            
        return await sync_to_async(do_end)()

    async def get_active_session_data(self):
        from rag.models import StudySession
        
        def do_get():
            session = StudySession.objects.filter(conversation_id=self.conversation_id, is_active=True).first()
            if session:
                return self._serialize_session_sync(session)
            return None
            
        return await sync_to_async(do_get)()

    def _serialize_session_sync(self, session):
        try:
            if not session:
                return None
            
            now = timezone.now()
            elapsed = (now - session.started_at).total_seconds()
            if session.is_paused:
                elapsed -= (now - session.paused_at).total_seconds()
            elapsed -= session.total_paused_duration
            remaining = max(0, int(session.duration - elapsed))

            return {
                'id': str(session.id),
                'conversation_id': str(session.conversation_id),
                'is_active': session.is_active,
                'is_paused': session.is_paused,
                'started_at': session.started_at.isoformat(),
                'paused_at': session.paused_at.isoformat() if session.paused_at else None,
                'total_paused_duration': session.total_paused_duration,
                'duration': session.duration,
                'remaining_time': remaining,
                'current_phase': session.current_phase,
                'cycle': session.cycle,
                'updated_at': session.updated_at.isoformat(),
                'leader': {
                    'id': str(session.leader.id),
                    'name': get_user_display_name(session.leader)
                }
            }
        except Exception as e:
            logger.error(f"Session serialization failed: {e}")
            return None

    async def create_system_message(self, content):
        from rag.models import ChatMessage, MessageType
        
        def do_create():
            return ChatMessage.objects.create(
                conversation_id=self.conversation_id,
                role='system',
                content=content,
                message_type=MessageType.SYSTEM
            )
            
        return await sync_to_async(do_create)()

    async def check_participant(self, user_id, conversation_id):
        from rag.models import Conversation
        
        def do_check():
            try:
                conversation = Conversation.objects.get(id=conversation_id)
                if conversation.user_id == user_id:
                    return True
                return conversation.participants.filter(user_id=user_id).exists()
            except Conversation.DoesNotExist:
                return False
                
        return await sync_to_async(do_check)()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.group_name = f'user_notifications_{self.user.id}'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def invite_received(self, event):
        await self.send(text_data=json.dumps({
            'type': 'invite_received',
            'data': event['data']
        }))

    async def conversation_removed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'conversation_removed',
            'conversation_id': event['conversation_id'],
            'reason': event.get('reason', 'removed')
        }))

    async def membership_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'membership_updated',
            'conversation_id': event['conversation_id'],
            'action': event['action']
        }))
