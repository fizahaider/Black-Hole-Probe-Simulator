import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import notebookService from '../../services/notebookService';
import documentService from '../../services/documentService';
import { chatService } from '../../services/chatService';

const MasteryDashboard = ({ spaceId }) => {
    const [concepts, setConcepts] = useState([]);
    const [mastery, setMastery] = useState([]);
    const [quizHistory, setQuizHistory] = useState([]);
    const [stats, setStats] = useState({ summaries: 0, flashcards: 0, quizzes: 0, chat_questions: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isRebuilding, setIsRebuilding] = useState(false);

    useEffect(() => {
        const loadMasteryData = async () => {
            if (!spaceId) return;
            setIsLoading(true);
            try {
                const [conceptsData, masteryData, historyData, statsData] = await Promise.all([
                    notebookService.getConcepts(spaceId),
                    notebookService.getMastery(spaceId),
                    documentService.getQuizHistory(spaceId),
                    chatService.getStats(spaceId)
                ]);
                setConcepts(conceptsData);
                setMastery(masteryData);
                setQuizHistory(historyData);
                setStats(statsData);
            } catch (error) {
                console.error('Mastery data load error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadMasteryData();
    }, [spaceId]);

    const handleRebuildIndex = async () => {
        setIsRebuilding(true);
        try {
            await chatService.rebuildIndex();
            alert('Knowledge index rebuilt successfully!');
        } catch (error) {
            alert('Failed to rebuild index: ' + error.message);
        } finally {
            setIsRebuilding(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading mastery analytics...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading">Mastery & Analytics</h2>
                <button
                    onClick={handleRebuildIndex}
                    disabled={isRebuilding}
                    className={`btn-secondary text-sm px-4 py-2 ${isRebuilding ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isRebuilding ? 'Rebuilding...' : '🔄 Rebuild Index'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Concept Mastery List */}
                <div className="card-glass p-6">
                    <h3 className="text-xl font-heading mb-6 flex items-center gap-2">
                        <span>🧠</span> Concept Mastery
                    </h3>
                    <div className="space-y-4">
                        {mastery.length === 0 ? (
                            <p className="text-gray-500 italic text-sm text-center py-4">
                                No concepts assessed yet. Take a quiz to start!
                            </p>
                        ) : (
                            mastery.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-300">{m.concept_name}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${m.level === 'Strong' ? 'bg-green-500/20 text-green-400' :
                                        m.level === 'Moderate' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {m.level}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Score Trends / History */}
                <div className="card-glass p-6">
                    <h3 className="text-xl font-heading mb-6 flex items-center gap-2">
                        <span>📈</span> Quiz History
                    </h3>
                    <div className="space-y-4">
                        {quizHistory.length === 0 ? (
                            <p className="text-gray-500 italic text-sm text-center py-4">
                                No quiz attempts recorded.
                            </p>
                        ) : (
                            quizHistory.slice(0, 5).map(q => (
                                <div key={q.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div>
                                        <div className="text-sm text-gray-300">Attempt from {new Date(q.created_at).toLocaleDateString()}</div>
                                        <div className="text-xs text-gray-500">{q.total_questions} Questions</div>
                                    </div>
                                    <div className="text-lg font-heading text-cosmic-purple-light">
                                        {q.score}/{q.total_questions}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Feature Usage Analytics Placeholder */}
            <div className="card-glass p-6">
                <h3 className="text-xl font-heading mb-4 flex items-center gap-2">
                    <span>📊</span> Usage Insights
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Summaries', count: stats.summaries, icon: '📝' },
                        { label: 'Quizzes', count: stats.quizzes, icon: '🎯' },
                        { label: 'Flashcards', count: stats.flashcards, icon: '🎴' },
                        { label: 'Questions', count: stats.chat_questions, icon: '💬' }
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/5 p-4 rounded-xl text-center">
                            <div className="text-2xl mb-1">{stat.icon}</div>
                            <div className="text-xl font-bold text-white">{stat.count}</div>
                            <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MasteryDashboard;
