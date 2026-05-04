import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDocument } from '../../../context/DocumentContext';
import { ArrowLeft, FileText } from 'lucide-react';

const FeatureLayout = ({ title, icon, color, children, actions }) => {
    const { activeDocument } = useDocument();

    return (
        <div className="h-full flex flex-col bg-[var(--bg-base)]">
            <header className="h-[52px] px-6 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="flex items-center min-w-0">
                    <Link to="/dashboard" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                    <div className="w-px h-4 bg-[var(--border)] mx-3.5" />
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--accent)]" style={{ background: 'var(--accent-subtle)' }}>
                        {icon}
                    </div>
                    <h1 className="text-subhead text-[var(--text-primary)] ml-3 truncate">{title}</h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {activeDocument && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)]">
                            <FileText size={12} className="text-[var(--text-muted)]" />
                            <span className="text-caption text-[var(--text-muted)] truncate max-w-[180px]">{activeDocument.name}</span>
                        </div>
                    )}
                    {actions && actions}
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto p-6 bg-[var(--bg-base)]"
            >
                {children}
            </motion.div>
        </div>
    );
};

export default FeatureLayout;
