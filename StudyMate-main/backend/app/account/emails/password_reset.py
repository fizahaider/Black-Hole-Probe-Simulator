from django.conf import settings
from django.utils.html import strip_tags
from django.utils.encoding import force_bytes
from django.core.mail import EmailMultiAlternatives
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

    subject = "Reset Your StudyMate Password"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px; padding: 24px; max-width: 600px; margin: auto;">
        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">Password Reset Request</h2>
        <p style="font-size: 15px; line-height: 1.6;">
            Hi {user.name},<br><br>
            We received a request to reset your StudyMate account password.
            You can set a new password by clicking the button below:
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Reset Password
            </a>
        </div>

        <p style="font-size: 14px; line-height: 1.6;">
            Or you can copy and paste this link in your browser:<br>
            <a href="{reset_url}" style="color: #000;">{reset_url}</a>
        </p>

        <p style="font-size: 14px; margin-top: 20px;">
            If you didn’t request this, you can safely ignore this email.
            Your password will remain unchanged.
        </p>

        <p style="margin-top: 32px; line-height: 1.5;">
            Warm regards,<br>
            <strong>The StudyMate Team</strong><br>
            <span style="font-size: 13px; color: #777;">AI-Powered Learning. Human-Centered Design.</span>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; text-align: center; color: #999;">
            This is an automated email — please don’t reply directly.
        </p>
    </div>
    """

    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)
