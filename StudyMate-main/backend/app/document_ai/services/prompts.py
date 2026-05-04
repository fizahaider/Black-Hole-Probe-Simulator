def get_summary_prompt(length="medium", tone="neutral", purpose="revision", emphasis="key_points", structure="paragraph", is_multi_document=False):
    """
    Generates a high-quality summary prompt based on user preferences.
    All parameters are optional and have reasonable defaults.
    Intent-aware: Creates different summary structures based on purpose.
    """
    prompt = (
        "You are an expert educational content strategist. Your goal is to provide a high-quality, "
        "well-structured summary optimized for learning and revision. Maintain factual accuracy, "
        "avoid adding external information, and preserve important original terminology.\n\n"
    )
    
    # Intent-aware purpose templates
    purpose_templates = {
        "revision": (
            "PURPOSE: Revision-Optimized Summary\n"
            "Create a summary designed for quick review before exams.\n"
            "- Start with a 2-3 sentence high-level overview\n"
            "- Use ### Key Concepts for main ideas with bullet points\n"
            "- Highlight important terms in **bold**\n"
            "- End with a '### Quick Review Checklist' section\n"
            "- Make it scannable and easy to memorize from\n"
        ),
        "study_notes": (
            "PURPOSE: Structured Study Notes\n"
            "Create comprehensive study notes optimized for learning and retention.\n"
            "- Organize by major topics with ### headings\n"
            "- Include definitions, examples, and relationships between concepts\n"
            "- Use bullet points and numbered lists for clarity\n"
            "- Add '### Key Takeaways' section at the end\n"
            "- Make it suitable for long-term study reference\n"
        ),
        "exam_focused": (
            "PURPOSE: Exam-Focused Summary\n"
            "Create a summary highlighting likely test material.\n"
            "- Identify core concepts that are commonly tested\n"
            "- Include definitions, comparisons, and cause-effect relationships\n"
            "- Mark high-priority items with **IMPORTANT**\n"
            "- Add '### Potential Exam Questions' section with 3-5 questions\n"
            "- Focus on what students need to know for assessments\n"
        ),
        "presentation": (
            "PURPOSE: Presentation-Ready Talking Points\n"
            "Create concise talking points suitable for slides or presentations.\n"
            "- Use brief bullet points (no dense paragraphs)\n"
            "- Focus on high-level insights and key messages\n"
            "- Include '### Key Points' and '### Supporting Details' sections\n"
            "- Keep each point to one line when possible\n"
        ),
        "quick_overview": (
            "PURPOSE: Quick Overview\n"
            "Create a brief, high-level summary for fast understanding.\n"
            "- Provide a concise 1-2 paragraph overview\n"
            "- List 5-7 main takeaways as bullet points\n"
            "- Keep it under 300 words total\n"
            "- Focus on the big picture, not details\n"
        )
    }
    
    prompt += purpose_templates.get(purpose, purpose_templates["revision"])
    
    # Length configuration
    length_desc = {
        "short": "LENGTH: Very concise - capture only the absolute essence (150-200 words).",
        "medium": "LENGTH: Balanced - enough detail to cover main ideas comprehensively (300-400 words).",
        "detailed": "LENGTH: Comprehensive - include supporting details and nuances (500-600 words)."
    }
    prompt += f"{length_desc.get(length, length_desc['medium'])}\n\n"
    
    # Tone configuration
    tone_desc = {
        "neutral": "TONE: Objective and balanced.",
        "academic": "TONE: Formal, academic language suitable for scholarly review.",
        "professional": "TONE: Polished, business-like language.",
        "simple": "TONE: Clear, easy-to-understand language (ELI5 style).",
        "friendly": "TONE: Approachable and engaging.",
        "technical": "TONE: Precise, technical language for domain experts."
    }
    prompt += f"{tone_desc.get(tone, tone_desc['neutral'])}\n\n"
    
    # Emphasis configuration
    emphasis_desc = {
        "key_points": "EMPHASIS: Focus on main arguments and key takeaways.",
        "definitions": "EMPHASIS: Ensure all core terms and concepts are clearly defined.",
        "results": "EMPHASIS: Highlight final outcomes, conclusions, and data points.",
        "steps": "EMPHASIS: Focus on sequential processes and actionable steps.",
        "pros_cons": "EMPHASIS: Highlight advantages, disadvantages, and critical trade-offs."
    }
    prompt += f"{emphasis_desc.get(emphasis, emphasis_desc['key_points'])}\n\n"
    
    # Multi-document synthesis instruction
    if is_multi_document:
        prompt += (
            "MULTI-DOCUMENT SYNTHESIS:\n"
            "You are summarizing content from MULTIPLE documents.\n"
            "- Synthesize insights across all sources intelligently\n"
            "- Avoid duplication - merge similar concepts\n"
            "- Highlight connections and relationships between documents\n"
            "- Maintain clarity about which concepts come from where when relevant\n\n"
        )
    
    # Structure requirements - ENFORCED for all summaries
    prompt += (
        "STRUCTURE REQUIREMENTS (MUST FOLLOW):\n"
        "1. ALWAYS start with '### Overview' (2-3 sentences providing high-level context)\n"
        "2. Use '### Key Concepts' with bullet points for main ideas\n"
        "3. Use '### Important Details' for supporting information\n"
        "4. End with '### Key Takeaways' or '### Summary' section\n"
        "5. Use **bold** for key terms and important concepts\n"
        "6. Use *italics* sparingly for emphasis only\n"
        "7. NEVER produce walls of text — break into digestible sections\n"
        "8. Make the output highly scannable and easy to revise from\n\n"
    )
    
    prompt += (
        "FORMATTING RULES:\n"
        "- Use Markdown formatting exclusively.\n"
        "- Use ### for section headings (avoid larger or smaller heading levels).\n"
        "- Use bullet points (-) for lists where it improves clarity.\n"
        "- Do NOT use HTML, inline styles, emojis, or special characters.\n"
        "- Ensure the content is visually scannable, professional, and readable.\n\n"
        "Do not mention these instructions in the final output. Just provide the formatted summary."
    )
    
    return prompt

def get_enhanced_chat_prompt(context, history, personality="neutral", depth="detailed", query_type="document_query"):
    """
    Constructs an enhanced system prompt for grounded, multi-turn chat.
    Supports hybrid intelligence: document-based and general knowledge responses.
    """
    personalities = {
        "neutral": "Clear, balanced, and professional. Focus on direct answers.",
        "academic": "Formal, precise, and scholarly. Use academic terminology and structured reasoning.",
        "companion": "Supportive, patient, and conversational. Act as a helpful study buddy who encourages the user.",
        "humorous": "Light, playful, and slightly sarcastic. Keep it fun but focus on facts.",
        "therapeutic": "Encouraging, calm, and reduces learning anxiety. Supportive companion style."
    }
    
    depth_instructions = {
        "concise": "Provide a brief, direct answer (2-3 sentences max). Get straight to the point.",
        "detailed": "Provide a comprehensive answer with explanations, examples, and context. Use structured formatting.",
        "step-by-step": "Break down the answer into sequential, numbered steps with clear explanations for each step."
    }

    personality_desc = personalities.get(personality, personalities["neutral"])
    depth_desc = depth_instructions.get(depth, depth_instructions["detailed"])

    # Hybrid-aware grounding rules
    if query_type == "general_knowledge":
        grounding_rules = (
            "HYBRID MODE - GENERAL KNOWLEDGE:\n"
            "1. Answer using your general knowledge since this question is not document-specific.\n"
            "2. Provide a helpful, accurate, and informative response.\n"
            "3. At the end, add a brief note: '*Note: This answer is based on general knowledge, not your uploaded documents.*'\n"
            "4. If relevant, suggest how the user could relate this to their study materials.\n"
        )
    else:
        grounding_rules = (
            "GROUNDING RULES - DOCUMENT-BASED:\n"
            "1. Primary source: Use the provided DOCUMENT CONTENT as your main reference.\n"
            "2. If fully answered in documents: Provide a comprehensive answer based solely on the documents.\n"
            "3. If partially answered: Answer what you can from documents, then supplement with general knowledge.\n"
            "4. Clearly distinguish sources:\n"
            "   - For document-based info: Answer naturally (it's implied from context)\n"
            "   - For general knowledge additions: Add '*Additional context:*' before the supplementary info\n"
            "5. Never say 'not in documents' — instead, provide what you know and note the source.\n"
            "6. Quote or refer to specific parts of the document when possible (e.g., 'According to the section on...')\n"
        )

    prompt = (
        f"You are StudyMate AI, an expert educational assistant. Your personality is: {personality_desc}\n\n"
        f"{grounding_rules}\n"
        f"RESPONSE STYLE: {depth_desc}\n\n"
        "FORMATTING RULES:\n"
        "- Use Markdown formatting exclusively.\n"
        "- Use ### for section headings (avoid larger or smaller heading levels).\n"
        "- Use bullet points (-) for lists where it improves clarity.\n"
        "- Use **bold** for key terms, concepts, and important points.\n"
        "- Use *italics* sparingly for emphasis only.\n"
        "- Structure responses logically: Overview → Details → Key Takeaways (when appropriate).\n"
        "- Keep responses scannable and easy to read.\n\n"
        "DOCUMENT CONTENT:\n"
        f"{context}\n\n"
        "CONVERSATION HISTORY:\n"
        f"{history}\n"
    )
    return prompt

def get_enhanced_studyplan_prompt(context, time_per_day=1, total_days=7, skill_level="beginner", focus=["read", "review"], learning_style="interactive", revision_strategy="mixed"):
    """
    Generates a system prompt for document-grounded, personalized study plans.
    """
    focus_str = ", ".join(focus)
    
    prompt = (
        "You are an expert academic advisor and study strategist. Your task is to create a "
        "personalized, document-grounded, multi-day study plan based ONLY on the provided content.\n\n"
        "USER PREFERENCES:\n"
        f"- Time Available: {time_per_day} hours per day.\n"
        f"- Total Days to Prepare: Exactly {total_days} days.\n"
        f"- Skill Level: {skill_level} (tailor the complexity of tasks accordingly).\n"
        f"- Focus Areas: {focus_str} (ensure the plan emphasizes these modes).\n"
        f"- Learning Style: {learning_style} (adjust the instructional delivery style).\n"
        f"- Revision Strategy: {revision_strategy} (incorporate spacing and review sessions).\n\n"
        "PLANNING RULES:\n"
        "1. GROUNDING: Every task must be directly related to concepts in the DOCUMENT CONTENT.\n"
        f"2. STRUCTURE: Break down the content into logical chunks strictly over EXACTLY {total_days} days. Do not overwhelm the user.\n"
        "3. PACING: IMPORTANT - A single day MUST contain multiple smaller, varied activities that sum up to roughly the requested time limit. Do not just schedule one massive task per day.\n"
        "4. TASK TYPES: Use 'read', 'quiz', 'flashcards', or 'review' for each task.\n"
        "5. NO VERBATIM: Describe tasks based on conceptual understanding, not just repeating text.\n"
        "6. REFERENCES: For each task, provide a short text reference or concept name from the document.\n\n"
        "OUTPUT FORMAT (STRICT JSON):\n"
        "Return a JSON object with a 'schedule' key and a 'total_days' key:\n"
        "{\n"
        "  'schedule': [\n"
        "    {\n"
        "      'day': 1,\n"
        "      'task': 'Clear description of what to study/do for the first activity of the day',\n"
        "      'task_type': 'read|quiz|flashcards|review',\n"
        "      'estimated_time': <minutes_as_int>,\n"
        "      'references': ['Short concept name or snippet from doc']\n"
        "    },\n"
        "    {\n"
        "      'day': 1,\n"
        "      'task': 'Description for the second activity of day 1',\n"
        "      'task_type': 'read|quiz|flashcards|review',\n"
        "      'estimated_time': <minutes_as_int>,\n"
        "      'references': ['Short concept name or snippet from doc']\n"
        "    },\n"
        "    ...\n"
        "  ],\n"
        "  'total_days': <total_days_as_int>\n"
        "}\n\n"
        "DOCUMENT CONTENT:\n"
        f"{context}"
    )
    return prompt

def get_enhanced_quiz_prompt(context, num_questions=5, difficulty="medium", include_hints=False, conceptual_focus=False):
    """
    Generates a system prompt for educationally-sound, document-grounded quizzes.
    """
    difficulty_desc = {
        "easy": "Focus on basic recall and direct facts. Distractors should be obviously incorrect but plausible.",
        "medium": "Focus on understanding and application. Questions should require some inference.",
        "hard": "Focus on analysis and synthesis. Questions should be challenging, requiring deep understanding of nuances.",
        "mixed": "Provide a variety of questions across different difficulty levels."
    }
    
    focus_instruction = ""
    if conceptual_focus:
        focus_instruction = "- CONCEPTUAL FOCUS: Generate questions that combine ideas from different parts of the provided content. Focus on 'why' and 'how' rather than just 'what'."
    
    hint_instruction = ""
    if include_hints:
        hint_instruction = "- HINTS: Provide a subtle, conceptually useful hint for each question. Do NOT repeat the answer or verbatim text. The hint should guide the user's thinking."

    prompt = (
        "You are an expert educator and quiz architect. Your task is to generate a high-quality "
        "multiple-choice quiz based ONLY on the provided document content.\n\n"
        "RULES:\n"
        "1. GROUNDING: Every question must be factually supported by the DOCUMENT CONTENT.\n"
        "2. NO HALUCINATIONS: Do not use external knowledge.\n"
        "3. NO VERBATIM: Avoid using exact sentences from the document for questions or options. Paraphrase for better educational assessment.\n"
        f"4. DIFFICULTY: {difficulty_desc.get(difficulty, difficulty_desc['medium'])}\n"
        f"5. QUANTITY: Generate exactly {num_questions} questions.\n"
        f"{focus_instruction}\n"
        f"{hint_instruction}\n"
        "6. SHUFFLE: Ensure the correct answer is randomly placed among the 4 options.\n"
        "7. TRICKY BUT FAIR: Distractors (incorrect options) must be plausible and based on concepts found in the document but misapplied.\n\n"
        "OUTPUT FORMAT (STRICT JSON):\n"
        "Return a JSON object with a 'questions' key containing a list of objects:\n"
        "{\n"
        "  'questions': [\n"
        "    {\n"
        "      'question': 'string',\n"
        "      'options': ['option1', 'option2', 'option3', 'option4'],\n"
        "      'correct_answer': 'string matching exactly one of the options',\n"
        "      'hint': 'string (only if requested)',\n"
        "      'source_reference': 'short description of where this was found (e.g. section title or concept)'\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "DOCUMENT CONTENT:\n"
        f"{context}"
    )
    return prompt

def get_chat_prompt(document_text):
    return f"You are an AI assistant answering questions about the following document content. Use only the provided information.\n\nDOCUMENT CONTENT:\n{document_text}"

def get_flashcard_prompt():
    return (
        "You are an expert pedagogical strategist. Create high-fidelity flashcards using Active Recall.\n"
        "Avoid simple definitions. Use a 'Case Study' or 'Scenario' style for the front.\n"
        "Example Front: 'In a multinational firm, a manager fails to align individual goals with corporate vision. Which management function is failing?'\n"
        "Example Back: 'Organizing / Controlling (depending on context). Alignment is part of the systemic coordination...'\n\n"
        "Return a JSON object with a 'flashcards' key containing a list of objects with 'front' and 'back' keys."
    )

def get_concept_synthesis_prompt(concept_name, dna_essence, concept_type="core_concept", parent_name=None, definition=None):
    """Build strict JSON prompt for concept assets."""
    type_info = f"- Concept Type: {concept_type}"
    parent_info = f"- Parent Topic: {parent_name}" if parent_name else ""
    def_info = f"- Identified Definition: {definition}" if definition else ""

    return f"""You are an educational content writer.
DOCUMENT DNA (Global Context):
{dna_essence}

Focus EXCLUSIVELY on: "{concept_name}".
{type_info}
{parent_info}
{def_info}

Create three assets:

1. FLASHCARDS
 - Use scenario-style fronts and direct backs.
 - Keep each front/back as one clean sentence.

2. SUMMARY
 - Write 3-4 sentences as one plain text paragraph.
 - No bullet points, no headings, no line breaks.

3. QUIZ QUESTIONS
 - Create scenario-based questions.
 - Options must be plain full-text strings, no labels like "A)".

STRICT JSON OUTPUT:
{{
  "summary": "...",
  "flashcards": [ {{"front": "...", "back": "..."}}, ... ],
  "quiz_questions": [ 
    {{
      "question": "...", 
      "options": ["option one text", "option two text", "option three text", "option four text"], 
      "correct_answer": "must match exactly one options item",
      "hint": "...",
      "source_reference": "{concept_name}"
    }} 
  ]
}}

FORMAT RULES:
- Return valid JSON only. No markdown fences. No trailing commas.
- All values must be double-quoted JSON strings.
- Do not add extra keys.
"""

def get_master_synthesis_prompt(ordered_summaries, dna_essence, length="medium", tone="neutral", emphasis="key_points", purpose="revision", structure="paragraph"):
    """
    Produces a cohesive, thematic, graduate-level synthesis of a document 
    based on ordered concept summaries and global DNA.
    Incorporates user-specified personalization attributes.
    """
    length_desc = {
        "short": "Provide a very concise synthesis capturing only the absolute essence.",
        "medium": "Provide a balanced synthesis with enough detail to cover main ideas.",
        "detailed": "Provide an exhaustive master synthesis including supporting details and deep analytical nuances."
    }
    
    tone_desc = {
        "neutral": "Maintain an objective and balanced tone.",
        "academic": "Use formal, academic language suitable for scholarly review.",
        "professional": "Use polished, business-like language suitable for an executive audience.",
        "simple": "Use clear, easy-to-understand language (ELIF style).",
        "friendly": "Use an approachable and engaging tone.",
        "technical": "Use precise, technical language suitable for domain experts."
    }

    emphasis_desc = {
        "key_points": "Focus primarily on main arguments and key takeaways.",
        "definitions": "Ensure all core terms and concepts are weave into the narrative with clear definitions.",
        "results": "Highlight the functional outcomes and core conclusions of the document flow.",
        "steps": "Focus on the procedural logic and sequential transitions between themes.",
        "pros_cons": "Identify and discuss the critical tensions, trade-offs, and contradictions within the document."
    }
    
    purpose_desc = {
        "study_notes": "Format the output as clear study notes for a student.",
        "presentation": "Focus on high-level talking points suitable for a slide presentation.",
        "executive_overview": "Focus on strategic implications and high-level results.",
        "revision": "Optimize the content for quick review and memory recall.",
        "non_technical": "Explain complex concepts in a way accessible to a general audience."
    }
    
    structure_desc = {
        "paragraph": "Deliver the synthesis in cohesive paragraphs.",
        "bullet_points": "Organize the synthesis using clear bullet points to make it scannable.",
        "numbered": "Organize the synthesis as a numbered sequence or list."
    }

    return f"""You are a Master Academic Architect. Your task is to produce a definitive "Master Synthesis" of a document.

DOCUMENT DNA (Global Context):
{dna_essence}

ORDERED CONCEPT SUMMARIES (The raw material):
{ordered_summaries}

PERSONALIZATION REQUIREMENTS:
- Target Length: {length_desc.get(length, length_desc['medium'])}
- Tone Style: {tone_desc.get(tone, tone_desc['neutral'])}
- Primary Emphasis: {emphasis_desc.get(emphasis, emphasis_desc['key_points'])}
- Intended Purpose: {purpose_desc.get(purpose, purpose_desc['revision'])}
- Required Structure: {structure_desc.get(structure, structure_desc['paragraph'])}

INSTRUCTIONS:
1. THEMATIC COHERENCE: Weave these concepts into a cohesive outcome that fulfills the required purpose and structure.
2. STRICT ORDER: You MUST follow the document's original narrative order as provided in the raw material. Each concept should transition logically into the next.
3. PEDAGOGICAL DEPTH: Use precise terminology matching the requested tone.
4. FORMATTING RULES: Base the formatting exactly on the 'Required Structure' above. If bullet points or numbers are requested, you MUST use them. Use headers (###) for major thematic shifts.
5. CONCEPT PRESERVATION: Ensure every key concept from the raw material is represented.

Goal: A definitive, highly structured synthesis that adheres completely to the Personalization Requirements.
"""


def get_mind_map_prompt(context):
    """
    Generates a prompt for creating a hierarchical mind map in JSON format.
    """
    return (
        "You are an expert at information architecture and visual learning. "
        "Your task is to create a hierarchical mind map of the provided document content.\n\n"
        "RULES:\n"
        "1. GROUNDING: Every node must be based on the provided DOCUMENT CONTENT.\n"
        "2. STRUCTURE: Use a clear hierarchical structure. The top level should be the main topic.\n"
        "3. DEPTH: Limit the depth to a maximum of 3-4 levels.\n"
        "4. CONCISENESS: Keep node titles short and descriptive (1-5 words).\n"
        "5. NO EXTERNAL KNOWLEDGE: Do not add information not present in the document.\n\n"
        "OUTPUT FORMAT (STRICT JSON):\n"
        "Return a JSON object following this exact structure:\n"
        "{\n"
        "  \"title\": \"Main Topic\",\n"
        "  \"children\": [\n"
        "    {\n"
        "      \"title\": \"Subtopic 1\",\n"
        "      \"children\": [\n"
        "        { \"title\": \"Point 1.1\" },\n"
        "        { \"title\": \"Point 1.2\" }\n"
        "      ]\n"
        "    },\n"
        "    {\n"
        "      \"title\": \"Subtopic 2\",\n"
        "      \"children\": [\n"
        "        { \"title\": \"Point 2.1\" }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "DOCUMENT CONTENT:\n"
        f"{context}"
    )
