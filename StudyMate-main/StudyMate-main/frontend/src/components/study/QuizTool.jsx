import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { documentService } from '../../services/documentService';
import { generatePDF } from '../../utils/markdown';
import useSpeech from '../../hooks/useSpeech';
import PlannerTaskBanner from './PlannerTaskBanner';
let plannerQuizAutostartConsumedKey = null;

const QuizTool = ({ documentId, spaceId, documentIds, onContentGenerated, plannerTask, launchOptions, onLaunchOptionsConsumed, onMarkPlannerTaskComplete, onClose }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [started, setStarted] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [quizAttemptId, setQuizAttemptId] = useState(null);
    const { speak, isSpeaking } = useSpeech();
    const activeRequest = useRef(false);

    useEffect(() => {
        if (isFinished && quizAttemptId && answers.length > 0) {
            saveQuizResults();
        }
        
    }, [isFinished, quizAttemptId]);

    const [config, setConfig] = useState({
        numQuestions: 5,
        difficulty: 'mixed',
        includeHints: true,
        conceptualFocus: true
    });

    const startQuiz = async () => {
        if (loading || activeRequest.current) return;
        setLoading(true);
        activeRequest.current = true;
        setError(null);
        try {
            const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);
            if (!docId && !spaceId) {
                setError('Please select documents or a knowledge space first.');
                setLoading(false);
                return;
            }
            const data = await documentService.getQuiz(docId, {
                ...config,
                spaceId,
                documentIds: documentIds || []
            });
            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setQuizAttemptId(data.id);
                setStarted(true);
                setAnswers([]);
                setScore(0);
            } else {
                setError('No questions generated. Try adjusting your settings.');
            }
        } catch (err) {
            console.error('Quiz error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate quiz. Please try different settings or check your document.';
            setError(errorMsg);
        } finally {
            setLoading(false);
            activeRequest.current = false;
        }
    };

    useEffect(() => {
        if (!launchOptions?.autoStart || started || loading) return;
        const key = launchOptions.key != null ? String(launchOptions.key) : '_';
        if (plannerQuizAutostartConsumedKey === key) return;
        plannerQuizAutostartConsumedKey = key;
        onLaunchOptionsConsumed?.();
        startQuiz();
        
    }, [launchOptions]);

    const handleOptionSelect = (option) => {
        if (showResult) return;
        setSelectedOption(option);
        setShowResult(true);
        const isCorrect = String(option).trim().toLowerCase() === String(questions[currentQuestionIdx].correct_answer).trim().toLowerCase();
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        setAnswers(prev => [...prev, { question: currentQuestionIdx, selected: option, correct: isCorrect }]);
    };

    const handleNext = () => {
        if (currentQuestionIdx + 1 < questions.length) {
            setCurrentQuestionIdx(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
            setShowHint(false);
        } else {
            setIsFinished(true);
        }
    };

    const saveQuizResults = async () => {
        if (!quizAttemptId || answers.length === 0) return;
        try {
            const userAnswers = {};
            answers.forEach((ans) => {
                userAnswers[String(ans.question)] = ans.selected;
            });
            const calculatedScore = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
            await documentService.saveQuizResults(quizAttemptId, {
                user_answers: userAnswers,
                score: calculatedScore
            });
            if (onContentGenerated) {
                setTimeout(() => onContentGenerated(), 500);
            }
            if (plannerTask && typeof onMarkPlannerTaskComplete === 'function' && !plannerTask.completedInPlan) {
                onMarkPlannerTaskComplete(plannerTask.planId, plannerTask.scheduleIndex);
            }
        } catch (error) {
            console.error('Failed to save quiz results:', error);
        }
    };

    const resetQuiz = () => {
        setStarted(false);
        setQuestions([]);
        setCurrentQuestionIdx(0);
        setSelectedOption(null);
        setShowResult(false);
        setShowHint(false);
        setScore(0);
        setIsFinished(false);
        setAnswers([]);
        setError(null);
        setQuizAttemptId(null);
    };

    const handleDownloadPDF = () => {
        generatePDF('Quiz Results', questions, 'quiz');
    };

    const Icons = {
        Target: () => (
            <svg className="w-6 h-6 text-cosmic-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
        ),
        Hint: () => (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        ),
        Check: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ),
        X: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ),
        Speaker: ({ active }) => (
            <svg className={`w-4 h-4 ${active ? 'text-cosmic-purple-light animate-bounce' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
        )
    };

    // Configuration screen
    if (!started && !loading) {
        return (
            <div className="max-w-2xl mx-auto py-2 sm:py-4">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-body text-[var(--text-primary)] hover:border-[var(--accent)]"
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                )}
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--accent-subtle)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                            <Icons.Target />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quiz Configuration</h2>
                            <p className="text-xs text-[var(--text-muted)]">Customize your assessment</p>
                        </div>
                    </div>

                    <PlannerTaskBanner task={plannerTask} onMarkComplete={onMarkPlannerTaskComplete} />

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Questions</label>
                                <select
                                    className="input-field h-10 text-sm cursor-pointer"
                                    value={config.numQuestions}
                                    onChange={(e) => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
                                >
                                    {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Difficulty</label>
                                <select
                                    className="input-field h-10 text-sm cursor-pointer"
                                    value={config.difficulty}
                                    onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[
                                { id: 'includeHints', label: 'Include Hints', desc: 'Show helpful hints for each question' },
                                { id: 'conceptualFocus', label: 'Conceptual Focus', desc: 'Focus on understanding over memorization' }
                            ].map(option => (
                                <div key={option.id} className="flex items-center justify-between p-3 bg-[var(--bg-base)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                                    <div>
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">{option.label}</h4>
                                        <p className="text-[10px] text-[var(--text-muted)]">{option.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, [option.id]: !config[option.id] })}
                                        className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${config[option.id] ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${config[option.id] ? 'left-5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={startQuiz}
                            className="btn-primary w-full h-11 text-sm font-medium rounded-xl cursor-pointer"
                        >
                            Start Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-[620px] mx-auto py-6">
                <PlannerTaskBanner task={plannerTask} onMarkComplete={onMarkPlannerTaskComplete} />
                <div className="space-y-4">
                    <div className="h-1 rounded-full bg-[var(--bg-surface)] animate-pulse" />
                    <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
                    <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
                    <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
                </div>
            </div>
        );
    }

    if (isFinished) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="max-w-[620px] mx-auto py-3 sm:py-6">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-body text-[var(--text-primary)] hover:border-[var(--accent)]"
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                )}
                <PlannerTaskBanner task={plannerTask} onMarkComplete={onMarkPlannerTaskComplete} />
                <div className="text-center">
                    <div className="text-[var(--accent)] mb-4 flex justify-center"><Icons.Target /></div>
                    <p className="text-[2.5rem] font-bold text-[var(--text-primary)] leading-none">{score}/{questions.length}</p>
                    <p className="text-body text-[var(--text-secondary)] mt-3">{percentage >= 70 ? 'Great job!' : 'Keep practicing!'}</p>
                    <button onClick={resetQuiz} className="mt-6 w-full bg-[var(--accent)] text-white rounded-[var(--radius-sm)] py-[0.65rem] disabled:opacity-50 disabled:cursor-not-allowed">
                        Retake Quiz
                    </button>
                    <button onClick={handleDownloadPDF} className="mt-2 w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] rounded-[var(--radius-sm)] py-[0.65rem]">
                        Download
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIdx];

    return (
        <div className="max-w-[720px] mx-auto py-3 sm:py-5">
            {onClose && (
                <button
                    onClick={onClose}
                    className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-body text-[var(--text-primary)] hover:border-[var(--accent)]"
                >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                </button>
            )}
            <PlannerTaskBanner task={plannerTask} onMarkComplete={onMarkPlannerTaskComplete} />
            <div className="w-full h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] transition-all duration-300 ease-in-out" style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }} />
            </div>
            <p className="text-caption text-[var(--text-muted)] mt-2">Question {currentQuestionIdx + 1} of {questions.length}</p>

            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 sm:p-4">
                <div className="flex items-start justify-between mb-6 gap-4">
                    <h3 className="text-subhead text-[var(--text-primary)] leading-[1.5]">{currentQ.question}</h3>
                    <button
                        onClick={() => {
                            const optionsText = currentQ.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt}`).join('. ');
                            speak(`${currentQ.question}. The options are: ${optionsText}`);
                        }}
                        className="p-2.5 bg-[var(--bg-base)] border border-[var(--border)] rounded-full hover:bg-[var(--bg-elevated)] transition-all cursor-pointer shrink-0"
                        title="Read Question & Options"
                    >
                        <Icons.Speaker active={isSpeaking} />
                    </button>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    {currentQ.options.map((opt, idx) => {
                        let classes = "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]";
                        if (showResult) {
                            const isThisCorrect = String(opt).trim().toLowerCase() === String(currentQ.correct_answer).trim().toLowerCase();
                            const isThisSelected = String(opt).trim().toLowerCase() === String(selectedOption).trim().toLowerCase();

                            if (isThisCorrect) {
                                classes = "border-[#22c55e] bg-[rgba(34,197,94,0.08)] text-[var(--text-primary)]";
                            } else if (isThisSelected) {
                                classes = "border-[var(--danger)] bg-[rgba(239,68,68,0.08)] text-[var(--text-primary)]";
                            } else {
                                classes = "border-[var(--border)] bg-[var(--bg-surface)] opacity-70";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(opt)}
                                className={`w-full text-left px-4 py-3 rounded-[var(--radius-sm)] border transition-all duration-150 flex items-center gap-3 ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'} ${classes}`}
                                disabled={showResult}
                            >
                                <span className={`w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-caption text-[var(--text-muted)] shrink-0 ${(showResult && (String(opt).trim().toLowerCase() === String(currentQ.correct_answer).trim().toLowerCase())) ? 'bg-[#22c55e] text-white border-[#22c55e]' : ''}`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="flex-1 text-body text-[var(--text-primary)]">{opt}</span>
                                <div
                                    onClick={(e) => { e.stopPropagation(); speak(opt); }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer opacity-40 group-hover:opacity-100"
                                    title="Read Option"
                                >
                                    <Icons.Speaker active={isSpeaking} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Hint and next button */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <div>
                        {config.includeHints && currentQ.hint && !showResult && (
                            <button
                                onClick={() => setShowHint(!showHint)}
                                    className="text-[var(--text-muted)] hover:text-[var(--accent)] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Icons.Hint />
                                {showHint ? 'Hide Hint' : 'Show Hint'}
                            </button>
                        )}
                        <AnimatePresence>
                            {showHint && !showResult && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 p-3 bg-[var(--accent-subtle)] border-l-2 border-[var(--accent)] rounded-r-lg text-xs text-[var(--text-secondary)] italic"
                                >
                                    {currentQ.hint}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {showResult && currentQ.source_reference && (
                            <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-subtle)] px-3 py-1.5 rounded-full">
                                Topic: {currentQ.source_reference}
                            </span>
                        )}
                    </div>

                    <AnimatePresence>
                        {showResult && (
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={handleNext}
                                className="btn-primary h-10 px-6 rounded-xl text-sm cursor-pointer"
                            >
                                {currentQuestionIdx + 1 === questions.length ? 'See Results' : 'Next Question'}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default QuizTool;
