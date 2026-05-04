import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStudy } from '../../../context/StudyContext';
import { formatTime } from '../../../utils/helpers';

const QuizList = () => {
  const { quizzes } = useStudy();

  const difficultyColors = {
    Easy: 'text-green-400',
    Medium: 'text-yellow-400',
    Hard: 'text-red-400',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-2 font-heading">Practice Quizzes</h1>
          <p className="text-gray-400">Test your knowledge with AI-generated quizzes</p>
        </div>
        <button className="btn-primary">Create New Quiz</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz, index) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="card-glass p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                <p className="text-gray-400 text-sm">{quiz.subject}</p>
              </div>
              <span className={`text-sm font-semibold ${difficultyColors[quiz.difficulty]}`}>
                {quiz.difficulty}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span>📝 {quiz.questions} questions</span>
              <span>⏱️ {formatTime(quiz.duration)}</span>
            </div>

            <Link
              to={`/dashboard/quizzes/${quiz.id}`}
              className="btn-primary w-full text-center block"
            >
              Start Quiz
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuizList;

