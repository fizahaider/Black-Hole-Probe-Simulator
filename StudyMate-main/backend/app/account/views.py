from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)

from account.emails.contact import (
    send_contact_email_to_client,
    send_contact_email_to_company,
)

from account.emails.welcome_email import (
    send_welcome_email,
)

from account.serializers import (
    UserSignUpSerializer,
    UserSignInSerializer,
    UserProfileSerializer,
    ContactFormSerializer,
    UpdatePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    NewsletterSubscriptionSerializer,
    NotificationSerializer,
)
from account.models import Notification
from account.services.notifications import create_notification

class UserSearchView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get(self, request, *args, **kwargs):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response([])
        
        User = get_user_model()
        users = User.objects.filter(
            Q(name__icontains=query) | Q(email__icontains=query)
        ).exclude(id=request.user.id)[:10]
        
        results = []
        for user in users:
            avatar_url = None
            image = getattr(user, 'image', None)
            if image:
                try:
                    if hasattr(image, 'url'):
                        avatar_url = request.build_absolute_uri(image.url)
                except Exception:
                    avatar_url = None
            results.append({
                'id': str(user.id),
                'username': user.email,
                'display_name': user.name,
                'avatar': avatar_url,
            })
        return Response(results)

from account.emails.newsletter import (
    notify_user_newsletter_subscribed,
)

from account.emails.password_reset import (
    send_password_reset_email,
)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token)
    }


class UserSignUpView(GenericAPIView):
    serializer_class = UserSignUpSerializer

    def post(self, request, *args, **kwargs):
        try:
            logger.info(f"SignUp attempt for email: {request.data.get('email')}")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            tokens = get_tokens_for_user(user)

            create_notification(
                user,
                title='Welcome to StudyMate',
                body='Your account is ready. Open Study to build a roadmap or try chat and AI tools.',
                kind='system',
                link='/dashboard/study',
            )

            try:
                send_welcome_email(user)
            except Exception as e:
                logger.error(f"Failed to send welcome email for {user.email}: {e}")
                                                             

            return Response(
                {'message': 'Account created successfully.', 'tokens': tokens},
                status=status.HTTP_201_CREATED
            )
        except ValidationError:
            raise
        except Exception as e:
            logger.exception(f"SignUp failed: {e}")
            return Response(
                {'error': 'Internal server error during registration.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserSignInView(GenericAPIView):
    serializer_class = UserSignInSerializer

    def post(self, request, *args, **kwargs):
        try:
            logger.info(f"SignIn attempt for email: {request.data.get('email')}")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data.get('user')
            tokens = get_tokens_for_user(user)

            return Response(
                {'message': 'Login successful.', 'tokens': tokens},
                status=status.HTTP_200_OK
            )
        except ValidationError:
            raise
        except Exception as e:
            logger.warning(f"SignIn failed for {request.data.get('email')}: {e}")
            return Response(
                {'error': 'Invalid credentials or account issue.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(GenericAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(request.user)

        return Response({
            'message': 'Profile fetched successfully.',
            'data': serializer.data
        }, status=status.HTTP_200_OK
        )

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Profile updated successfully.',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    
class ContactFormView(GenericAPIView):
    serializer_class = ContactFormSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        contact_data = serializer.data
        send_contact_email_to_company(contact_data)
        send_contact_email_to_client(contact_data)

        return Response({
            'message': 'Your message has been submitted successfully.',
        }, status=status.HTTP_201_CREATED)
    


class UpdatePasswordView(GenericAPIView):
    serializer_class = UpdatePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Password updated successfully.'
        }, status=status.HTTP_200_OK)
    

class PasswordResetRequestView(GenericAPIView):
    serializer_class = PasswordResetRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_password_reset_email(serializer.user)

        return Response({
            'message': 'Password reset email sent.',
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Password has been reset successfully.',
        }, status=status.HTTP_200_OK)
    
class NewsletterSubscribeView(GenericAPIView):
    serializer_class = NewsletterSubscriptionSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        newsletter = serializer.save()
        notify_user_newsletter_subscribed(newsletter.email)

        return Response({
            'message': 'Successfully subscribed to the newsletter.',
        }, status=status.HTTP_201_CREATED)


class NotificationListView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get(self, request, *args, **kwargs):
        qs = Notification.objects.filter(user=request.user)
        unread_only = request.query_params.get('unread_only', '').lower() in ('1', 'true', 'yes')
        if unread_only:
            qs = qs.filter(read_at__isnull=True)
        try:
            limit = int(request.query_params.get('limit', 30))
        except ValueError:
            limit = 30
        limit = max(1, min(limit, 100))
        rows = qs[:limit]
        return Response({'results': NotificationSerializer(rows, many=True).data})


class NotificationUnreadCountView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        n = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({'unread_count': n})


class NotificationMarkReadView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        updated = Notification.objects.filter(user=request.user, pk=pk, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        if not updated:
            if not Notification.objects.filter(user=request.user, pk=pk).exists():
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'ok': True})


class NotificationMarkAllReadView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({'ok': True})