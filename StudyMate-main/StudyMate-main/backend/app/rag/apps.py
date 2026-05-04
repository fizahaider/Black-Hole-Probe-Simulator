from django.apps import AppConfig

class RagConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag'

    def ready(self):
        import os
        import sys
        
                                                                                      
        if os.environ.get('RUN_MAIN') == 'true' or 'runserver' in sys.argv:
            from .services.warmer import RAGWarmer
            RAGWarmer.warm_all()