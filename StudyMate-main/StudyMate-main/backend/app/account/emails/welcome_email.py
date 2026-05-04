from django.conf import settings
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives


def send_welcome_email(user):
    subject = "Welcome to StudyMate — Let’s Learn Smarter 🚀"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px; padding: 24px; max-width: 600px; margin: auto;">
        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">Welcome, {user.name}!</h2>
        <p style="font-size: 15px; line-height: 1.6;">
            We're thrilled to have you join StudyMate 🎉.
            You’ve just unlocked a smarter way to learn and grow.
        </p>
        <div style="margin-top: 20px; padding: 16px; background-color: #f9f9f9; border-left: 4px solid #000;">
            <p style="margin: 0;"><strong>Here’s what you can do with StudyMate:</strong></p>
            <ul style="margin-top: 6px;">
                <li>Track and improve your learning with AI-powered tools</li>
                <li>Get smart summaries, insights, and keypoints for your studies</li>
                <li>Access exclusive resources and updates</li>
            </ul>
        </div>
        <p style="margin-top: 24px; line-height: 1.5;">
            Dive in, explore, and see where your learning journey can take you 🌟.<br>
            We’re here for you every step of the way.
        </p>
        <p style="margin-top: 16px;">
            Warm regards,<br>
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

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email]
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)
