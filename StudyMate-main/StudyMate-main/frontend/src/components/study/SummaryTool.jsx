import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { documentService } from '../../services/documentService';
import { renderMarkdown, generatePDF } from '../../utils/markdown';
import useSpeech from '../../hooks/useSpeech';
import PlannerTaskBanner from './PlannerTaskBanner';

const SummaryTool = ({ documentId, spaceId, documentIds, onContentGenerated, plannerTask, onMarkPlannerTaskComplete, onClose }) => {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const hasFetched = useRef(false);
    const activeRequest = useRef(false);
    const [optionsOpen, setOptionsOpen] = useState(true);
    const { speak, isSpeaking } = useSpeech();
    const [options, setOptions] = useState({
        summaryLength: 'medium',
        tone: 'academic',
        purpose: 'revision',
        emphasis: 'key_points',
        structure: 'bullet_points'
    });

    
    const normalizeSummary = (text) => {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    };

    const fetchSummary = async (isRegenerate = false) => {
        if (loading || activeRequest.current) return; 
        if (isRegenerate) {
            hasFetched.current = false;
            setSummary(''); // Clear previous summary before regenerating
        }
        setLoading(true);
        activeRequest.current = true;
        try {
            const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);
            if (!docId && !spaceId) {
                setSummary('Please select documents or a knowledge space first.');
                setLoading(false);
                activeRequest.current = false;
                return;
            }
            const data = await documentService.getSummary(docId, {
                ...options,
                spaceId,
                documentIds: documentIds || [],
                isRegenerate: isRegenerate
            });
            const cleanedSummary = normalizeSummary(data.summary || data.content || 'No summary available.');
            setSummary(cleanedSummary);
            
            if (onContentGenerated) {
                setTimeout(() => onContentGenerated(), 500);
            }
        } catch (error) {
            console.error('Summary error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to generate summary';
            setSummary(`Failed to generate summary: ${errorMsg}. Please try again.`);
        } finally {
            setLoading(false);
            activeRequest.current = false; 
        }
    };

    useEffect(() => {
        const canFetch = Boolean(
            documentId ||
            (documentIds && documentIds.length > 0) ||
            spaceId
        );
        if (canFetch && !hasFetched.current) {
            hasFetched.current = true;
            fetchSummary();
        }

        return () => {
            hasFetched.current = false;
        };
        
    }, [documentId, JSON.stringify(documentIds), spaceId]);

    const handleDownloadPDF = () => {
        generatePDF('Document Summary', summary, 'summary');
    };

    const Icons = {
        Settings: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v10" /><path d="M1 12h6m6 0h10" /></svg>
        ),
        Download: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        ),
        Summary: () => (
            <svg className="w-6 h-6 text-cosmic-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
        ),
        Speaker: ({ active }) => (
            <svg className={`w-3.5 h-3.5 ${active ? 'text-cosmic-purple-light animate-bounce' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
        )
    };

    return (
        <div className="max-w-4xl mx-auto py-3 sm:py-5 min-h-[400px]">
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
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-subhead text-[var(--text-primary)] truncate flex-1">Document Summary</h2>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        onClick={() => speak(summary)}
                        className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-[0.4rem] text-caption text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                        title="Read Aloud"
                    >
                        <Icons.Speaker active={isSpeaking} />
                        <span>Read</span>
                    </button>
                    {!loading && summary && (
                        <button onClick={handleDownloadPDF} className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-[0.4rem] text-caption text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]">
                            <Icons.Download />
                            <span>Download</span>
                        </button>
                    )}
                    <button
                        onClick={() => setOptionsOpen(!optionsOpen)}
                        className={`inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-[0.4rem] text-caption hover:border-[var(--accent)] hover:text-[var(--text-primary)] ${optionsOpen ? 'border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                        title="Customize Summary"
                    >
                        <Icons.Settings />
                        <span>{optionsOpen ? 'Hide Options' : 'Customize'}</span>
                    </button>
                </div>
            </div>
            <div className="border-b border-[var(--border)] my-3" />

            <AnimatePresence>
                {optionsOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-5"
                    >
                        <div className="p-4 sm:p-5 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-md)] grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">Summary Type</label>
                                <select
                                    value={options.purpose}
                                    onChange={(e) => setOptions({ ...options, purpose: e.target.value })}
                                    className="input-field h-10 text-sm cursor-pointer w-full px-3"
                                >
                                    <option value="revision">Revision (Recommended)</option>
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
                            {documentIds && documentIds.length > 1 && (
                                <div className="sm:col-span-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        <strong>Multi-Document Mode:</strong> Synthesizing insights from {documentIds.length} selected documents
                                    </p>
                                </div>
                            )}
                            <div className="sm:col-span-3 flex justify-end gap-3 pt-2">
                                <button onClick={() => fetchSummary(true)} className="btn-primary h-10 px-6 text-sm rounded-lg cursor-pointer font-medium" disabled={loading}>
                                    {loading ? 'Generating...' : 'Regenerate Summary'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="space-y-4">
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
                    <p className="text-caption text-[var(--text-muted)] mt-4 animate-pulse">Generating your AI summary...</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div
                        className="text-body text-[var(--text-primary)] leading-[1.75] whitespace-normal"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
                    />
                    <div className="mt-6 flex items-center gap-4">
                        <button 
                            onClick={() => {
                                setOptionsOpen(true);
                                fetchSummary(true);
                            }} 
                            className="text-caption text-[var(--accent)] hover:underline"
                        >
                            Regenerate with current options
                        </button>
                        {!optionsOpen && (
                            <button 
                                onClick={() => setOptionsOpen(true)} 
                                className="text-caption text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            >
                                Change options first
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
            </div>
        </div>
    );
};

export default SummaryTool;
