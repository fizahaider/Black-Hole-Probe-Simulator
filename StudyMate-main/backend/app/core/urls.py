from django.contrib import admin
from django.conf import settings
from django.urls import path, include
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.http import JsonResponse

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/', include('account.urls')),
    path('api/document/', include('document_ai.urls')),
    path('api/document/rag/', include('rag.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/prep-hub/', include('prep_hub.urls')),
    path('api/mindmap/generate/', include([
        path('', include('document_ai.urls_mindmap_top')),
    ])),
    path(
        'api/schema/',
        SpectacularAPIView.as_view(),
        name='api-schema'
    ),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='api-schema'),
        name='api-docs'
    ),
    path('health/', lambda request: JsonResponse({"status": "ok"})),
    path('', lambda request: JsonResponse({"status": "Hello from StudyMate!"})),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )