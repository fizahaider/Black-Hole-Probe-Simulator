import { createContext, useContext, useState } from 'react';
import { MOCK_QUIZZES, MOCK_FLASHCARDS, MOCK_NOTES } from '../utils/constants';

const StudyContext = createContext(null);

export const StudyProvider = ({ children }) => {
  const [quizzes, setQuizzes] = useState(MOCK_QUIZZES);
  const [flashcards, setFlashcards] = useState(MOCK_FLASHCARDS);
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [studyPlans, setStudyPlans] = useState([]);
  const [history, setHistory] = useState([]);

  const addQuiz = (quiz) => {
    setQuizzes((prev) => [...prev, quiz]);
  };

  const addFlashcard = (flashcard) => {
    setFlashcards((prev) => [...prev, flashcard]);
  };

  const addNote = (note) => {
    setNotes((prev) => [...prev, note]);
  };

  const addStudyPlan = (plan) => {
    setStudyPlans((prev) => [...prev, plan]);
  };

  const addToHistory = (activity) => {
    setHistory((prev) => [activity, ...prev]);
  };

  const value = {
    quizzes,
    flashcards,
    notes,
    studyPlans,
    history,
    addQuiz,
    addFlashcard,
    addNote,
    addStudyPlan,
    addToHistory,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within StudyProvider');
  }
  return context;
};

