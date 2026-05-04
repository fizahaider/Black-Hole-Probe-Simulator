import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { documentService } from '../../services/documentService';
import { renderMarkdown, stripMarkdown, generatePDF, downloadContent } from '../../utils/markdown';
import useSpeech from '../../hooks/useSpeech';
import PlannerTaskBanner from './PlannerTaskBanner';

const ChatTool = ({ documentId, spaceId, documentIds, onContentGenerated, plannerTask, onMarkPlannerTaskComplete, onClose }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I have processed your documents. Ask me anything about them!' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [personality, setPersonality] = useState('neutral');
    const [depth, setDepth] = useState('detailed');
    const [conversations, setConversations] = useState([]);
    const [showConversations, setShowConversations] = useState(false);
    const [pinningMessageId, setPinningMessageId] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const {
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        speak,
        stopSpeaking
    } = useSpeech();

    useEffect(() => {
        if (messagesContainerRef.current) {
            const { scrollHeight, clientHeight } = messagesContainerRef.current;
            messagesContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    useEffect(() => {
        const rehydrate = async () => {
            try {
                const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);

                const data = await documentService.rehydrateChat({
                    document_id: docId,
                    space_id: spaceId
                });

                let formattedMessages = [];
                if (data && data.messages && data.messages.length > 0) {
                    formattedMessages = data.messages.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        references: m.sources || []
                    }));
                    setConversationId(data.id);
                    setPersonality(data.personality || 'neutral');
                }

                if (plannerTask) {
                    const block =
                        `### Study plan — Day **${plannerTask.day}** (${plannerTask.task_type})\n\n` +
                        `${plannerTask.task}\n\n` +
                        `---\n` +
                        `Work through this focus here: ask for explanations, examples, or quick checks based on your documents.`;
                    const inject = {
                        role: 'assistant',
                        content: block,
                        references: plannerTask.references?.length ? plannerTask.references : []
                    };
                    if (formattedMessages.length > 0) {
                        setMessages([inject, ...formattedMessages]);
                    } else {
                        setMessages([inject]);
                    }
                    return;
                }

                if (formattedMessages.length > 0) {
                    setMessages(formattedMessages);
                }
            } catch (error) {
                console.error('[ChatTool] Rehydration failed:', error);
            }
        };
        rehydrate();
    }, [documentId, documentIds, spaceId, plannerTask]);

    const loadConversation = async (convId) => {
        try {
            setConversationId(convId);
            const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);

            const data = await documentService.rehydrateChat({
                conversation_id: convId
            });

            if (data && data.messages) {
                const formattedMessages = data.messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    references: m.sources || []
                }));
                setMessages(formattedMessages);
                setPersonality(data.personality || 'neutral');
                setShowConversations(false);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const startNewConversation = () => {
        setConversationId(null);
        setMessages([{ role: 'assistant', content: 'Hi! I have processed your documents. Ask me anything about them!' }]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const result = await documentService.chat(documentId, userMsg, {
                conversationId,
                personality,
                depth,
                spaceId,
                documentIds
            });

            if (result.conversation_id && !conversationId) {
                setConversationId(result.conversation_id);
            }

            setMessages(prev => [...prev, {
                id: result.message_id,
                role: 'assistant',
                content: result.answer,
                references: result.references
            }]);

            if (onContentGenerated) {
                try {
                    setTimeout(() => onContentGenerated(), 500);
                } catch (e) {
                    console.warn('History callback failed:', e);
                }
            }
        } catch (error) {
            console.error('[ChatTool] Error during chat request:', error?.response?.data || error.message);

            let errorMsg = 'Sorry, I encountered an error. Please try again or adjust your settings.';
            if (error?.response?.data?.error) {
                
                errorMsg = `Sorry, an error occurred: ${error.response.data.error}`;
            } else if (error.message.includes("timeout")) {
                errorMsg = 'Request timed out. The document might be too large or the AI service is currently busy.';
            }

            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleVoiceInput = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening((transcript) => {
                setInput(transcript);
            });
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isTyping && input.trim()) {
                handleSend(e);
            }
        }
    };

    const personalities = [
        { id: 'neutral', label: 'Balanced' },
        { id: 'academic', label: 'Academic' },
        { id: 'companion', label: 'Guide' },
        { id: 'humorous', label: 'Creative' },
        { id: 'therapeutic', label: 'Support' },
    ];

    const depths = [
        { id: 'concise', label: 'Concise' },
        { id: 'detailed', label: 'Detailed' },
        { id: 'step-by-step', label: 'Step-by-step' }
    ];

    const Icons = {
        Chat: () => (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        ),
        Send: () => (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        ),
        Source: () => (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
        ),
        Download: () => (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        ),
        Mic: ({ active }) => (
            <svg className={`w-4 h-4 ${active ? 'text-[var(--danger)] animate-pulse' : 'text-[var(--text-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
        ),
        Speaker: ({ active }) => (
            <svg className={`w-3.5 h-3.5 ${active ? 'text-[var(--accent)] animate-bounce' : 'text-[var(--text-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
        )
    };

    const handleExportChat = () => {
        const chatContent = messages.map(m =>
            `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`
        ).join('\n\n');
        generatePDF('Chat History', chatContent, 'summary');
    };

    const handlePinMessage = async (message) => {
        if (!message?.id || pinningMessageId) return;
        setPinningMessageId(message.id);
        try {
            const data = await documentService.pinChatMessage({
                messageId: message.id,
                conceptName: '',
            });
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === message.id
                        ? { ...m, pinned: true, pinnedLabel: data?.concept_name || 'Pinned' }
                        : m
                )
            );
        } catch (error) {
            const errorText = error?.response?.data?.error || 'Failed to pin this message.';
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === message.id
                        ? { ...m, pinError: errorText }
                        : m
                )
            );
        } finally {
            setPinningMessageId(null);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {onClose && (
                <div className="px-4 pt-3 pb-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-body text-[var(--text-primary)] hover:border-[var(--accent)]"
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>
            )}
            <div className="flex-1 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-base)] flex flex-col min-h-0 overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="h-12 px-3 sm:px-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
                <div className="min-w-0">
                    <span className="text-caption uppercase text-[var(--text-muted)] tracking-[0.08em]">Document Chat</span>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        Ask, clarify, and extract insights from selected documents.
                    </p>
                </div>
                <button
                    onClick={startNewConversation}
                    className="inline-flex items-center gap-1 text-caption text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors border border-transparent hover:border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1"
                >
                    <Icons.Download />
                    <span>Reset</span>
                </button>
            </div>

            {/* Conversation History Dropdown */}
            {showConversations && (
                <div className="absolute top-full left-0 right-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border)] max-h-60 overflow-y-auto">
                    <div className="p-2">
                        <button
                            onClick={startNewConversation}
                            className="w-full text-left px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--bg-elevated)] rounded-lg transition-all cursor-pointer"
                        >
                            + New Conversation
                        </button>
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => loadConversation(conv.id)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${conversationId === conv.id
                                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <div className="font-medium truncate">{conv.title || 'Untitled Conversation'}</div>
                                <div className="text-xs text-[var(--text-muted)]">{new Date(conv.updated_at).toLocaleDateString()}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Options bar - compact horizontal layout */}
            <div className="px-3 sm:px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-base)] shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0">Style:</span>
                        <div className="flex gap-1">
                            {personalities.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPersonality(p.id)}
                                    className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap ${personality === p.id
                                        ? 'bg-[var(--accent)] text-white shadow-sm'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-px h-6 bg-[var(--border)] hidden sm:block"></div>
                    <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0">Depth:</span>
                        <div className="flex gap-1">
                            {depths.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setDepth(d.id)}
                                    className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap ${depth === d.id
                                        ? 'bg-[var(--accent)] text-white shadow-sm'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area - scrollable with hidden scrollbar */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4"
            >
                <PlannerTaskBanner task={plannerTask} onMarkComplete={onMarkPlannerTaskComplete} />

                {messages.length === 0 && !isTyping && (
                    <div className="h-full flex flex-col items-center justify-center text-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6">
                        <div className="p-3 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                            <Icons.Chat />
                        </div>
                        <p className="text-subhead text-[var(--text-primary)] mt-3">Ready when you are</p>
                        <p className="text-body text-[var(--text-muted)] mt-1">Ask a concept, request a summary, or test your understanding.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex mb-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' ? (
                            <div className="max-w-[92%] sm:max-w-[85%]">
                                <div className="mb-1 px-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Assistant</div>
                                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] rounded-bl-[4px] px-3 sm:px-4 py-2.5 shadow-[var(--shadow-sm)]">
                                        <div
                                            className="text-body leading-[1.65] text-[var(--text-primary)] whitespace-pre-wrap break-words"
                                            dangerouslySetInnerHTML={{ __html: stripMarkdown(msg.content) }}
                                        />
                                        <div className="mt-3 pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => speak(msg.content)}
                                                className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] transition-colors cursor-pointer inline-flex"
                                                title="Read Aloud"
                                            >
                                                <Icons.Speaker active={isSpeaking} />
                                            </button>
                                            <button
                                                onClick={() => handlePinMessage(msg)}
                                                disabled={!msg.id || !!msg.pinned || pinningMessageId === msg.id}
                                                className="px-2 py-1 text-[10px] rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={msg.pinned ? 'Already pinned' : 'Pin this answer'}
                                            >
                                                {pinningMessageId === msg.id ? 'Pinning...' : msg.pinned ? 'Pinned' : 'Pin answer'}
                                            </button>
                                        </div>
                                        {msg.pinError && (
                                            <div className="mt-2 text-[10px] text-[var(--danger)]">{msg.pinError}</div>
                                        )}
                                        {msg.pinned && msg.pinnedLabel && (
                                            <div className="mt-2 text-[10px] text-[var(--accent)]">Saved as: {msg.pinnedLabel}</div>
                                        )}
                                        {msg.references && msg.references.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-[var(--border)]">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Icons.Source />
                                                    <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Sources</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {msg.references.slice(0, 3).map((ref, i) => (
                                                        <div
                                                            key={i}
                                                            title={ref.text_preview}
                                                            className="px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[9px] text-[var(--accent)] font-medium cursor-help"
                                                        >
                                                            {ref.section || `Ref ${i + 1}`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-[92%] sm:max-w-[75%] text-right">
                                <div className="mb-1 px-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">You</div>
                                <div className="inline-block px-3 sm:px-4 py-2.5 rounded-[var(--radius-lg)] rounded-br-[4px] bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]">
                                    <div className="text-body whitespace-pre-wrap break-words">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-3">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-2.5 rounded-[var(--radius-lg)] rounded-bl-[4px] flex items-center gap-2">
                            <div className="flex gap-1">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></motion.div>
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></motion.div>
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></motion.div>
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)]">Thinking...</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - fixed at bottom */}
            <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-[var(--border)] bg-[var(--bg-base)] shrink-0">
                <div className="text-[10px] text-[var(--text-muted)] mb-2 px-1">
                    Tip: Ask specific questions for better answers, e.g. "Explain this concept with examples."
                </div>
                <div className="flex gap-2 sm:gap-3 items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask about your document..."
                        className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={`p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer flex items-center justify-center`}
                        title={isListening ? "Stop Listening" : "Voice Input"}
                    >
                        <Icons.Mic active={isListening} />
                    </button>
                    <button
                        type="submit"
                        className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[var(--accent-hover)] transition-colors"
                        disabled={isTyping || !input.trim()}
                    >
                        <Icons.Send />
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
};

export default ChatTool;
