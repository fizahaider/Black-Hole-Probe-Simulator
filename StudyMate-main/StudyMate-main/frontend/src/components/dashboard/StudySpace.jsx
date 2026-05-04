import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSpace } from '../../context/SpaceContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../../services/documentService';
import { ChevronDown, ChevronUp, Plus, Trash2, FileText, ArrowLeft, MessageSquare, Layers, HelpCircle, CalendarDays, GitFork, X, UploadCloud, BookOpen, Sparkles } from 'lucide-react';
import UploadArea from './UploadArea';
import ChatTool from '../study/ChatTool';
import SummaryTool from '../study/SummaryTool';
import FlashcardsTool from '../study/FlashcardsTool';
import QuizTool from '../study/QuizTool';
import MindMapTool from '../study/MindMapTool';
import StudyPlanner from '../study/Planner/StudyPlanner';
import { spaceService } from '../../services/spaceService';
import { OPEN_STUDY_TOOL_EVENT } from '../../constants/studyToolEvents';
import { renderMarkdown } from '../../utils/markdown';

const StudySpace = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [activeTool, setActiveTool] = useState(null);
    const [activeStudyPlan, setActiveStudyPlan] = useState(null);
    const [toolLaunchOptions, setToolLaunchOptions] = useState(null);
    const [plannerTaskContext, setPlannerTaskContext] = useState(null);
    const [plannerPlanVersion, setPlannerPlanVersion] = useState(0);
    const [isMindMapFullScreen, setIsMindMapFullScreen] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const { spaces, currentSpace, selectSpace, addSpace, removeSpace } = useSpace();
    const navigate = useNavigate();
    const [newSpaceName, setNewSpaceName] = useState("");
    const [isCreatingSpace, setIsCreatingSpace] = useState(false);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [activeHistoryTab, setActiveHistoryTab] = useState('Quizzes');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
    const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [spaceToDelete, setSpaceToDelete] = useState(null);
    const { showToast } = useToast();
    const lastFetchedSpaceId = useRef(null);
    const lastFetchedHistoryKey = useRef(null);
    const previousSpaceId = useRef(null);

    const fetchDocuments = async () => {
        if (!currentSpace) return;
        setIsLoadingDocs(true);
        try {
            const data = await spaceService.getDocuments(currentSpace.id);
            setDocuments(data);
            setSelectedDocIds(data.map(d => d.id));
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const fetchHistory = async () => {
        if (!currentSpace) return;
        setIsLoadingHistory(true);
        try {
            let data = [];
            switch (activeHistoryTab) {
                case 'Quizzes':
                    data = await documentService.getQuizHistory(currentSpace.id);
                    break;
                case 'Flashcards':
                    data = await documentService.getFlashcardHistory(currentSpace.id);
                    break;
                case 'Summaries':
                    data = await documentService.getSummaryHistory(currentSpace.id);
                    break;
                case 'Mind Maps':
                    data = await documentService.getMindMapHistory(currentSpace.id);
                    break;
                default:
                    break;
            }
            setHistoryData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        const spaceId = currentSpace?.id;
        if (spaceId && lastFetchedSpaceId.current !== spaceId) {
            lastFetchedSpaceId.current = spaceId;
            fetchDocuments();
        }

        if (spaceId && !activeTool) {
            documentService.getStudyPlanHistory(spaceId)
                .then(res => {
                    const activePlan = res.find(p => p.status !== 'abandoned' && p.status !== 'completed');
                    setActiveStudyPlan(activePlan || null);
                })
                .catch(err => console.error("Failed to load active study plan overview:", err));
        }
    }, [currentSpace, activeTool]);

    useEffect(() => {
        const spaceId = currentSpace?.id;
        const key = `${spaceId}-${activeHistoryTab}`;
        if (spaceId && lastFetchedHistoryKey.current !== key) {
            lastFetchedHistoryKey.current = key;
            fetchHistory();
        }
    }, [currentSpace, activeHistoryTab]);

    useEffect(() => {
        const nextSpaceId = currentSpace?.id || null;
        const prevSpaceId = previousSpaceId.current;
        if (nextSpaceId && prevSpaceId && nextSpaceId !== prevSpaceId) {
            setActiveTool(null);
            setToolLaunchOptions(null);
            setPlannerTaskContext(null);
            setSelectedHistoryItem(null);
            setIsHistoryExpanded(false);
            setActiveHistoryTab('Quizzes');
            showToast(`Switched to "${currentSpace?.name}". Select a tool to continue.`, 'info');
        }
        previousSpaceId.current = nextSpaceId;
    }, [currentSpace?.id, currentSpace?.name]);

    const handleCreateSpace = async (e) => {
        e.preventDefault();
        if (newSpaceName.trim() && !isSubmittingSpace) {
            setIsSubmittingSpace(true);
            try {
                await addSpace(newSpaceName, "");
                setNewSpaceName("");
                setIsCreatingSpace(false);
                setSearchParams({});
            } catch (error) {
                console.error("Failed to create space:", error);
                showToast('Failed to create knowledge space. Please try again.', 'error');
            } finally {
                setIsSubmittingSpace(false);
            }
        }
    };

    const handleDeleteSpace = async () => {
        const space = spaceToDelete || currentSpace;
        if (!space) return;

        setIsSubmittingSpace(true);
        try {
            await removeSpace(space.id);
            setShowDeleteModal(false);
            setSpaceToDelete(null);
            if (!currentSpace || currentSpace.id === space.id) {
                setSearchParams({});
            }
        } catch (error) {
            console.error("Failed to delete space:", error);
            showToast('Failed to delete knowledge space. Please try again.', 'error');
        } finally {
            setIsSubmittingSpace(false);
        }
    };

    const handleUploadSuccess = async (file) => {
        if (!currentSpace) {
            showToast('Please select or create a knowledge space first.', 'error');
            return;
        }
        try {
            await documentService.upload(file, currentSpace.id);
            await fetchDocuments();
            setActiveTool('chat');
            setToolLaunchOptions(null);
            setPlannerTaskContext(null);
            setIsHistoryExpanded(false);
            showToast('Document uploaded. Chat is ready.', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Document processing failed.', 'error');
        }
    };

    const toggleDocSelection = (id) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
    const handleSelectAllDocs = () => {
        setSelectedDocIds(documents.map((d) => d.id));
    };
    const handleClearDocSelection = () => {
        setSelectedDocIds([]);
    };

    const handleSelectTool = (tool) => {
        setToolLaunchOptions(null);
        setPlannerTaskContext(null);
        setActiveTool(tool);
    };

    const handleNavigateFromPlanner = (tool, opts) => {
        setPlannerTaskContext(opts?.plannerTask ?? null);
        setToolLaunchOptions(
            opts?.autoStart ? { autoStart: true, key: opts.key } : null
        );
        setActiveTool(tool);
    };

    const markPlannerTaskComplete = useCallback(async (planId, scheduleIndex) => {
        const spaceId = currentSpace?.id;
        if (!spaceId || planId == null || scheduleIndex == null) return;

        const history = await documentService.getStudyPlanHistory(spaceId);
        const plan = history.find((p) => String(p.id) === String(planId));
        if (!plan) return;

        const schedule = plan.plan_content?.schedule || plan.schedule || [];
        if (!schedule.length) return;
        if (scheduleIndex < 0 || scheduleIndex >= schedule.length) return;

        const updatedSchedule = [...schedule];
        updatedSchedule[scheduleIndex] = {
            ...updatedSchedule[scheduleIndex],
            completed: true
        };

        const newPlanContent = {
            ...(plan.plan_content || {}),
            schedule: updatedSchedule
        };

        await documentService.updateStudyPlan(planId, { plan_content: newPlanContent });

        const historyAfter = await documentService.getStudyPlanHistory(spaceId);
        const active = historyAfter.find((p) => p.status !== 'abandoned' && p.status !== 'completed');
        setActiveStudyPlan(active || null);
        setPlannerPlanVersion((v) => v + 1);
        setPlannerTaskContext((prev) =>
            prev && String(prev.planId) === String(planId) && prev.scheduleIndex === scheduleIndex
                ? { ...prev, completedInPlan: true }
                : prev
        );
    }, [currentSpace?.id]);

    useEffect(() => {
        const onOpenTool = (event) => {
            const { tool, launchOptions: lo } = event.detail || {};
            if (!tool) return;
            setPlannerTaskContext(lo?.plannerTask ?? null);
            setToolLaunchOptions(lo?.autoStart ? { autoStart: true, key: lo.key } : null);
            setActiveTool(tool);
        };
        window.addEventListener(OPEN_STUDY_TOOL_EVENT, onOpenTool);
        return () => window.removeEventListener(OPEN_STUDY_TOOL_EVENT, onOpenTool);
    }, []);

    const toolItems = [
        { key: 'summary', label: 'Summary', icon: FileText },
        { key: 'chat', label: 'Chat', icon: MessageSquare },
        { key: 'flashcards', label: 'Flashcards', icon: Layers },
        { key: 'quiz', label: 'Quiz', icon: HelpCircle },
        { key: 'planner', label: 'Planner', icon: CalendarDays },
        { key: 'mindmap', label: 'Mindmap', icon: GitFork },
    ];
    const stripFormatting = (value) => {
        if (!value) return '';
        return String(value)
            .replace(/<[^>]*>/g, ' ')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/(\*\*|__|\*|_|`|>)/g, '')
            .replace(/^\s*[-*+]\s+/gm, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">

            <div className="flex-1 overflow-auto bg-[var(--bg-base)]">

                {isCreatingSpace && (
                    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] w-[400px] max-w-[90vw] relative">
                            <button onClick={() => { setIsCreatingSpace(false); setNewSpaceName(""); }} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
                            <h3 className="text-heading text-[var(--text-primary)]">New Knowledge Space</h3>
                            <p className="text-body text-[var(--text-secondary)] mt-2 mb-6">Create a dedicated space to organize your study materials.</p>
                            <form onSubmit={handleCreateSpace}>
                                <div className="mb-6">
                                    <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Space Name</label>
                                    <input type="text" placeholder="e.g. Advanced Calculus" className="input-field w-full mt-3" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} autoFocus />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setIsCreatingSpace(false); setNewSpaceName(""); }} className="btn-secondary" disabled={isSubmittingSpace}>Cancel</button>
                                    <button type="submit" className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmittingSpace || !newSpaceName.trim()}>
                                        {isSubmittingSpace ? 'Creating...' : 'Create Space'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isUploadOpen && (
                    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] w-[480px] max-w-[90vw] relative">
                            <button onClick={() => setIsUploadOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
                            <h3 className="text-heading text-[var(--text-primary)] mb-4">Upload Document</h3>
                            <UploadArea
                                onUploadComplete={async () => {
                                    setIsUploadOpen(false);
                                    await fetchDocuments();
                                    setActiveTool('chat');
                                    setToolLaunchOptions(null);
                                    setPlannerTaskContext(null);
                                    setIsHistoryExpanded(false);
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className={`max-w-[92rem] mx-auto px-3 sm:px-5 lg:px-6 h-full ${activeTool ? 'py-3 sm:py-4' : 'py-8 sm:py-10'}`}>
                    <AnimatePresence mode="wait">
                        {!currentSpace ? (

                            <motion.div
                                key="space-selection"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center min-h-[60vh]"
                            >
                                <div className="text-center mb-12">
                                    <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Knowledge Spaces</h1>
                                    <p className="text-[var(--text-secondary)] text-lg">Create or select a knowledge space to organize your study materials</p>
                                </div>

                                <div className="w-full max-w-4xl">

                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-8 p-8 bg-[var(--accent-subtle)] border-2 border-dashed border-[var(--accent)] rounded-2xl cursor-pointer hover:border-[var(--accent)] transition-all"
                                        onClick={() => setIsCreatingSpace(true)}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                                                <Plus className="w-8 h-8 text-[var(--accent)]" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Create New Knowledge Space</h3>
                                            <p className="text-[var(--text-secondary)] text-sm">Start organizing your documents in a dedicated space</p>
                                        </div>
                                    </motion.div>


                                    {spaces.length > 0 && (
                                        <>
                                            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Your Knowledge Spaces</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {spaces.map(space => (
                                                    <motion.div
                                                        key={space.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        whileHover={{ scale: 1.02 }}
                                                        onClick={() => selectSpace(space)}
                                                        className="p-6 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="w-12 h-12 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center group-hover:bg-[var(--accent-subtle)] transition-colors">
                                                                <FileText className="w-5 h-5 text-[var(--accent)]" />
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSpaceToDelete(space);
                                                                    setShowDeleteModal(true);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color:rgba(239,68,68,0.1)] rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{space.name}</h3>
                                                        <p className="text-xs text-[var(--text-muted)] mb-3">
                                                            {space.document_count || 0} {space.document_count === 1 ? 'document' : 'documents'}
                                                        </p>
                                                        <div className="text-xs text-[var(--accent)] font-medium group-hover:text-[var(--accent)] transition-colors">
                                                            Click to open →
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="workspace-root"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col border border-[var(--border)] bg-[var(--bg-surface)] rounded-[var(--radius-md)] overflow-hidden h-[calc(100vh-8.5rem)]"
                            >
                                <div className="h-[60px] shrink-0 px-4 sm:px-6 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center justify-between gap-3">
                                    <div className="flex items-center">
                                        <div className="relative group">
                                            <button className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2 text-body text-[var(--text-primary)] hover:border-[var(--accent)] transition-all">
                                                <span className="hidden md:inline max-w-[220px] truncate font-medium">{currentSpace.name}</span>
                                                <span className="md:hidden max-w-[120px] truncate font-medium">{currentSpace.name.slice(0, 12)}</span>
                                                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                                            </button>
                                            <div className="absolute top-full left-0 mt-2 w-60 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden hidden group-hover:block z-50">
                                                <div className="p-2 max-h-64 overflow-y-auto">
                                                    {spaces.map(space => (
                                                        <button key={space.id} onClick={() => selectSpace(space)} className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-sm)] text-body transition-all ${currentSpace?.id === space.id ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>{space.name}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={() => setIsCreatingSpace(true)} className="ml-2 inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all" title="Create Space">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSpaceToDelete(currentSpace);
                                                setShowDeleteModal(true);
                                            }}
                                            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color:rgba(239,68,68,0.1)] transition-all"
                                            title="Delete Space"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setIsUploadOpen(true)}
                                        className="inline-flex items-center gap-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2 text-body font-medium hover:bg-[var(--accent-hover)] transition-all shadow-sm"
                                    >
                                        <UploadCloud size={15} />
                                        <span className="hidden md:inline">Upload Document</span>
                                    </button>
                                </div>

                                <div className="flex flex-col lg:flex-row min-h-0 flex-1 relative">
                                    <aside className={`transition-all duration-300 w-full bg-[var(--bg-surface)] border-b lg:border-b-0 lg:border-r border-[var(--border)] h-auto lg:h-full flex flex-col ${activeTool ? 'lg:w-[80px] lg:min-w-[80px] lg:sticky lg:top-0 lg:self-start' : 'lg:w-[300px] lg:min-w-[300px]'}`}>
                                        <section className={`p-3 lg:p-4 ${activeTool ? 'px-2' : ''}`}>
                                            {!activeTool && <h3 className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">Study Tools</h3>}
                                            <div className={`grid gap-2 ${activeTool ? 'grid-cols-3 sm:grid-cols-6 lg:grid-cols-1' : 'grid-cols-3 sm:grid-cols-6 lg:grid-cols-3'}`}>
                                                {toolItems.map((tool) => {
                                                    const IconComp = tool.icon;
                                                    const isDisabled = selectedDocIds.length === 0;
                                                    const isActive = activeTool === tool.key;
                                                    return (
                                                        <button
                                                            key={tool.key}
                                                            onClick={() => handleSelectTool(tool.key)}
                                                            className={`rounded-[var(--radius-sm)] border px-2 py-2 lg:py-[0.6rem] flex flex-col items-center text-center gap-1 transition-colors ${isActive ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border)] bg-[var(--bg-base)]'} ${isDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]'}`}
                                                        >
                                                            <IconComp size={16} className={isDisabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)] group-hover:text-[var(--accent)]'} />
                                                            {!activeTool && <span className="text-caption text-[var(--text-secondary)]">{tool.label}</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        <section className={`flex-1 min-h-0 p-4 border-t border-[var(--border)] ${activeTool ? 'hidden lg:hidden' : 'block'}`}>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Documents</h2>
                                                <span className="text-caption bg-[var(--accent-subtle)] text-[var(--accent)] rounded-[var(--radius-sm)] px-[6px] py-[1px]">{documents.length}</span>
                                            </div>
                                            {documents.length > 0 && (
                                                <div className="flex items-center gap-3 mt-2">
                                                    <button onClick={handleSelectAllDocs} className="text-caption text-[var(--accent)]">Select all</button>
                                                    <button onClick={handleClearDocSelection} className="text-caption text-[var(--accent)]">Clear</button>
                                                </div>
                                            )}
                                            <div className="mt-3 max-h-[40vh] lg:max-h-none lg:h-[calc(100%-2.5rem)] overflow-y-auto custom-scrollbar pr-1">
                                                {isLoadingDocs ? (
                                                    <div className="space-y-2">
                                                        <div className="h-8 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                        <div className="h-8 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                        <div className="h-8 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                    </div>
                                                ) : documents.length === 0 ? (
                                                    <div className="text-center py-6 flex flex-col items-center justify-center">
                                                        <FileText size={24} className="text-[var(--text-muted)] mb-2" />
                                                        <p className="text-caption text-[var(--text-muted)]">No documents yet</p>
                                                        <p className="text-caption text-[var(--text-muted)]">Upload one to get started</p>
                                                    </div>
                                                ) : (
                                                    documents.map(doc => (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => handleDocSelection(doc.id)}
                                                            className={`flex items-start gap-3 p-3 mb-2 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                                                                selectedDocIds.includes(doc.id)
                                                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                                                                    : 'border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--accent)]'
                                                            }`}
                                                        >
                                                            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                selectedDocIds.includes(doc.id)
                                                                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                                                                    : 'border-[var(--border)]'
                                                            }`}>
                                                                {selectedDocIds.includes(doc.id) && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-body text-[var(--text-primary)] font-medium truncate">{doc.title}</p>
                                                                <p className="text-caption text-[var(--text-muted)] mt-0.5">{doc.file_type?.toUpperCase() || 'FILE'}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </section>
                                    </aside>

                                    <section className="flex-1 bg-[var(--bg-base)] h-auto lg:h-full overflow-y-auto p-3 sm:p-5 lg:p-6 min-h-0">
                                        {!activeTool ? (
                                            <div className="min-h-[42vh] lg:min-h-full flex flex-col justify-center items-center text-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6">
                                                {selectedDocIds.length === 0 ? (
                                                    <>
                                                        <BookOpen size={32} className="text-[var(--text-muted)]" />
                                                        <h3 className="text-subhead text-[var(--text-secondary)] mt-3">Select a document to get started</h3>
                                                        <p className="text-body text-[var(--text-muted)]">Then choose a tool from the panel on the left.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageSquare size={32} className="text-[var(--accent)]" />
                                                        <h3 className="text-subhead text-[var(--text-secondary)] mt-3">Documents ready. Start with chat.</h3>
                                                        <p className="text-body text-[var(--text-muted)] mt-1 mb-4">Ask questions, summarize sections, and generate study outputs from one place.</p>
                                                        <button
                                                            onClick={() => setActiveTool('chat')}
                                                            className="btn-primary inline-flex items-center gap-2 px-4 py-2"
                                                        >
                                                            <MessageSquare size={14} />
                                                            Open Document Chat
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col">
                                                <div className="text-caption text-[var(--text-muted)] mb-4 border-b border-[var(--border)] pb-3">
                                                    {currentSpace?.name} &rsaquo; {toolItems.find((t) => t.key === activeTool)?.label}
                                                </div>
                                                <div className="flex-1 min-h-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-2 sm:p-3 md:p-4" key={activeTool}>
                                                    {activeTool === 'chat' && (
                                                        <ChatTool
                                                            spaceId={currentSpace?.id}
                                                            documentIds={selectedDocIds}
                                                            onContentGenerated={fetchHistory}
                                                            plannerTask={plannerTaskContext}
                                                            onMarkPlannerTaskComplete={markPlannerTaskComplete}
                                                            onClose={() => setActiveTool(null)}
                                                        />
                                                    )}
                                                    {activeTool === 'summary' && (
                                                        <SummaryTool
                                                            spaceId={currentSpace?.id}
                                                            documentIds={selectedDocIds}
                                                            onContentGenerated={fetchHistory}
                                                            plannerTask={plannerTaskContext}
                                                            onMarkPlannerTaskComplete={markPlannerTaskComplete}
                                                            onClose={() => setActiveTool(null)}
                                                        />
                                                    )}
                                                    {activeTool === 'flashcards' && (
                                                        <FlashcardsTool
                                                            spaceId={currentSpace?.id}
                                                            documentIds={selectedDocIds}
                                                            onContentGenerated={fetchHistory}
                                                            plannerTask={plannerTaskContext}
                                                            onMarkPlannerTaskComplete={markPlannerTaskComplete}
                                                            onClose={() => setActiveTool(null)}
                                                        />
                                                    )}
                                                    {activeTool === 'quiz' && (
                                                        <QuizTool
                                                            spaceId={currentSpace?.id}
                                                            documentIds={selectedDocIds}
                                                            onContentGenerated={fetchHistory}
                                                            plannerTask={plannerTaskContext}
                                                            launchOptions={toolLaunchOptions}
                                                            onLaunchOptionsConsumed={() => setToolLaunchOptions(null)}
                                                            onMarkPlannerTaskComplete={markPlannerTaskComplete}
                                                            onClose={() => setActiveTool(null)}
                                                        />
                                                    )}
                                                    {activeTool === 'planner' && (
                                                        <StudyPlanner
                                                            spaceId={currentSpace?.id}
                                                            documentIds={selectedDocIds}
                                                            onContentGenerated={fetchHistory}
                                                            onNavigateTool={handleNavigateFromPlanner}
                                                            refreshToken={plannerPlanVersion}
                                                            onClose={() => setActiveTool(null)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent activity moved to right sidebar */}
                                    </section>

                                    {/* Right Sidebar for Recent Activity */}
                                    {!activeTool && (
                                        <aside className="w-full lg:w-[320px] lg:min-w-[320px] bg-[var(--bg-surface)] border-t lg:border-t-0 lg:border-l border-[var(--border)] h-auto lg:h-full flex flex-col">
                                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-caption uppercase tracking-[0.08em] text-[var(--text-secondary)]">Recent Activity</h3>
                                                </div>
                                                
                                                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">History Filter</div>
                                                <div className="flex gap-4 border-b border-[var(--border)] mb-4 overflow-x-auto whitespace-nowrap custom-scrollbar">
                                                    {['Quizzes', 'Flashcards', 'Summaries', 'Mind Maps'].map(tab => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setActiveHistoryTab(tab)}
                                                            className={`pb-2 text-caption transition-colors border-b-2 cursor-pointer ${activeHistoryTab === tab ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
                                                        >
                                                            {tab}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="space-y-3">
                                                    {isLoadingHistory ? (
                                                        <>
                                                            <div className="h-5 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                            <div className="h-5 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                            <div className="h-5 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
                                                        </>
                                                    ) : historyData.length === 0 ? (
                                                        <p className="text-caption text-[var(--text-secondary)] py-4 text-center">No recent activity</p>
                                                    ) : (
                                                        historyData.slice(0, 5).map((item, idx) => {
                                                            let preview = '';
                                                            if (activeHistoryTab === 'Summaries' && item.content) {
                                                                preview = stripFormatting(item.content).substring(0, 120);
                                                            } else if (activeHistoryTab === 'Flashcards' && item.cards?.length) {
                                                                preview = `${item.cards.length} cards`;
                                                            } else if (activeHistoryTab === 'Quizzes' && item.score !== undefined) {
                                                                preview = `Score: ${item.score}% • ${item.questions?.length || 0} questions`;
                                                            }
                                                            return (
                                                                <div
                                                                    key={item.id || idx}
                                                                    onClick={() => setSelectedHistoryItem(item)}
                                                                    className={`py-3 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors border border-[var(--border)]`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-3 mb-1.5">
                                                                        <span className="text-body text-[var(--text-primary)] font-medium truncate flex-1">
                                                                            {item.topic || item.title || (activeHistoryTab === 'Summaries' ? 'Document Summary' : activeHistoryTab.slice(0, -1))}
                                                                        </span>
                                                                        <span className="text-caption text-[var(--text-muted)] shrink-0">
                                                                            {new Date(item.created_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    {preview && (
                                                                        <p className="text-caption text-[var(--text-secondary)] line-clamp-2">
                                                                            {preview}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                {historyData.length > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (historyData[0]) setSelectedHistoryItem(historyData[0]);
                                                        }}
                                                        className="mt-4 text-caption text-[var(--accent)] font-medium hover:underline w-full text-center"
                                                    >
                                                        Open latest
                                                    </button>
                                                )}
                                            </div>
                                        </aside>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {}
            <AnimatePresence>
                {showDeleteModal && (spaceToDelete || currentSpace) && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowDeleteModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">Delete Knowledge Space</h3>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-8 mt-4">
                                <p className="text-body text-[var(--text-secondary)] mb-6">
                                    Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{(spaceToDelete || currentSpace)?.name}"</span>?
                                </p>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSpace}
                                    disabled={isSubmittingSpace}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isSubmittingSpace ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full-Screen Mind Map Overlay */}
            {activeTool === 'mindmap' && currentSpace && (
                <div className="fixed inset-0 z-[90] bg-[var(--bg-base)]">
                    <button
                        onClick={() => setActiveTool(null)}
                        className="absolute top-4 left-4 z-[110] inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-body text-[var(--text-primary)] hover:border-[var(--accent)]"
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                    <MindMapTool
                        spaceId={currentSpace?.id}
                        documentIds={selectedDocIds}
                        onContentGenerated={fetchHistory}
                        isFullScreen={isMindMapFullScreen}
                        onToggleFullScreen={() => setIsMindMapFullScreen(prev => !prev)}
                    />
                </div>
            )}

            {/* History Item Viewer Modal */}
            {selectedHistoryItem && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedHistoryItem(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[var(--shadow-md)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-heading text-[var(--text-primary)]">
                                    {activeHistoryTab === 'Summaries' ? 'Summary' :
                                        activeHistoryTab === 'Flashcards' ? 'Flashcards' :
                                            activeHistoryTab === 'Quizzes' ? 'Quiz' : 
                                                activeHistoryTab === 'Mind Maps' ? 'Mind Map' : 'History Item'}
                                </h2>
                                <p className="text-caption text-[var(--text-muted)] mt-1">{activeHistoryTab} • {new Date(selectedHistoryItem.created_at).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedHistoryItem(null)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {activeHistoryTab === 'Summaries' && (
                            <div className="markdown-body-sm">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: /<[^>]+>/.test(selectedHistoryItem.content || '')
                                            ? selectedHistoryItem.content
                                            : renderMarkdown(selectedHistoryItem.content || '')
                                    }}
                                />
                            </div>
                        )}

                        {activeHistoryTab === 'Flashcards' && (
                            <div className="space-y-4">
                                {selectedHistoryItem.cards?.map((card, idx) => (
                                    <div key={idx} className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)]">
                                        <div className="text-sm font-semibold text-[var(--accent)] mb-2">Q: {card.front || card.question}</div>
                                        <div className="text-[var(--text-secondary)]">A: {card.back || card.answer}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeHistoryTab === 'Quizzes' && (
                            <div className="space-y-4">
                                {selectedHistoryItem.score !== undefined && (
                                    <div className="bg-[var(--accent-subtle)] border border-[var(--accent)] p-4 rounded-xl mb-4">
                                        <div className="text-lg font-bold text-[var(--text-primary)]">Score: {selectedHistoryItem.score}%</div>
                                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                                            {selectedHistoryItem.questions?.length || 0} questions attempted
                                        </div>
                                    </div>
                                )}
                                {selectedHistoryItem.questions?.map((q, idx) => {
                                    
                                    const userAnswer = selectedHistoryItem.user_answers?.[String(idx)];
                                    const isCorrect = userAnswer === q.correct_answer;
                                    return (
                                        <div key={idx} className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)]">
                                            <div className="font-semibold text-[var(--text-primary)] mb-3">{q.question}</div>
                                            <div className="space-y-2">
                                                {q.options?.map((opt, optIdx) => {
                                                    const isCorrectChoice = opt === q.correct_answer;
                                                    const isUserChoice = opt === userAnswer;

                                                    let className = "text-sm text-[var(--text-secondary)] py-1 flex items-center gap-2";
                                                    let indicators = [];

                                                    if (isCorrectChoice) {
                                                        className = "text-sm text-[var(--success)] font-semibold py-1 flex items-center gap-2";
                                                        indicators.push(<span key="correct" className="px-1.5 py-0.5 bg-[color:rgba(16,185,129,0.12)] rounded text-[9px] uppercase tracking-wider">✓ Correct</span>);
                                                    }

                                                    if (isUserChoice) {
                                                        className = isCorrectChoice
                                                            ? "text-sm text-[var(--success)] font-bold bg-[var(--bg-elevated)] rounded-lg px-2 py-1 flex items-center gap-2"
                                                            : "text-sm text-[var(--danger)] font-semibold py-1 flex items-center gap-2";
                                                        indicators.push(<span key="user" className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${isCorrectChoice ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'bg-[color:rgba(239,68,68,0.12)] text-[var(--danger)]'}`}>{isCorrectChoice ? 'Your Selection' : '✗ Your Selection'}</span>);
                                                    }

                                                    return (
                                                        <div key={optIdx} className={className}>
                                                            <span className="opacity-50 min-w-[20px]">{optIdx + 1}.</span>
                                                            <span className="flex-1">{opt}</span>
                                                            <div className="flex gap-1.5">{indicators}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {userAnswer !== undefined && userAnswer !== null && (
                                                <div className={`mt-3 pt-3 border-t border-[var(--border)] text-[10px] font-bold uppercase tracking-widest ${isCorrect ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                                    {isCorrect ? 'Correct Outcome' : 'Incorrect Outcome'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeHistoryTab === 'Chat' && (
                            <div className="space-y-4">
                                {selectedHistoryItem.messages?.length > 0 ? (
                                    selectedHistoryItem.messages.map((msg, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${msg.role === 'user' ? 'bg-[var(--bg-elevated)] border-[var(--border)]' : 'bg-[var(--accent-subtle)] border-[var(--accent)]'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`}>
                                                    {msg.role}
                                                </span>
                                                <span className="text-[8px] text-[var(--text-muted)]">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                            {msg.sources?.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                                    <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-2">Sources</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {msg.sources.map((s, sIdx) => (
                                                            <div key={sIdx} className="text-[9px] px-2 py-1 bg-[var(--bg-elevated)] rounded-md text-[var(--text-secondary)] border border-[var(--border)]" title={s.text}>
                                                                {s.document_title || "Document Source"}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-xs text-[var(--text-muted)]">No messages found in this conversation.</div>
                                )}
                            </div>
                        )}

                        {activeHistoryTab === 'Mind Maps' && (
                            <div className="h-[600px]">
                                <MindMapTool preloadedData={selectedHistoryItem.content} />
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default StudySpace;
