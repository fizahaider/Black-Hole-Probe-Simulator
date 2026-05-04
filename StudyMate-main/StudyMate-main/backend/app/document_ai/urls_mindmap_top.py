from django.urls import path
from .views.mindmap import MindMapGenerateView

urlpatterns = [
    path('', MindMapGenerateView.as_view(), name='mindmap_generate_top'),
]
