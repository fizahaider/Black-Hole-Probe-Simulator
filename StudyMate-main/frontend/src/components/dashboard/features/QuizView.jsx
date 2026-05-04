import { useState, useEffect } from 'react';
import { useDocument } from '../../../context/DocumentContext';
import { documentService } from '../../../services/documentService';
import FeatureLayout from './FeatureLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, FileText, HelpCircle, XCircle } from 'lucide-react';

const QuizView = () => {
    const { activeDocument } = useDocument();
    const [quiz, setQuiz] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');

    const generateQuiz = async (difficulty = 'Medium') => {
        if (!activeDocument?.id) {
            setError("No document selected. Please select a document first.");
            return;
        }

        
        if (loading) {
            return;
        }

        setLoading(true);
        setError(null);
        setQuiz([]);
        setCurrentQuestion(0);
        setAnswers({});
        setShowResults(false);
        setSelectedDifficulty(difficulty);

        try {
            const data = await documentService.getQuiz(activeDocument.id, {
                difficulty: difficulty.toLowerCase(),
                spaceId: activeDocument.space_id
            });
            const questions = data.questions || data;

            if (Array.isArray(questions) && questions.length > 0) {
                setQuiz(questions);
            } else {
                throw new Error("No questions generated. Please try again.");
            }
        } catch (err) {
            console.error("Quiz generation error:", err);
            setError(err.message || "Failed to generate quiz. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));
    };

    const calculateScore = () => {
        let correct = 0;
        quiz.forEach((q, idx) => {
            
            if (q.options[answers[idx]] === q.correct_answer || answers[idx] === q.correct_answer) {
                correct++;
            }
        });
        return correct;
    };

    const getScorePercentage = () => {
        return Math.round((calculateScore() / quiz.length) * 100);
    };

    const getScoreMessage = () => {
        const percentage = getScorePercentage();
        if (percentage >= 90) return { emoji: '🏆', message: 'Outstanding!', color: 'text-yellow-400' };
        if (percentage >= 70) return { emoji: '🎉', message: 'Great Job!', color: 'text-emerald-400' };
        if (percentage >= 50) return { emoji: '👍', message: 'Good Effort!', color: 'text-blue-400' };
        return { emoji: '📚', message: 'Keep Learning!', color: 'text-gray-400' };
    };

    return (
        <FeatureLayout
            title="Quiz Master"
            icon="🎯"
            color="accent"
            actions={
                !showResults && quiz.length === 0 && (
                    <div className="flex gap-2">
                        {['Easy', 'Medium', 'Hard'].map(d => (
                            <button
                                key={d}
                                onClick={() => generateQuiz(d)}
                                disabled={loading}
                                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-caption border transition-colors ${selectedDifficulty === d
                                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                                    } disabled:opacity-50`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                )
            }
        >
            <div className="h-full overflow-y-auto flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--bg-elevated)] border-t-[var(--accent)] animate-spin" />
                            <p className="text-body text-[var(--text-secondary)]">Generating quiz...</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center text-center gap-3"
                        >
                            <AlertCircle size={32} className="text-[var(--danger)]" />
                            <p className="text-body text-[var(--danger)]">{error}</p>
                            <button
                                onClick={() => generateQuiz(selectedDifficulty)}
                                className="btn-secondary"
                            >
                                Retry
                            </button>
                        </motion.div>
                    ) : quiz.length === 0 ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center max-w-[440px] mx-auto"
                        >
                            <div className="w-16 h-16 mx-auto mb-6 rounded-[var(--radius-lg)] bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
                                <HelpCircle size={40} />
                            </div>
                            <h3 className="text-display text-[var(--text-primary)] mb-3">Quiz</h3>
                            <p className="text-body text-[var(--text-secondary)] mb-8">
                                {activeDocument?.name || 'No document selected'}
                            </p>
                            <button onClick={() => generateQuiz(selectedDifficulty)} className="btn-primary w-full">Start Quiz</button>
                        </motion.div>
                    ) : !showResults ? (
                        <motion.div
                            key="quiz"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-3xl"
                        >
                            <div className="mb-6">
                                <div className="flex justify-between text-caption text-[var(--text-muted)] mb-2">
                                    <span>Question {currentQuestion + 1} of {quiz.length}</span>
                                </div>
                                <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-[var(--accent)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>

                            {/* Question Card */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentQuestion}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 mb-5"
                                >
                                    <h3 className="text-subhead text-[var(--text-primary)] mb-6 leading-relaxed">
                                        {quiz[currentQuestion].question}
                                    </h3>
                                    <div className="space-y-3">
                                        {quiz[currentQuestion].options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                className={`w-full text-left px-4 py-3 rounded-[var(--radius-md)] border transition-colors text-body cursor-pointer ${answers[currentQuestion] === idx
                                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 justify-between">
                                                    <span className="flex-1">{option}</span>
                                                    {answers[currentQuestion] === idx && <CheckCircle size={16} className="text-[var(--accent)]" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
                                    disabled={currentQuestion === 0}
                                    className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                {currentQuestion === quiz.length - 1 ? (
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="btn-primary"
                                    >
                                        Finish Quiz
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentQuestion(p => p + 1)}
                                        className="btn-primary"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full"
                        >
                            <div className="max-w-[360px] mx-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center">
                                <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-[var(--accent-subtle)] border-2 border-[var(--accent)] flex items-center justify-center">
                                    <span className="text-[1.5rem] font-bold text-[var(--accent)]">{getScorePercentage()}%</span>
                                </div>
                                <h2 className="text-heading text-[var(--text-primary)] mb-2">Quiz Complete</h2>
                                <p className="text-body text-[var(--text-secondary)] mb-6">{calculateScore()} / {quiz.length} correct</p>

                                <button
                                    onClick={() => generateQuiz(selectedDifficulty)}
                                    className="btn-secondary w-full"
                                >
                                    Retake Quiz
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </FeatureLayout >
    );
};

export default QuizView;
