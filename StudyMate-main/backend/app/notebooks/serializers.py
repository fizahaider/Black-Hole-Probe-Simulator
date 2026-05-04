from rest_framework import serializers
from .models import KnowledgeSpace, Concept, MasteryLevel

class KnowledgeSpaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeSpace
        fields = ['id', 'name', 'subject', 'goal', 'difficulty', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ConceptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concept
        fields = ['id', 'space', 'name', 'description', 'dependencies', 'created_at']
        read_only_fields = ['id', 'created_at']

class MasteryLevelSerializer(serializers.ModelSerializer):
    concept_name = serializers.ReadOnlyField(source='concept.name')
    
    class Meta:
        model = MasteryLevel
        fields = ['id', 'concept', 'concept_name', 'level', 'last_assessed']
        read_only_fields = ['id', 'last_assessed']
