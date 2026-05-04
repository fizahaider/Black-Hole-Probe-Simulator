from django.urls import path
from .views import (
    PrepPlanGenerateView,
    PrepPlanListView,
    PrepPlanDetailView,
    PrepPlanRenameView,
    PrepPlanDeleteView,
    PrepPlanRegenerateView,
    PrepPlanSetFocusView,
    PrepPlanStartPhaseView,
    PrepPlanToggleTaskView,
    PrepPlanSaveResourceView,
    PrepPlanConvertStudyPlanView,
)


urlpatterns = [
    path('generate/', PrepPlanGenerateView.as_view(), name='prep-hub-generate'),
    path('plans/', PrepPlanListView.as_view(), name='prep-hub-plan-list'),
    path('plans/<uuid:pk>/', PrepPlanDetailView.as_view(), name='prep-hub-plan-detail'),
    path('plans/<uuid:pk>/rename/', PrepPlanRenameView.as_view(), name='prep-hub-plan-rename'),
    path('plans/<uuid:pk>/delete/', PrepPlanDeleteView.as_view(), name='prep-hub-plan-delete'),
    path('plans/<uuid:pk>/regenerate/', PrepPlanRegenerateView.as_view(), name='prep-hub-plan-regenerate'),
    path('plans/<uuid:pk>/set-focus/', PrepPlanSetFocusView.as_view(), name='prep-hub-plan-set-focus'),
    path('plans/<uuid:pk>/start-phase/', PrepPlanStartPhaseView.as_view(), name='prep-hub-plan-start-phase'),
    path('plans/<uuid:pk>/toggle-task/', PrepPlanToggleTaskView.as_view(), name='prep-hub-plan-toggle-task'),
    path('plans/<uuid:pk>/save-resource/', PrepPlanSaveResourceView.as_view(), name='prep-hub-plan-save-resource'),
    path('plans/<uuid:pk>/convert-study-plan/', PrepPlanConvertStudyPlanView.as_view(), name='prep-hub-plan-convert-study-plan'),
]

