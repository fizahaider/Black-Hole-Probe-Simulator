from document_ai.models import Summary, FlashcardSet, QuizAttempt, FeatureUsage
from django.db.models import Count

class StatisticsService:
    @staticmethod
    def get_space_stats(user, space_id=None):
        filters = {'user': user}
        if space_id:
            filters['space_id'] = space_id
            
        stats = {
            'summaries': Summary.objects.filter(**filters).count(),
            'flashcards': FlashcardSet.objects.filter(**filters).count(),
            'quizzes': QuizAttempt.objects.filter(**filters).count(),
            # Chat messages could be added here if needed, but RAG doesn't have a specific 'count' model yet other than ChatMessage
        }
        
        # Also include ChatMessage count if space_id is provided
        if space_id:
            from ..models import ChatMessage
            stats['chat_questions'] = ChatMessage.objects.filter(
                conversation__user=user, 
                conversation__space_id=space_id,
                role='user'
            ).count()
        else:
            from ..models import ChatMessage
            stats['chat_questions'] = ChatMessage.objects.filter(
                conversation__user=user,
                role='user'
            ).count()
            
        return stats

statistics_service = StatisticsService()
