import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../../../context/StudyContext';
import useSpeech from '../../../hooks/useSpeech';

const Icons = {
  Speaker: ({ active }) => (
    <svg className={`w-4 h-4 ${active ? 'text-cosmic-purple-light animate-bounce' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
  )
};

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    question: "What is a Finite State Machine (FSM)?",
    options: [
      "A mathematical model of computation",
      "A type of physical hardware",
      "A software design pattern only",
      "A type of database"
    ],
    correct: 0
  }
];

const QuizPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quizzes } = useStudy();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900); 
  const [answers, setAnswers] = useState([]);
  const { speak, isSpeaking } = useSpeech();

  const quiz = quizzes.find((q) => q.id === parseInt(id));

  const activeQuestions = quiz?.questions && Array.isArray(quiz.questions) ? quiz.questions : DEFAULT_QUESTIONS;

  const readFullQuestion = () => {
    const q = activeQuestions[currentQuestion];
    const optionsText = q.options.map((opt, i) => `Option ${i + 1}: ${opt}`).join('. ');
    const fullText = `${q.question}. The options are: ${optionsText}`;
    speak(fullText);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    const isCorrect = index === activeQuestions[currentQuestion].correct;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setAnswers([...answers, { questionId: activeQuestions[currentQuestion].id, answer: index, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      navigate(`/dashboard/quizzes/${id}/result`, { state: { score, total: activeQuestions.length, answers } });
    }
  };

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  const progress = ((currentQuestion + 1) / activeQuestions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-heading">{quiz.title}</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={readFullQuestion}
              className="flex items-center gap-2 px-3 py-1.5 bg-cosmic-purple/10 border border-cosmic-purple/20 rounded-lg text-cosmic-purple-light text-xs hover:bg-cosmic-purple/20 transition-all cursor-pointer"
              title="Read Question & Options"
            >
              <Icons.Speaker active={isSpeaking} />
              <span>Read Full Question</span>
            </button>
            <span className="text-cosmic-purple-light font-mono">⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
        <div className="w-full bg-cosmic-blue/30 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-gradient-to-r from-cosmic-purple to-cosmic-purple-light h-2 rounded-full"
          />
        </div>
        <p className="text-gray-400 mt-2 text-sm font-medium">
          Question {currentQuestion + 1} of {activeQuestions.length}
        </p>
      </div>

      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card-glass p-8 border-white/5"
      >
        <div className="flex items-start justify-between mb-6 gap-4">
          <h3 className="text-2xl font-heading flex-1 text-white">{activeQuestions[currentQuestion].question}</h3>
          <button
            onClick={readFullQuestion}
            className="p-2.5 backdrop-blur-sm bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            title="Read Question & Options"
          >
            <Icons.Speaker active={isSpeaking} />
          </button>
        </div>
        <div className="space-y-3">
          {activeQuestions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={selectedAnswer !== null}
              className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between gap-4 group ${selectedAnswer === index
                ? selectedAnswer === activeQuestions[currentQuestion].correct
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-red-500/50 bg-red-500/10'
                : 'border-white/5 hover:border-cosmic-purple/30 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
            >
              <span className="flex-1 text-gray-200 group-hover:text-white transition-colors">{option}</span>
              <div
                onClick={(e) => { e.stopPropagation(); speak(option); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer opacity-40 group-hover:opacity-100"
                title="Read Option"
              >
                <Icons.Speaker active={isSpeaking} />
              </div>
            </button>
          ))}
        </div>

        {selectedAnswer !== null && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            className="btn-primary mt-8 w-full py-4 rounded-xl font-semibold shadow-lg shadow-cosmic-purple/20"
          >
            {currentQuestion < activeQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};

export default QuizPlayer;

