# Studymate – AI-Powered Personal Learning Platform

Studymate is an intelligent study companion that helps students learn smarter, not harder. 
By leveraging cutting-edge AI, Studymate allows users to upload their notes and documents 
and instantly get auto-generated quizzes, flashcards, summaries, and an interactive AI 
tutor — all personalized to their learning material. Whether you're preparing for an exam 
or trying to retain complex topics, Studymate adapts to your needs and makes studying 
more effective and engaging.

---

## Features Implemented

### Core Learning Features
- **Knowledge Spaces** — Organize materials into subjects/projects with isolated document grounding.
- **Prep Hub** — Goal-oriented roadmapping (Interviews, Exams) with live resource curation.
- **Sequential Study Planner** — Day-by-day learning schedules with task enforcement.
- **AI Chatbot Tutor (RAG)** — Conversational interface grounded in document content via Groq LLM.
- **Advanced Summarization** — Master Synthesis logic for sequence-based document overviews.
- **Conceptual Mindmaps** — Visual hierarchy of document topics for structural understanding.
- **Interactive Flashcards** — Mastery-based study decks with flip-card interaction.
- **Dynamic Quiz Engine** — Auto-generated MCQs/Short answers with instant feedback and explanations.

### Analytics & Gamification
- **Analytics & Mastery** — Learning Velocity tracking, Mastery Distribution, and Quiz Trends.
- **Gamification & Streaks** — Consistency tracking with daily streaks and activity heatmaps.
- **Learning Profiles** — Personalized AI personality and depth preferences.

### Communication & Collaboration
- **Real-Time Friends Chat** — WebSocket-powered messaging with study groups.
- **Study Sessions** — Timed collaborative study sessions with participants.
- **File Sharing** — Share documents directly in chat conversations.
- **Message Reactions** — Emoji reactions on messages.
- **Typing Indicators & Presence** — Real-time online status.

### Voice & Accessibility
- **Text-to-Speech** — Listen to your study content via ElevenLabs TTS.
- **Speech-to-Text** — Interact with the platform using voice via Deepgram STT.

### Technical Features
- **JWT Authentication** — Secure user registration and login with token-based auth.
- **Background Processing** — Async task handling with Celery for heavy AI operations.
- **Interactive API Docs** — Auto-generated docs via DRF Spectacular (Swagger/Redoc).
- **Real-Time Updates** — Django Channels with Redis for WebSocket communication.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                     │
│                    (Browser - React 18 + Vite)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                   │
│              Vercel CDN / React 18 / Tailwind CSS                       │
│  - Dashboard, Knowledge Spaces, Chat, Study Tools, Analytics            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│      REST API (HTTP)            │   │   WEBSOCKET (Real-time)         │
│      Django REST Framework      │   │   Django Channels + Redis       │
└─────────────────────────────────┘   └─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                                    │
│              Django 5.1 + Daphne ASGI Server                            │
│  - Authentication (JWT)                                                  │
│  - RAG Pipeline (AI Chat)                                               │
│  - Document Processing                                                  │
│  - Quiz/Flashcard Generation                                            │
│  - Analytics                                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────┬───────────┬───┴───┬───────────┬───────────┐
        ▼           ▼           ▼       ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│PostgreSQL │ │  Redis    │ │Groq   │ │ElevenLabs│ │Deepgram │ │ Celery  │
│ Database  │ │Cache/Broker│ │ LLM   │ │   TTS   │ │  STT    │ │ Worker  │
└───────────┘ └───────────┘ └───────┘ └─────────┘ └─────────┘ └─────────┘
```

### The RAG Pipeline (AI Chat)
Studymate uses a **Retrieval-Augmented Generation** pipeline:
1. **Document Ingestion** — Upload PDF → Text Extraction → Semantic Chunking
2. **Dual Indexing** — FAISS (vector) + BM25 (keyword) for hybrid search
3. **Query Processing** — Rewrite follow-up questions using conversation history
4. **Hybrid Retrieval** — Combine semantic + keyword search with re-ranking
5. **LLM Generation** — Groq Llama-3.3 generates grounded responses

---

## Technologies Used

| Layer | Technology |
|---|---|
| **Backend** | Django 5.1, Django REST Framework, Django Channels, Celery |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide, Framer Motion |
| **Database** | PostgreSQL |
| **Authentication** | JWT (SimpleJWT) |
| **AI / ML** | Groq API (Llama-3.3), LangChain, FAISS, Sentence Transformers, BM25 |
| **Voice** | ElevenLabs (TTS), Deepgram (STT) |
| **Real-Time** | Django Channels, Redis (WebSocket pub/sub) |
| **Task Queue** | Celery, Redis |
| **Deployment** | Docker, Docker Compose, Vercel, Railway |

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/register/` — User registration
- `POST /api/auth/login/` — JWT token obtain
- `POST /api/auth/refresh/` — Token refresh
- `GET /api/auth/me/` — Current user profile

### RAG / Documents
- `POST /api/rag/documents/upload/` — Upload document
- `GET /api/rag/documents/` — List documents
- `POST /api/rag/chat/` — AI chat with RAG
- `GET /api/rag/chat/history/` — Conversation history
- `POST /api/rag/rebuild-index/` — Rebuild search index

### Chat (Real-Time)
- `GET /api/chat/conversations/` — List conversations
- `POST /api/chat/conversations/` — Create conversation
- `GET /api/chat/messages/` — Get messages
- `WebSocket /ws/chat/<id>/` — Real-time messaging

### Study Tools
- `POST /api/document-ai/quiz/` — Generate quiz
- `POST /api/document-ai/summary/` — Generate summary
- `POST /api/document-ai/mindmap/` — Generate mindmap
- `POST /api/document-ai/flashcards/` — Generate flashcards

### Analytics
- `GET /api/analytics/dashboard/` — Dashboard stats
- `GET /api/analytics/activity/` — Activity history
- `GET /api/analytics/mastery/` — Mastery distribution

---

## Setup Instructions

### Prerequisites

Make sure you have the following installed:
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis
- Docker & Docker Compose *(optional)*

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/fatiima-noor/StudyMate.git
cd StudyMate
```

---

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
cd app
python manage.py migrate

# Create a superuser (optional, for admin access)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

---

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend
npm install

# Start the development server
npm run dev
```

---

### 4. Running with Docker *(Alternative)*

```bash
# Backend
cd backend
docker compose up --build

# Frontend (separate terminal)
cd frontend
docker compose up --build
```

---

### 5. Access the Application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Admin Panel | http://localhost:8000/admin |

---

## Usage Examples

### Register & Log In
1. Navigate to `http://localhost:5173`.
2. Click **Sign Up** and create your account.
3. Log in with your credentials — a JWT token is issued and stored automatically.

### Create Knowledge Spaces
1. Go to **Study Space** from the sidebar.
2. Create a new space (e.g., "Physics 101") to isolate your documents.
3. Toggle between spaces to keep your learning grounded in relevant material.

### Upload & Study
1. In a Knowledge Space, click **Upload Document** to add PDFs.
2. Once indexed (green tick), use the **Tools Grid** to launch Summaries, Quizzes, or Mindmaps.
3. Chat with your document using the AI Tutor.

### Use the Study Planner
1. From any Knowledge Space, click **Generate Study Plan**.
2. Follow the daily tasks sequentially to build your mastery.
3. Track your daily **Streak** and **Learning Velocity** on the Home dashboard.

### Prep Hub Roadmaps
1. Navigate to **Prep Hub** from the sidebar.
2. Enter a topic (e.g., "Python Interviews") and define your goal.
3. Follow the mission roadmap and convert it into a detailed Study Plan.

### Friends Chat & Study Sessions
1. Go to **Chat** from the sidebar.
2. Create a new conversation or join an existing one.
3. Start a **Study Session** to collaborate with friends in real-time.
4. Share documents and study together with a timer.

### Voice Features
- Use the **microphone icon** in the AI Tutor to speak your queries.
- Use the **speaker icon** on any AI response to hear it read aloud.

---

## Documentation

For a detailed guide on all features refer to the:
- [StudyMate User Manual](studymate_user_manual.docx)

---

## Known Issues / TODOs

- [ ] Multi Modal Document Uploading (Images/Word)
- [ ] Advanced Profiling
- [ ] Mobile/IOS compatibility
