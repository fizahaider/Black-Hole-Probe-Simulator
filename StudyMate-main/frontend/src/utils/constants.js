export const APP_NAME = 'Studymate';

export const NAV_LINKS = [
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
];

export const FEATURES = [
  {
    title: 'AI Study Assistant',
    description: 'Get instant help with your studies from our AI-powered chatbot available 24/7.',
    icon: '🤖',
  },
  {
    title: 'Smart OCR',
    description: 'Upload images or PDFs and convert them into editable notes automatically.',
    icon: '📸',
  },
  {
    title: 'Practice Quizzes',
    description: 'Generate quizzes from your notes and test your knowledge instantly.',
    icon: '📝',
  },
  {
    title: 'Flashcards',
    description: 'Create and study with AI-generated flashcards for better retention.',
    icon: '🎴',
  },
  {
    title: 'Study Planner',
    description: 'Plan your study sessions with AI-powered scheduling suggestions.',
    icon: '📅',
  },
  {
    title: 'Student Chat',
    description: 'Connect with other students for collaborative learning and doubt solving.',
    icon: '💬',
  },
];

export const MOCK_QUIZZES = [
  {
    id: 1,
    title: 'JavaScript Fundamentals',
    subject: 'Programming',
    questions: 10,
    duration: 15,
    difficulty: 'Easy',
  },
  {
    id: 2,
    title: 'React Hooks Quiz',
    subject: 'Web Development',
    questions: 15,
    duration: 20,
    difficulty: 'Medium',
  },
  {
    id: 3,
    title: 'Data Structures',
    subject: 'Computer Science',
    questions: 20,
    duration: 30,
    difficulty: 'Hard',
  },
];

export const MOCK_FLASHCARDS = [
  {
    id: 1,
    title: 'React Concepts',
    cards: 25,
    subject: 'Web Development',
  },
  {
    id: 2,
    title: 'Biology Terms',
    cards: 40,
    subject: 'Biology',
  },
  {
    id: 3,
    title: 'History Dates',
    cards: 30,
    subject: 'History',
  },
];

export const MOCK_NOTES = [
  {
    id: 1,
    title: 'React Component Lifecycle',
    subject: 'Web Development',
    createdAt: '2024-01-15',
    content: 'Summary of React component lifecycle methods...',
  },
  {
    id: 2,
    title: 'Photosynthesis Process',
    subject: 'Biology',
    createdAt: '2024-01-14',
    content: 'Detailed notes on photosynthesis...',
  },
];

export const MOCK_CHAT_MESSAGES = [
  {
    id: 1,
    sender: 'AI Assistant',
    message: 'Hello! How can I help you with your studies today?',
    timestamp: new Date(),
    isAI: true,
  },
];

