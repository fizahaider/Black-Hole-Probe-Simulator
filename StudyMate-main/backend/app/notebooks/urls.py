from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KnowledgeSpaceViewSet, ConceptViewSet, MasteryLevelViewSet

router = DefaultRouter()
router.register(r'spaces', KnowledgeSpaceViewSet, basename='space')
router.register(r'concepts', ConceptViewSet, basename='concept')
router.register(r'mastery', MasteryLevelViewSet, basename='mastery')

app_name = 'notebooks'

urlpatterns = [
    path('', include(router.urls)),
]
