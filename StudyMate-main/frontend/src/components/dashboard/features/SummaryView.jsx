import { useState, useEffect } from 'react';
import { useDocument } from '../../../context/DocumentContext';
import { documentService } from '../../../services/documentService';
import FeatureLayout from './FeatureLayout';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText, RefreshCw, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SummaryView = () => {
    const { activeDocument } = useDocument();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [options, setOptions] = useState({
        summaryLength: 'medium',
        tone: 'neutral',
        purpose: 'revision',
        emphasis: 'key_points',
        structure: 'paragraph'
    });

    const generateSummary = async (isRegenerate = false) => {
        if (!activeDocument?.id) {
            setError("No document selected. Please select a document first.");
            return;
        }

        
        if (loading) {
            return;
        }

        setLoading(true);
        setError(null);
        if (isRegenerate) {
            setSummary(null);
        }

        try {

            const data = await documentService.getSummary(activeDocument.id, {
                spaceId: activeDocument.space_id,
                ...options,
                isRegenerate: isRegenerate
            });

            
            const summaryText = data.summary || data;

            if (!summaryText) {
                throw new Error("No summary returned from server");
            }

            setSummary(summaryText);
        } catch (err) {
            console.error("Summary generation error:", err);
            const errorMessage = err.response?.data?.error || err.message || "Failed to generate summary. Please try again.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    
    useEffect(() => {
        if (activeDocument?.id && !summary && !loading && !error) {
            generateSummary();
        }
        
    }, [activeDocument?.id]);

    return (
        <FeatureLayout
            title="Document Summary"
            icon="📝"
            color="cosmic-purple"
            actions={
                <div className="flex items-center gap-2">
                    {summary && (
                        <button
                            onClick={() => generateSummary(true)}
                            disabled={loading}
                            className="btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw size={14} />
                            {loading ? 'Generating...' : 'Regenerate'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`btn-secondary inline-flex items-center gap-1.5 ${showOptions ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
                    >
                        <Settings size={14} />
                        {showOptions ? 'Hide Options' : 'Customize'}
                    </button>
                </div>
            }
        >
            <div className="h-full">
                <AnimatePresence>
                    {showOptions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-4"
                        >
                            <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] grid grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">Purpose</label>
                                    <select
                                        value={options.purpose}
                                        onChange={(e) => setOptions({ ...options, purpose: e.target.value })}
                                        className="input-field h-10 text-sm cursor-pointer w-full px-3"
                                    >
                                        <option value="revision">Revision</option>
                                        <option value="study_notes">Study Notes</option>
                                        <option value="exam_focused">Exam-Focused</option>
                                        <option value="presentation">Presentation</option>
                                        <option value="quick_overview">Quick Overview</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">Length</label>
                                    <select
                                        value={options.summaryLength}
                                        onChange={(e) => setOptions({ ...options, summaryLength: e.target.value })}
                                        className="input-field h-10 text-sm cursor-pointer w-full px-3"
                                    >
                                        <option value="short">Short</option>
                                        <option value="medium">Medium</option>
                                        <option value="detailed">Detailed</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">Tone</label>
                                    <select
                                        value={options.tone}
                                        onChange={(e) => setOptions({ ...options, tone: e.target.value })}
                                        className="input-field h-10 text-sm cursor-pointer w-full px-3"
                                    >
                                        <option value="neutral">Neutral</option>
                                        <option value="academic">Academic</option>
                                        <option value="professional">Professional</option>
                                        <option value="simple">Simple</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">Structure</label>
                                    <select
                                        value={options.structure}
                                        onChange={(e) => setOptions({ ...options, structure: e.target.value })}
                                        className="input-field h-10 text-sm cursor-pointer w-full px-3"
                                    >
                                        <option value="paragraph">Paragraph</option>
                                        <option value="bullet_points">Bullet Points</option>
                                        <option value="numbered">Numbered</option>
                                    </select>
                                </div>
                                <div className="col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => generateSummary(true)}
                                        disabled={loading}
                                        className="btn-primary h-10 px-6 text-sm rounded-lg font-medium"
                                    >
                                        {loading ? 'Generating...' : 'Generate with Options'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-full max-w-3xl space-y-4">
                            {/* Skeleton Header */}
                            <div className="space-y-[10px]">
                                <div className="h-[18px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[70%]" />
                                <div className="h-[18px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[85%]" />
                            </div>
                            {/* Skeleton Content Lines */}
                            <div className="space-y-[10px] pt-2">
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-full" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[95%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[88%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[92%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[75%]" />
                            </div>
                            {/* Skeleton Key Points Section */}
                            <div className="space-y-[10px] pt-3">
                                <div className="h-[16px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[40%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[85%] ml-4" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[90%] ml-4" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[80%] ml-4" />
                            </div>
                            {/* Skeleton Summary Section */}
                            <div className="space-y-[10px] pt-3">
                                <div className="h-[16px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[45%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-full" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[93%]" />
                                <div className="h-[14px] rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse w-[87%]" />
                            </div>
                            <p className="text-body text-[var(--text-muted)] mt-4 animate-pulse text-center">Generating your AI summary...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                        <AlertCircle size={32} className="text-[var(--danger)]" />
                        <p className="text-body text-[var(--danger)]">{error}</p>
                        <button
                            onClick={() => generateSummary(true)}
                            className="btn-secondary"
                        >
                            Retry
                        </button>
                    </div>
                ) : summary ? (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6">
                        <div className="text-body text-[var(--text-primary)] leading-[1.7] [&_h1]:text-heading [&_h1]:text-[var(--text-primary)] [&_h1]:mb-2 [&_h2]:text-heading [&_h2]:text-[var(--text-primary)] [&_h2]:mb-2 [&_h3]:text-heading [&_h3]:text-[var(--text-primary)] [&_h3]:mb-2 [&_p]:mb-4 [&_strong]:font-semibold [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:ml-6 [&_ol]:mb-4 [&_code]:bg-[var(--bg-elevated)] [&_code]:rounded-[4px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-[var(--accent)] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-secondary)] [&_blockquote]:italic">
                            <ReactMarkdown>{summary}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <FileText size={32} className="text-[var(--text-muted)]" />
                        <p className="text-body text-[var(--text-secondary)] mt-4">Select a document to generate a summary</p>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default SummaryView;
