from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from account.views import (
    UserSignUpView,
    UserSignInView,
    UserProfileView,
    ContactFormView,
    UpdatePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    NewsletterSubscribeView,
    UserSearchView,
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
)


urlpatterns = [
    path('signup/', UserSignUpView.as_view(), name='signup'),
    path('signin/', UserSignInView.as_view(), name='signin'),
    path('search/', UserSearchView.as_view(), name='user-search'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    path('profile/', UserProfileView.as_view(), name='profile'),
    path('password/update/', UpdatePasswordView.as_view(), name='password-update'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    path('contact/', ContactFormView.as_view(), name='contact'),
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='newsletter-subscribe'),

    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notifications-mark-all-read'),
    path('notifications/<uuid:pk>/read/', NotificationMarkReadView.as_view(), name='notifications-mark-read'),
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
]