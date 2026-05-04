from rest_framework import viewsets, permissions
from .models import KnowledgeSpace, Concept, MasteryLevel
from .serializers import (
    KnowledgeSpaceSerializer, 
    ConceptSerializer, 
    MasteryLevelSerializer
)

class KnowledgeSpaceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = KnowledgeSpaceSerializer

    def get_queryset(self):
        return KnowledgeSpace.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ConceptViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConceptSerializer

    def get_queryset(self):
        return Concept.objects.filter(space__user=self.request.user)

class MasteryLevelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MasteryLevelSerializer

    def get_queryset(self):
        return MasteryLevel.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
