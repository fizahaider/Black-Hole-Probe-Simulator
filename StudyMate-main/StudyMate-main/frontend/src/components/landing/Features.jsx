import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  const features = [
    {
      title: 'AI Study Assistant',
      description: 'Get instant help 24/7 from our AI-powered chatbot. Ask questions, get explanations, and receive personalized study guidance.',
      longDescription: 'Our intelligent AI assistant understands context, remembers your learning history, and provides tailored explanations. Whether you\'re stuck on a concept at 2 AM or need quick clarification before an exam, your AI tutor is always ready to help. It can break down complex topics, provide step-by-step solutions, and adapt to your learning style.',
      visual: 'chatbot',
    },
    {
      title: 'Smart OCR',
      description: 'Upload images or PDFs and convert them into editable notes automatically. Transform handwritten notes into digital content instantly.',
      longDescription: 'Our advanced OCR technology recognizes text from any image quality, supports multiple languages, and preserves formatting. Simply snap a photo of your notes, textbook pages, or assignment sheets and watch them transform into searchable, editable digital content in seconds. Perfect for digitizing your entire study library.',
      visual: 'ocr',
    },
    {
      title: 'Practice Quizzes',
      description: 'Generate quizzes from your notes and test your knowledge. Get immediate feedback and track your progress.',
      longDescription: 'Create unlimited practice quizzes from any content. Our AI generates questions of varying difficulty levels, tracks your performance over time, and identifies areas that need more focus. Get detailed analytics on your strengths and weaknesses, and perfect for exam preparation with instant scoring and explanations.',
      visual: 'quiz',
    },
    {
      title: 'Flashcards',
      description: 'Create AI-generated flashcards for better retention. Use spaced repetition to optimize your learning.',
      longDescription: 'Transform any content into interactive flashcards automatically. Our system uses proven spaced repetition techniques to help you remember information longer. Study smarter, not harder. The algorithm adapts to your performance, showing difficult cards more frequently until you master them.',
      visual: 'flashcards',
    },
    {
      title: 'Study Planner',
      description: 'Plan study sessions with AI-powered scheduling. Balance multiple subjects and optimize your time effectively.',
      longDescription: 'Get personalized study schedules based on your goals, deadlines, and learning pace. Our AI analyzes your workload and creates optimal study plans that adapt to your progress and schedule changes. Never miss a deadline and maintain a healthy study-life balance with intelligent time management.',
      visual: 'planner',
    },
    {
      title: 'Student Chat',
      description: 'Connect with other students for collaborative learning. Form study groups and learn together in real-time.',
      longDescription: 'Join study groups, share notes, and collaborate with peers. Our real-time chat platform makes it easy to discuss concepts, solve problems together, and build a supportive learning community. Connect with students studying the same subjects, exchange ideas, and learn from each other.',
      visual: 'chat',
    },
  ];

  
  const ChatbotVisual = ({ isActive }) => {
    const [messages, setMessages] = useState([
      { text: 'Hello! How can I help you today?', isAI: true },
    ]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
      if (isActive) {
        const timer1 = setTimeout(() => {
          setMessages((prev) => [...prev, { text: 'Explain quantum physics?', isAI: false }]);
          setIsTyping(true);
        }, 2000);

        const timer2 = setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { text: 'Quantum physics studies matter at atomic scales...', isAI: true },
          ]);
        }, 4000);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else {
        setMessages([{ text: 'Hello! How can I help you today?', isAI: true }]);
        setIsTyping(false);
      }
    }, [isActive]);

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-5 flex flex-col overflow-hidden">
        {}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-purple-light rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.3,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 8px rgba(162, 155, 254, 0.6)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-2 mb-4 pb-4 border-b border-cosmic-purple/20">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
          <span className="text-sm font-medium text-[var(--text-primary)]">AI Assistant</span>
        </div>
        <div className="relative z-10 flex-1 overflow-hidden space-y-3">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-lg ${
                  msg.isAI
                    ? 'bg-cosmic-blue/60 backdrop-blur-sm text-white border border-cosmic-purple/30'
                    : 'bg-cosmic-purple/50 backdrop-blur-sm text-white border border-cosmic-purple/40'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1.5 pl-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-cosmic-purple-light rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  // OCR Visual Component
  const OCRVisual = ({ isActive }) => {
    const [progress, setProgress] = useState(0);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
      if (isActive) {
        setScanning(true);
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              setScanning(false);
              return 100;
            }
            return prev + 3;
          });
        }, 80);
        return () => clearInterval(interval);
      } else {
        setProgress(0);
        setScanning(false);
      }
    }, [isActive]);

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Galaxy background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-neon rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.4,
              }}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 2, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 10px rgba(0, 212, 255, 0.6)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-sm space-y-6">
          <motion.div
            animate={scanning ? { y: [0, 200, 0] } : {}}
            transition={{ duration: 2, repeat: scanning ? Infinity : 0 }}
            className="relative"
          >
            <div className="bg-cosmic-blue/60 rounded-xl p-6 border border-cosmic-purple/30 backdrop-blur-sm">
              <div className="h-40 bg-gradient-to-br from-cosmic-purple/30 to-cosmic-blue/20 rounded-lg flex items-center justify-center border-2 border-dashed border-cosmic-purple/40">
                <div className="text-center">
                  <div className="text-3xl mb-2 opacity-60">📄</div>
                  <div className="text-xs text-[var(--text-secondary)]">Document</div>
                </div>
              </div>
              {scanning && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cosmic-purple-light/20 to-transparent"
                  animate={{ y: [0, 200, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Processing...</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-cosmic-blue/50 rounded-full h-2.5 overflow-hidden border border-cosmic-purple/20">
              <motion.div
                className="h-full bg-gradient-to-r from-cosmic-purple via-cosmic-purple-light to-cosmic-neon"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  boxShadow: '0 0 20px rgba(108, 92, 231, 0.6)',
                }}
              />
            </div>
            {progress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-xs text-green-400"
              >
                <span>✓</span>
                <span>Text extracted successfully</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Quiz Visual Component
  const QuizVisual = ({ isActive }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const questions = [
      { q: 'What is React?', options: ['Library', 'Framework', 'Language', 'Database'], correct: 0 },
      { q: 'Which hook manages state?', options: ['useState', 'useEffect', 'useContext', 'useMemo'], correct: 0 },
    ];

    useEffect(() => {
      if (isActive) {
        const timer1 = setTimeout(() => {
          setSelectedAnswer(0);
        }, 2500);
        const timer2 = setTimeout(() => {
          setCurrentQuestion(1);
          setSelectedAnswer(null);
        }, 5000);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else {
        setCurrentQuestion(0);
        setSelectedAnswer(null);
      }
    }, [isActive]);

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-6 overflow-hidden">
        {/* Galaxy background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-cosmic-purple-light rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.5,
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                rotate: 360,
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 12px rgba(162, 155, 254, 0.7)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--text-secondary)]">Question {currentQuestion + 1} of 2</div>
            <div className="text-xs text-cosmic-purple-light font-semibold">Score: {currentQuestion}/2</div>
          </div>
          <h4 className="text-base font-semibold text-[var(--text-primary)] leading-relaxed">{questions[currentQuestion].q}</h4>
          <div className="space-y-2.5">
            {questions[currentQuestion].options.map((opt, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedAnswer(idx)}
                className={`w-full p-3.5 text-left text-sm rounded-xl border transition-all ${
                  selectedAnswer === idx
                    ? 'bg-cosmic-purple/50 border-cosmic-purple-light text-white shadow-lg shadow-cosmic-purple/30'
                    : 'bg-cosmic-blue/40 border-cosmic-purple/20 text-[var(--text-secondary)] hover:border-cosmic-purple/40'
                }`}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Flashcards Visual Component
  const FlashcardsVisual = ({ isActive }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [cardIndex, setCardIndex] = useState(0);

    useEffect(() => {
      if (isActive) {
        const flipTimer = setInterval(() => {
          setIsFlipped((prev) => !prev);
        }, 3000);
        
        const cardTimer = setInterval(() => {
          setCardIndex((prev) => (prev + 1) % 3);
          setIsFlipped(false);
        }, 6000);
        
        return () => {
          clearInterval(flipTimer);
          clearInterval(cardTimer);
        };
      } else {
        setIsFlipped(false);
        setCardIndex(0);
      }
    }, [isActive]);

    const cards = [
      { front: 'React', back: 'A JavaScript library for building user interfaces' },
      { front: 'useState', back: 'Hook for managing component state' },
      { front: 'JSX', back: 'JavaScript XML syntax extension' },
    ];

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-6 flex items-center justify-center overflow-hidden">
        {/* Galaxy background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-neon rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.4,
              }}
              animate={{
                opacity: [0.4, 0.9, 0.4],
                scale: [1, 1.8, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <motion.div
            className="w-72 h-48 bg-gradient-to-br from-cosmic-blue/60 to-cosmic-purple/40 rounded-2xl border-2 border-cosmic-purple/40 p-8 flex items-center justify-center cursor-pointer shadow-2xl relative overflow-hidden"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/20 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-3">{cards[cardIndex].front}</div>
                <div className="text-xs text-[var(--text-secondary)]">Tap to flip</div>
              </div>
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center p-6"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="text-sm text-[var(--text-secondary)] text-center leading-relaxed">{cards[cardIndex].back}</div>
            </div>
          </motion.div>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap">
            Card {cardIndex + 1} of 3
          </div>
        </div>
      </div>
    );
  };

  // Planner Visual Component
  const PlannerVisual = ({ isActive }) => {
    const [selectedDay, setSelectedDay] = useState(0);
    const [tasks, setTasks] = useState([
      { name: 'Math', duration: '2h', color: 'from-cosmic-purple to-cosmic-purple-light' },
      { name: 'Physics', duration: '1.5h', color: 'from-cosmic-neon to-cosmic-purple' },
      { name: 'Chemistry', duration: '1h', color: 'from-cosmic-purple-light to-cosmic-neon' },
    ]);

    useEffect(() => {
      if (isActive) {
        const timer = setInterval(() => {
          setSelectedDay((prev) => (prev + 1) % 7);
        }, 2500);
        return () => clearInterval(timer);
      }
    }, [isActive]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-6 overflow-hidden">
        {/* Galaxy background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-purple-light rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.4,
              }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2.5 + Math.random() * 1.5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 8px rgba(162, 155, 254, 0.6)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex gap-2">
            {days.map((day, idx) => (
              <motion.button
                key={idx}
                animate={{
                  backgroundColor: selectedDay === idx ? 'rgba(108, 92, 231, 0.4)' : 'rgba(26, 26, 46, 0.3)',
                  borderColor: selectedDay === idx ? 'rgba(162, 155, 254, 0.5)' : 'rgba(108, 92, 231, 0.2)',
                  scale: selectedDay === idx ? 1.05 : 1,
                }}
                className="flex-1 p-2.5 rounded-xl border text-xs font-medium text-[var(--text-secondary)] transition-all"
              >
                {day}
              </motion.button>
            ))}
          </div>
          <div className="space-y-2.5">
            {tasks.map((task, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`p-4 rounded-xl bg-gradient-to-r ${task.color} bg-opacity-20 border border-cosmic-purple/30 backdrop-blur-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${task.color}`}></div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{task.name}</span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{task.duration}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Chat Visual Component
  const ChatVisual = ({ isActive }) => {
    const [messages, setMessages] = useState([
      { text: 'Hey! Can anyone help with calculus?', sender: 'Izen' },
    ]);

    useEffect(() => {
      if (isActive) {
        const timer = setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { text: 'Sure! What do you need help with?', sender: 'Sarah' },
          ]);
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        setMessages([{ text: 'Hey! Can anyone help with calculus?', sender: 'Izen' }]);
      }
    }, [isActive]);

    return (
      <div className="relative w-full h-96 bg-gradient-to-br from-cosmic-blue/40 to-cosmic-purple/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-3xl p-5 flex flex-col overflow-hidden">
        {/* Galaxy background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-neon rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0.4,
              }}
              animate={{
                opacity: [0.4, 0.9, 0.4],
                scale: [1, 1.6, 1],
              }}
              transition={{
                duration: 2.5 + Math.random() * 1.5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-3 mb-4 pb-4 border-b border-cosmic-purple/20">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-cosmic-purple to-cosmic-purple-light border-2 border-cosmic-blue/50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--text-primary)]">Study Group</div>
            <div className="text-[10px] text-[var(--text-secondary)]">3 online</div>
          </div>
        </div>
        <div className="relative z-10 flex-1 space-y-3 overflow-hidden">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cosmic-purple to-cosmic-purple-light flex-shrink-0 border border-cosmic-purple/40"></div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-secondary)] mb-1.5">{msg.sender}</div>
                <div className="p-3 bg-cosmic-blue/50 backdrop-blur-sm rounded-xl text-sm text-[var(--text-primary)] border border-cosmic-purple/20 shadow-lg">
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderVisual = (visualType, isActive) => {
    switch (visualType) {
      case 'chatbot':
        return <ChatbotVisual isActive={isActive} />;
      case 'ocr':
        return <OCRVisual isActive={isActive} />;
      case 'quiz':
        return <QuizVisual isActive={isActive} />;
      case 'flashcards':
        return <FlashcardsVisual isActive={isActive} />;
      case 'planner':
        return <PlannerVisual isActive={isActive} />;
      case 'chat':
        return <ChatVisual isActive={isActive} />;
      default:
        return null;
    }
  };

  return (
    <section id="features" ref={sectionRef} className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Minimal galaxy background - subtle nebula effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cosmic-purple/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cosmic-neon/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />
        {/* Subtle particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-cosmic-purple-light rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="section-title text-[var(--text-primary)] font-heading mb-4">What We Offer</h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Everything you need to excel in your studies, all in one place.
          </p>
        </motion.div>

        <div className="space-y-32">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0;
            const isActive = activeFeature === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-200px' }}
                transition={{ duration: 0.8 }}
                onViewportEnter={() => setActiveFeature(index)}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex-1"
                >
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl md:text-4xl font-heading text-[var(--text-primary)] mb-4"
                  >
                    {feature.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-lg text-[var(--text-secondary)] leading-relaxed mb-4"
                  >
                    {feature.description}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-[var(--text-secondary)] leading-relaxed"
                  >
                    {feature.longDescription}
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex-1 w-full"
                >
                  {renderVisual(feature.visual, isActive)}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
