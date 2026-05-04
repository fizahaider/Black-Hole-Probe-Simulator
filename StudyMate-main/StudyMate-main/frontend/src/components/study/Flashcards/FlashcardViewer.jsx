import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../../context/StudyContext';

const FlashcardViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { flashcards } = useStudy();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState([]);

  const deck = flashcards.find((d) => d.id === parseInt(id));

  
  const cards = [
    { id: 1, front: 'What is React?', back: 'A JavaScript library for building user interfaces' },
    { id: 2, front: 'What is useState?', back: 'A React hook that lets you add state to functional components' },
    { id: 3, front: 'What is JSX?', back: 'JavaScript XML - a syntax extension for JavaScript' },
    { id: 4, front: 'What is a component?', back: 'A reusable piece of UI that returns JSX' },
  ];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = () => {
    if (!knownCards.includes(cards[currentIndex].id)) {
      setKnownCards([...knownCards, cards[currentIndex].id]);
    }
    handleNext();
  };

  if (!deck) {
    return <div>Deck not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-heading">{deck.title}</h2>
        <button onClick={() => navigate('/dashboard/flashcards')} className="btn-secondary">
          Back to Decks
        </button>
      </div>

      <div className="relative h-96 mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="w-full h-full"
            >
              <div
                className={`card-glass p-12 h-full flex items-center justify-center cursor-pointer ${
                  isFlipped ? 'hidden' : ''
                }`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <h3 className="text-3xl font-semibold text-center">{cards[currentIndex].front}</h3>
              </div>
              <div
                className={`card-glass p-12 h-full flex items-center justify-center cursor-pointer ${
                  !isFlipped ? 'hidden' : ''
                }`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-2xl text-center text-gray-300">{cards[currentIndex].back}</p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="text-gray-400">
          {currentIndex + 1} / {cards.length}
        </span>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      <div className="flex gap-4 justify-center">
        <button onClick={() => setIsFlipped(!isFlipped)} className="btn-primary">
          {isFlipped ? 'Show Front' : 'Flip Card'}
        </button>
        <button onClick={handleKnown} className="btn-secondary">
          ✓ I Know This
        </button>
      </div>

      <div className="mt-6 text-center text-gray-400">
        Known: {knownCards.length} / {cards.length}
      </div>
    </div>
  );
};

export default FlashcardViewer;

