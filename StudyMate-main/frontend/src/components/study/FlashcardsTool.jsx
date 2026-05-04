import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { documentService } from '../../services/documentService';
import { generatePDF } from '../../utils/markdown';
import useSpeech from '../../hooks/useSpeech';
import PlannerTaskBanner from './PlannerTaskBanner';

const FlashcardsTool = ({ documentId, spaceId, documentIds, onContentGenerated, plannerTask, onMarkPlannerTaskComplete, onClose }) => {
    const [flashcards, setFlashcards] = useState([]);
    const [loading, setLoading] = useState(false); 
    const [currentIndex, setCurrentIndex] = useState(0);
    const activeRequest = useRef(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [flippedOnce, setFlippedOnce] = useState(false);
    const { speak, isSpeaking } = useSpeech();
    const [error, setError] = useState(null);
    const lastInputs = useRef('');

    useEffect(() => {
        let isMounted = true;
        const currentInputs = JSON.stringify({ documentId, documentIds, spaceId });

        const fetchFlashcards = async () => {
            setError(null);

            
            
            if (lastInputs.current === currentInputs && activeRequest.current) {
                return;
            }

            
            if (lastInputs.current === currentInputs && flashcards.length > 0) {
                setLoading(false);
                return;
            }

            lastInputs.current = currentInputs;
            activeRequest.current = true;
            setLoading(true);

            const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);

            try {
                const data = await documentService.getFlashcards(docId, {
                    spaceId,
                    documentIds: documentIds || []
                });

                let cards = [];
                if (Array.isArray(data)) {
                    cards = data;
                } else {
                    cards = data.flashcards || data.cards || data.items || [];
                }

                const normalizedCards = cards.map(c => ({
                    front: c.front || c.question || c.q || '',
                    back: c.back || c.answer || c.a || ''
                })).filter(c => c.front || c.back);

                
                
                if (lastInputs.current === currentInputs) {
                    setFlashcards(normalizedCards);

                    
                    if (isMounted && onContentGenerated) {
                        onContentGenerated();
                    }
                }
            } catch (err) {
                console.error(`[FlashcardsTool] Fetch error:`, err);
                if (lastInputs.current === currentInputs) {
                    setError(err.message || 'Failed to load flashcards');
                    lastInputs.current = ''; 
                }
            } finally {
                activeRequest.current = false;
                setLoading(false);
            }
        };

        const resolvedDocId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);
        if (resolvedDocId || spaceId) {
            fetchFlashcards();
        } else {
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [documentId, JSON.stringify(documentIds), spaceId]);

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % flashcards.length);
        }, 150);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
        }, 150);
    };

    const handleRetry = () => {
        lastInputs.current = '';
        setLoading(true);
    };

    const handleDownloadPDF = () => {
        generatePDF('Study Flashcards', flashcards, 'flashcards');
    };

    const Icons = {
        Cards: () => (
            <svg className="w-6 h-6 text-cosmic-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
        ),
        Download: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        ),
        ArrowLeft: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        ),
        ArrowRight: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        ),
        Speaker: ({ active }) => (
            <svg className={`w-3.5 h-3.5 ${active ? 'text-cosmic-purple-light animate-bounce' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
        )
    };

    if (loading) {
        return (
            <div className="max-w-[720px] mx-auto py-4">
                <div className="w-full aspect-[3/2] max-h-[340px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--bg-surface)] p-8 sm:p-12 flex flex-col items-center justify-center min-h-[300px]">
                <div className="p-3 bg-red-500/10 rounded-full mb-4">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Generation Stalled</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6 text-center">{error}</p>
                <button
                    onClick={() => { lastInputs.current = ''; setLoading(true); }}
                    className="btn-primary"
                >
                    Retry Generation
                </button>
            </div>
        );
    }

    if (flashcards.length === 0) {
        return (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-[var(--text-muted)]">
                No flashcards found. Try with a different document.
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

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
            <div className="text-center mb-4">
                <p className="text-caption text-[var(--text-muted)]">Card {currentIndex + 1} of {flashcards.length}</p>
            </div>

            <div
                className="w-full aspect-[3/2] max-h-[380px] perspective-1000 cursor-pointer"
                onClick={() => {
                    setIsFlipped(!isFlipped);
                    if (!flippedOnce) setFlippedOnce(true);
                }}
            >
                <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="relative w-full h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-8 flex flex-col items-center justify-center text-center"
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                        <div className="text-caption text-[var(--text-muted)] tracking-[0.1em] mb-3">FRONT</div>
                        <h2 className="text-heading text-[var(--text-primary)] text-center px-3 sm:px-6 break-words">{currentCard.front}</h2>

                        <button
                            onClick={(e) => { e.stopPropagation(); speak(currentCard.front); }}
                            className="mt-6 p-2 backdrop-blur-sm bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
                        >
                            <Icons.Speaker active={isSpeaking} />
                        </button>

                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-8 flex flex-col items-center justify-center text-center"
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <div className="text-caption text-[var(--accent)] tracking-[0.1em] mb-3">BACK</div>
                        <p className="text-body text-[var(--text-secondary)] text-center px-3 sm:px-6 leading-[1.6] break-words">{currentCard.back}</p>

                        <button
                            onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}
                            className="mt-6 p-2 backdrop-blur-sm bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                        >
                            <Icons.Speaker active={isSpeaking} />
                        </button>
                    </div>
                </motion.div>
            </div>
            {!flippedOnce && <p className="text-caption text-[var(--text-muted)] italic text-center mt-3">Click to flip</p>}

            <div className="flex items-center justify-between mt-5 gap-2">
                <button disabled={currentIndex === 0} onClick={handlePrev} className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-[0.4rem] text-body text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed">
                        <Icons.ArrowLeft />
                        <span>Prev</span>
                </button>
                <button disabled={currentIndex === flashcards.length - 1} onClick={handleNext} className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-[0.4rem] text-body text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed">
                        <span>Next</span>
                        <Icons.ArrowRight />
                </button>
            </div>
            {currentIndex === flashcards.length - 1 && (
                <div className="text-center mt-2">
                    <p className="text-caption text-[var(--text-muted)]">You've reviewed all cards.</p>
                </div>
            )}
        </div>
    );
};

export default FlashcardsTool;
