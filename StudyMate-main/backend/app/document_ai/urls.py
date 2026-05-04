from django.urls import path
from .views.upload import DocumentUploadView
from .views.chat import DocumentChatView
from .views.summary import DocumentSummaryView
from .views.flashcards import DocumentFlashcardsView
from .views.quiz import DocumentQuizView, QuizAttemptDetailView
from .views.studyplanner import DocumentStudyPlannerView, DocumentStudyPlannerDetailView
from .views.speech import TextToSpeechView, SpeechToTextView
from .views.pin import PinChatMessageView
from .views.mindmap import MindMapGenerateView

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('chat/', DocumentChatView.as_view(), name='document_chat'),
    path('chat/pin/', PinChatMessageView.as_view(), name='chat_pin'),
    path('summary/', DocumentSummaryView.as_view(), name='document_summary'),
    path('flashcards/', DocumentFlashcardsView.as_view(), name='document_flashcards'),
    path('quiz/', DocumentQuizView.as_view(), name='document_quiz'),
    path('quiz/<uuid:pk>/', QuizAttemptDetailView.as_view(), name='quiz_attempt_detail'),
    path('studyplanner/', DocumentStudyPlannerView.as_view(), name='studyplanner_list'),
    path('studyplanner/<uuid:pk>/', DocumentStudyPlannerDetailView.as_view(), name='studyplanner_detail'),
    path('documents/<uuid:pk>/studyplanner/', DocumentStudyPlannerView.as_view(), name='document_studyplanner'),
    path('tts/', TextToSpeechView.as_view(), name='text_to_speech'),
    path('stt/', SpeechToTextView.as_view(), name='speech_to_text'),
    path('mindmap/generate/', MindMapGenerateView.as_view(), name='mindmap_generate'),
]
