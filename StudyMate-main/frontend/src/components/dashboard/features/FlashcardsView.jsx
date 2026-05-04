import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocument } from '../../../context/DocumentContext';
import { documentService } from '../../../services/documentService';
import FeatureLayout from './FeatureLayout';
import { AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const Flashcard = ({ card, isFlipped, onFlip }) => (
    <div
        className="w-full max-w-[480px] h-[260px] cursor-pointer"
        onClick={onFlip}
        style={{ perspective: '1000px' }}
    >
        <div
            className="relative w-full h-full"
            style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.45s ease',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
        >
            <div
                className="absolute inset-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex items-center justify-center p-8 text-center"
                style={{ backfaceVisibility: 'hidden' }}
            >
                <p className="text-subhead text-[var(--text-primary)]">{card.front || card.question}</p>
            </div>

            <div
                className="absolute inset-0 bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex items-center justify-center p-8 text-center"
                style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                }}
            >
                <p className="text-body text-[var(--text-primary)]">{card.back || card.answer}</p>
            </div>
        </div>
    </div>
);

const FlashcardsView = () => {
    const { activeDocument } = useDocument();
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateFlashcards = async () => {
        if (!activeDocument?.id) {
            setError("No document selected. Please select a document first.");
            return;
        }

        
        if (loading) {
            return;
        }

        setLoading(true);
        setError(null);

        try {

            const data = await documentService.getFlashcards(activeDocument.id, {
                spaceId: activeDocument.space_id
            });

            
            let cards = [];
            if (Array.isArray(data)) {
                cards = data;
            } else if (data.flashcards && Array.isArray(data.flashcards)) {
                cards = data.flashcards;
            } else if (typeof data === 'object') {
                cards = Object.values(data).filter(item =>
                    item && (item.front || item.question) && (item.back || item.answer)
                );
            }

            if (cards.length === 0) {
                throw new Error("No flashcards generated. Please try again.");
            }

            setFlashcards(cards);
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch (err) {
            console.error("Flashcard generation error:", err);
            const errorMessage = err.response?.data?.error || err.message || "Failed to generate flashcards. Please try again.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeDocument?.id && flashcards.length === 0 && !loading && !error) {
            generateFlashcards();
        }
        
    }, [activeDocument?.id]);

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

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <FeatureLayout
            title="Flashcards"
            icon="🎴"
            color="accent"
            actions={
                flashcards.length > 0 && (
                    <button
                        onClick={generateFlashcards}
                        disabled={loading}
                        className="btn-secondary disabled:opacity-50"
                    >
                        Regenerate
                    </button>
                )
            }
        >
            <div className="h-full flex flex-col items-center justify-center pt-4">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--bg-elevated)] border-t-[var(--accent)] animate-spin" />
                        <p className="text-body text-[var(--text-secondary)]">Generating flashcards...</p>
                    </div>
                ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                        <AlertCircle size={32} className="text-[var(--danger)]" />
                        <p className="text-body text-[var(--danger)]">{error}</p>
                        <button
                            onClick={generateFlashcards}
                            className="btn-secondary"
                        >
                            Retry
                        </button>
                    </div>
                ) : flashcards.length > 0 ? (
                    <div className="w-full flex flex-col items-center gap-6">
                        <div className="w-full max-w-[480px] flex items-center justify-between">
                            <span className="text-caption text-[var(--text-muted)]">Card {currentIndex + 1} of {flashcards.length}</span>
                        </div>
                        <div className="w-full max-w-[480px] h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-300 ease-linear w-[var(--progress)]" style={{ '--progress': `${((currentIndex + 1) / flashcards.length) * 100}%` }} />
                        </div>
                        <div className="w-full flex justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full flex justify-center"
                                >
                                    <Flashcard
                                        card={flashcards[currentIndex]}
                                        isFlipped={isFlipped}
                                        onFlip={handleFlip}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <p className="text-caption text-[var(--text-muted)] text-center">Click card to flip</p>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={handlePrev}
                                disabled={flashcards.length <= 1}
                                className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                aria-label="Previous card"
                            >
                                <ChevronLeft size={16} />
                                Prev
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={flashcards.length <= 1}
                                className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                aria-label="Next card"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <FileText size={32} className="text-[var(--text-muted)]" />
                        <p className="text-body text-[var(--text-secondary)] mt-4">Select a document to generate flashcards</p>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default FlashcardsView;
