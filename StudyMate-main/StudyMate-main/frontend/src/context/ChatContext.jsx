import { createContext, useContext, useState } from 'react';
import { MOCK_CHAT_MESSAGES } from '../utils/constants';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState(MOCK_CHAT_MESSAGES);
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      sender: 'You',
      message,
      timestamp: new Date(),
      isAI: false,
    };
    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'AI Assistant',
        message: generateAIResponse(message),
        timestamp: new Date(),
        isAI: true,
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (userMessage) => {
    const msg = userMessage.toLowerCase().trim();

    if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('tell me about yourself')) {
      return "I'm StudyMate's AI Study Assistant — built to help you learn smarter, not harder. I can answer questions, explain concepts, help you plan study sessions, and guide you through the platform's features. Think of me as your always-available study partner.";
    }

    if (msg.includes('how are you') || msg.includes('how r u') || msg.includes('how do you do') || msg.includes('you okay') || msg.includes('you good')) {
      return "I'm doing great, thanks for asking! Always ready to help you study. What are you working on today?";
    }

    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening') || msg.includes('good afternoon')) {
      return "Hey! Good to see you here. I'm your StudyMate AI assistant — ask me anything about the platform, your studies, or how to get started. I'm here to help.";
    }

    if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('talk later')) {
      return "Take care! Come back whenever you need help studying. Good luck with your sessions!";
    }

    if (msg.includes('thank') || msg.includes('thanks') || msg.includes('appreciate')) {
      return "You're welcome! That's what I'm here for. Let me know if you need anything else.";
    }

    if (msg.includes('paid') || msg.includes('price') || msg.includes('pricing') || msg.includes('cost') || msg.includes('subscription') || msg.includes('free') || msg.includes('charge')) {
      return "StudyMate is completely free to use. No subscriptions, no hidden charges. All features — AI summaries, flashcards, quizzes, mind maps, and more — are available to every user at no cost.";
    }

    if (msg.includes('how can you help') || msg.includes('what can you do') || msg.includes('help me') || msg.includes('what do you do')) {
      return "Here's what I can do for you:\n\n• Answer study questions across subjects\n• Explain concepts in simple terms\n• Help you plan study sessions\n• Guide you through StudyMate's features\n• Give tips on flashcards, quizzes, and note-taking\n\nJust ask — I'll do my best to help.";
    }

    if (msg.includes('feature') || msg.includes('what does studymate') || msg.includes('what is studymate') || msg.includes('platform')) {
      return "StudyMate is an AI-powered study platform with these core features:\n\n• Document upload and AI summarization\n• Flashcard generation from your notes\n• Auto-generated quizzes for self-testing\n• Mind maps to visualize concepts\n• Knowledge Spaces to organize your subjects\n• Real-time chat with study peers\n\nAll of it in one place, free of charge.";
    }

    if (msg.includes('quiz') || msg.includes('test') || msg.includes('exam') || msg.includes('mcq')) {
      return "StudyMate can generate quizzes directly from your uploaded documents. Upload a PDF or notes, open the Quiz tool in your Study Space, and the AI will create questions based on your content. It's a great way to test yourself before an exam.";
    }

    if (msg.includes('flashcard') || msg.includes('flash card') || msg.includes('revision card')) {
      return "Flashcards on StudyMate are auto-generated from your documents. Upload your notes, select the Flashcards tool, and the AI builds a deck for you. You can flip through them to reinforce key concepts — great for spaced repetition.";
    }

    if (msg.includes('summary') || msg.includes('summarize') || msg.includes('summarise') || msg.includes('tldr')) {
      return "The Summary tool reads your uploaded document and generates a clean, concise summary. Useful for quickly reviewing long PDFs or dense notes without reading everything from scratch.";
    }

    if (msg.includes('mind map') || msg.includes('mindmap') || msg.includes('concept map')) {
      return "The Mind Map feature visually maps out the key concepts and relationships in your document. It helps you see the big picture of a topic before diving into details — really useful for complex subjects.";
    }

    if (msg.includes('upload') || msg.includes('document') || msg.includes('pdf') || msg.includes('file')) {
      return "You can upload PDFs, DOCX, or text files to your Study Space. Once uploaded, the AI can summarize, generate flashcards, create quizzes, or build a mind map from your content. Just head to your Study Space and drop your files in.";
    }

    if (msg.includes('space') || msg.includes('knowledge space') || msg.includes('workspace')) {
      return "Knowledge Spaces are like dedicated folders for each subject or project. Create a space, upload your documents into it, and all AI tools work within that context. It keeps your study material organized and easy to access.";
    }

    if (msg.includes('chat') || msg.includes('friend') || msg.includes('group') || msg.includes('message')) {
      return "StudyMate has a built-in peer chat feature. You can start direct conversations or create group chats with friends to collaborate on study sessions. Find it in the Chat section of your dashboard.";
    }

    if (msg.includes('note') || msg.includes('notes') || msg.includes('writing')) {
      return "Upload your notes as documents and let the AI work with them — summaries, flashcards, quizzes, all generated from your own material. The more structured your notes, the better the output.";
    }

    if (msg.includes('study plan') || msg.includes('schedule') || msg.includes('plan my') || msg.includes('planning')) {
      return "A good study plan breaks your material into manageable sessions with clear goals. Use the Planner tool in your Study Space to structure your work. Review often, space out sessions, and track your progress.";
    }

    if (msg.includes('get started') || msg.includes('how to start') || msg.includes('new here') || msg.includes('beginning')) {
      return "Getting started is simple:\n\n1. Create an account and log in\n2. Create a Knowledge Space for your subject\n3. Upload your study documents\n4. Use the tools — Summary, Flashcards, Quiz, or Mind Map\n\nThe AI handles the heavy lifting.";
    }

    if (msg.includes('login') || msg.includes('sign up') || msg.includes('register') || msg.includes('account')) {
      return "You can sign up for a free StudyMate account using the Get Started button at the top of the page. Once you're in, you'll have full access to all features immediately — no waitlist, no payment required.";
    }

    if (msg.includes('safe') || msg.includes('privacy') || msg.includes('data') || msg.includes('secure')) {
      return "StudyMate takes your data seriously. Your uploaded documents and study data are used only to power your experience and are not shared with third parties. You're in control of your content.";
    }

    if (msg.includes('bug') || msg.includes('issue') || msg.includes('not working') || msg.includes('problem') || msg.includes('error')) {
      return "Sorry to hear something isn't working. Try refreshing the page first. If the issue persists, reach out to the StudyMate team through the Contact page — they'll get it sorted.";
    }

    if (msg.includes('contact') || msg.includes('support') || msg.includes('team') || msg.includes('reach out')) {
      return "You can reach the StudyMate team through the Contact page linked in the footer. For general questions, feel free to keep asking me — I'm available anytime.";
    }

    const fallbacks = [
      "That's a good question. Could you give me a bit more context so I can help you better?",
      "I want to make sure I give you the right answer — can you rephrase or expand on what you're looking for?",
      "I'm not sure I fully caught that. Try asking in a different way and I'll do my best to help.",
      "Interesting — I might need a bit more detail to answer that well. What specifically are you trying to figure out?",
      "I'm here to help with studying and using StudyMate. Could you tell me more about what you need?",
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const value = {
    messages,
    isOpen,
    sendMessage,
    toggleChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};