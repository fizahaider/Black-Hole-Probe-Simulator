from .groq_client import groq_client

class AIProviderFactory:
    """
    Factory to route AI requests to the best-suited model.
    - SMART/FAST: Groq (Llama-3) for high-speed reliable text processing.
    """
    
    @staticmethod
    def get_provider(requirement="FAST"):
        # Default to Groq for everything 
        return groq_client

ai_factory = AIProviderFactory()
