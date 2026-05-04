from django.conf import settings
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives


def notify_user_newsletter_subscribed(email):
    subject = "Subscription Confirmed — StudyMate Newsletter"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px; padding: 24px; max-width: 600px; margin: auto;">
        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">Newsletter Subscription Confirmed</h2>
        <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
        <p style="font-size: 15px; line-height: 1.6;">
            Thank you for subscribing to the StudyMate newsletter.
            You’ll now receive the latest updates, insights, and news directly in your inbox.
        </p>
        <div style="margin-top: 20px; padding: 16px; background-color: #f9f9f9; border-left: 4px solid #000;">
            <p style="margin: 0;"><strong>What to expect:</strong></p>
            <ul style="margin-top: 6px;">
                <li>Study tips and learning insights</li>
                <li>New features and updates</li>
                <li>Exclusive offers and announcements</li>
            </ul>
        </div>
        <p style="margin-top: 24px; line-height: 1.5;">
            Best regards,<br>
            <strong>The StudyMate Team</strong><br>
            <span style="font-size: 13px; color: #777;">Helping you learn smarter.</span>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; text-align: center; color: #999;">
            This is an automated email — please do not reply directly.
        </p>
    </div>
    """

    text_content = strip_tags(html_content)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email]
    )
    message.attach_alternative(html_content, "text/html")
    message.send(fail_silently=False)
