"""Create in-app notifications for users."""

from account.models import Notification


def create_notification(user, title, body, kind='system', link=None):
    """
    Persist a notification. Safe to call from views/tasks; ignores inactive users.
    """
    if user is None or not getattr(user, 'is_active', True):
        return None
    return Notification.objects.create(
        user=user,
        title=(title or '')[:255],
        body=body or '',
        kind=(kind or 'system')[:32],
        link=(link or '')[:2048] if link else '',
    )
