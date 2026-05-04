import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
import environ

BASE_DIR = Path(__file__).resolve().parent.parent


def get_env(name: str) -> str:
    value = os.environ.get(name)
    if value is None or value == "":
        raise ImproperlyConfigured(f"{name} environment variable is required")
    return value


DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
SECRET_KEY = get_env("SECRET_KEY")

ALLOWED_HOSTS = ["*"]

FAST_AI_MODE = os.environ.get("FAST_AI_MODE", "True") == "True"
ENABLE_RERANK = os.environ.get("ENABLE_RERANK", "False") == "True"
GROQ_DEFAULT_MODEL = os.environ.get("GROQ_DEFAULT_MODEL", "llama-3.3-70b-versatile")

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'core.apps.CoreConfig',
    'account.apps.AccountConfig',
    'document_ai.apps.DocumentAiConfig',
    'rag.apps.RagConfig',
    'chat.apps.ChatConfig',
    'analytics.apps.AnalyticsConfig',
    'prep_hub.apps.PrepHubConfig',
    'channels',
    'django_celery_beat',
]

GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'
REDIS_URL = get_env('REDIS_URL')

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

env = environ.Env()
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        'default': env.db("DATABASE_URL")
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.environ.get('DB_HOST', 'db'),
            'NAME': os.environ.get('DB_NAME', 'studymate'),
            'USER': os.environ.get('DB_USER', 'studymate_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'secret'),
            'PORT': os.environ.get('DB_PORT', 5432),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
MEDIA_URL = '/static/media/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = '/vol/web/media'

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'account.User'

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL')
CONTACT_NOTIFICATION_EMAIL = os.environ.get('CONTACT_NOTIFICATION_EMAIL')

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://studymate-alpha.vercel.app',
    'https://studymate-3zq695m90-fatima-noors-projects-b097a5cb.vercel.app',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': (
        'core.renderers.JSONErrorRenderer',
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'API Docs',
    'VERSION': '1.0.0',
    'SORT_OPERATIONS': False,
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'defaultModelsExpandDepth': -1,
    },
    'ENUM_NAME_OVERRIDES': {
        'FocusEnum': 'document_ai.models.FocusEnum',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_DEFAULT_VOICE = os.environ.get('ELEVENLABS_DEFAULT_VOICE', '21m00Tcm4TlvDq8ikWAM')
DEEPGRAM_API_KEY = os.environ.get('DEEPGRAM_API_KEY')
SPEECH_CACHE_DIR = os.path.join(MEDIA_ROOT, 'speech_cache')

if not os.path.exists(SPEECH_CACHE_DIR):
    try:
        os.makedirs(SPEECH_CACHE_DIR, exist_ok=True)
    except Exception:
        pass

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = None
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'