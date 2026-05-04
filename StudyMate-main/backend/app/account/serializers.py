from rest_framework import serializers
from django.utils.encoding import force_str
from django.core.exceptions import ValidationError
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from account.models import Contact, Newsletter, Notification

User = get_user_model()


class UserSignUpSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'image', 'password', 'confirm_password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        password = data.get('password')
        confirm_password = data.pop('confirm_password', None)

        if password != confirm_password:
            raise serializers.ValidationError(
                {'password': 'Passwords do not match.'}
            )

        try:
            validate_password(password)
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})

        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSignInSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(max_length=255)

    class Meta:
        model = User
        fields = ['email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        user = authenticate(
            email=data.get('email'),
            password=data.get('password')
        )
        if not user:
            raise serializers.ValidationError(
                {'detail': 'Invalid email or password.'}
            )
        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    streak_count = serializers.SerializerMethodField()
    last_completed_task_date = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'image', 'streak_count', 'last_completed_task_date']
        read_only_fields = ['id', 'email', 'streak_count', 'last_completed_task_date']

    def get_streak_count(self, obj):
        if hasattr(obj, 'progress'):
            return obj.progress.streak_count
        return 0

    def get_last_completed_task_date(self, obj):
        if hasattr(obj, 'progress'):
            raw_date = obj.progress.last_completed_task_date
            return raw_date.isoformat() if raw_date else None
        return None

class ContactFormSerializer(serializers.ModelSerializer):

    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'email', 'phone',
            'subject', 'message', 'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at']


class UpdatePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = self.context['request'].user

        if not user.check_password(data['old_password']):
            raise serializers.ValidationError({
                'password': 'Old password is incorrect.'
            })

        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })

        try:
            validate_password(data['new_password'], user)
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})

        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user




class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                'No user is associated with this email.'
            )
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField(max_length=100)
    token = serializers.CharField(max_length=100)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })
        try:
            validate_password(data['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})
        return data

    def save(self):
        uid = force_str(urlsafe_base64_decode(self.validated_data['uidb64']))
        user = User.objects.get(pk=uid)
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
    
class NewsletterSubscriptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Newsletter
        fields = ['email']

    def validate_email(self, value):
        if Newsletter.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'This email is already subscribed.'
            )
        return value


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'kind', 'link', 'read_at', 'created_at', 'is_read']
        read_only_fields = fields

    def get_is_read(self, obj):
        return obj.read_at is not None