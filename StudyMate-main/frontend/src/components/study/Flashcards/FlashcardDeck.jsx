import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStudy } from '../../../context/StudyContext';

const FlashcardDeck = () => {
  const { flashcards } = useStudy();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-2 font-heading">Flashcard Decks</h1>
          <p className="text-gray-400">Study with AI-generated flashcards</p>
        </div>
        <button className="btn-primary">Create New Deck</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flashcards.map((deck, index) => (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="card-glass p-6"
          >
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">{deck.title}</h3>
              <p className="text-gray-400 text-sm">{deck.subject}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span>🎴 {deck.cards} cards</span>
            </div>

            <Link
              to={`/dashboard/flashcards/${deck.id}`}
              className="btn-primary w-full text-center block"
            >
              Study Now
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardDeck;

