import { motion } from 'framer-motion';

const ToolsGrid = ({ onSelectTool }) => {
    
    const Icons = {
        Summary: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
        ),
        Chat: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        ),
        Flashcards: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
        ),
        Quiz: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
        ),
        Planner: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        ),
        MindMap: () => (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m16.24 7.76-5.66 5.66" /><path d="M18 12h-6" /><path d="m16.24 16.24-5.66-5.66" /><path d="M12 22v-8" /><path d="m7.76 16.24 5.66-5.66" /><path d="M6 12h6" /><path d="m7.76 7.76 5.66 5.66" /><circle cx="12" cy="12" r="2.5" /></svg>
        )
    };

    const tools = [
        {
            id: 'summary',
            name: 'AI Summary',
            description: 'Get concise summaries and key insights from your document.',
            icon: <Icons.Summary />,
        },
        {
            id: 'chat',
            name: 'Document Chat',
            description: 'Ask questions and get answers from your document content.',
            icon: <Icons.Chat />,
        },
        {
            id: 'flashcards',
            name: 'Flashcards',
            description: 'Auto-generated flashcards for effective memorization.',
            icon: <Icons.Flashcards />,
        },
        {
            id: 'quiz',
            name: 'Quiz',
            description: 'Test your knowledge with AI-generated questions.',
            icon: <Icons.Quiz />,
        },
        {
            id: 'planner',
            name: 'Study Planner',
            description: 'Create a personalized study schedule.',
            icon: <Icons.Planner />,
        },
        {
            id: 'mindmap',
            name: 'Generate Mind Map',
            description: 'Visualize your material in a structured hierarchical format.',
            icon: <Icons.MindMap />,
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool, idx) => (
                <motion.button
                    key={tool.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelectTool(tool.id)}
                    className="card-glass p-5 text-left group hover:border-cosmic-purple/40 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer"
                >
                    <div className="p-3 bg-white/[0.03] rounded-xl w-fit mb-4 border border-white/5 group-hover:bg-cosmic-purple group-hover:text-white group-hover:border-cosmic-purple transition-all text-cosmic-purple-light">
                        {tool.icon}
                    </div>

                    <h3 className="text-base font-semibold text-white mb-1.5 tracking-tight">{tool.name}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium group-hover:text-gray-400 transition-colors">{tool.description}</p>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-[9px] font-semibold uppercase text-gray-600 tracking-wider group-hover:text-cosmic-purple-light transition-colors">Open Tool</span>
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-white transform group-hover:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </div>
                </motion.button>
            ))}
        </div>
    );
};

export default ToolsGrid;
