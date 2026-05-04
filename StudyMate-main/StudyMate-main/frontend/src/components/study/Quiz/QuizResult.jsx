import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const QuizResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, total, answers } = location.state || { score: 0, total: 0, answers: [] };

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-400', message: 'Excellent!' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-400', message: 'Great job!' };
    if (percentage >= 70) return { grade: 'B', color: 'text-yellow-400', message: 'Good work!' };
    if (percentage >= 60) return { grade: 'C', color: 'text-orange-400', message: 'Not bad!' };
    return { grade: 'F', color: 'text-red-400', message: 'Keep practicing!' };
  };

  const { grade, color, message } = getGrade();

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-glass p-12 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-8xl mb-6"
        >
          {percentage >= 70 ? '🎉' : '📚'}
        </motion.div>

        <h2 className="text-4xl mb-4 font-heading">{message}</h2>
        <div className={`text-6xl font-bold mb-4 ${color}`}>{grade}</div>

        <div className="mb-8">
          <div className="text-3xl font-bold mb-2">
            {score} / {total}
          </div>
          <div className="text-gray-400 mb-4">{percentage}% Correct</div>
          <div className="w-full bg-cosmic-blue/30 rounded-full h-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1 }}
              className={`h-4 rounded-full ${
                percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/dashboard/quizzes')} className="btn-secondary">
            Back to Quizzes
          </button>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retake Quiz
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuizResult;

