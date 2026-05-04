import { useState, useRef, useEffect } from 'react';
import { useDocument } from '../../../context/DocumentContext';
import FeatureLayout from './FeatureLayout';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const ChatView = () => {
    const { selectedDocumentIds, documents } = useDocument();
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! Select documents from the sidebar and ask me anything about them.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [showConversations, setShowConversations] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/document/rag/chat/history/`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
                });
                setConversations(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Failed to load conversations:', error);
            }
        };
        loadConversations();
    }, []);

    const loadConversation = async (convId) => {
        try {
            setConversationId(convId);
            const conv = conversations.find(c => c.id === convId);
            if (conv && conv.messages) {
                const formattedMessages = conv.messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));
                setMessages(formattedMessages);
                setShowConversations(false);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const startNewConversation = () => {
        setConversationId(null);
        setMessages([{ role: 'assistant', content: 'Hello! Select documents from the sidebar and ask me anything about them.' }]);
        setShowConversations(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (selectedDocumentIds.size === 0) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Please select at least one document from the sidebar to chat with. You can also ask me general study questions!" }]);
            return;
        }

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/document/rag/chat/`, {
                message: userMsg.content,
                document_ids: Array.from(selectedDocumentIds),
                conversation_id: conversationId
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
            });

            if (response.data.conversation_id && !conversationId) {
                setConversationId(response.data.conversation_id);
            }

            // Check if response is from general knowledge
            const answer = response.data.answer || response.data.response;
            const queryType = response.data.query_type;
            const sourceIndicator = queryType === 'general_knowledge' 
                ? '\n\n*Note: This answer is based on general knowledge.*' 
                : '';

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: answer + sourceIndicator,
                references: response.data.references,
                queryType: queryType
            }]);
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.error || "I'm having trouble connecting. Please check your connection and try again.";
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Sorry, I encountered an error: ${errorMessage}` 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout title="Multi-Doc Chat" icon="💬" color="cyan-500">
            <div className="flex flex-col h-full relative">
                {}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={() => setShowConversations(!showConversations)}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer border border-white/10"
                        title="Conversation History"
                    >
                        History ({conversations.length})
                    </button>
                </div>

                {}
                {showConversations && (
                    <div className="absolute top-14 right-4 z-20 bg-cosmic-dark border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto min-w-[250px]">
                        <div className="p-2">
                            <button
                                onClick={startNewConversation}
                                className="w-full text-left px-3 py-2 text-sm text-cosmic-purple-light hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            >
                                + New Conversation
                            </button>
                            {conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => loadConversation(conv.id)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${
                                        conversationId === conv.id 
                                            ? 'bg-cyan-500/20 text-white' 
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="font-medium truncate">{conv.title || 'Untitled Conversation'}</div>
                                    <div className="text-xs text-gray-500">{new Date(conv.updated_at).toLocaleDateString()}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] p-4 rounded-2xl shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-cyan-600/20 text-cyan-50 rounded-tr-sm border border-cyan-500/30'
                                    : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/10'}
                            `}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10">
                                <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100" />
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200" />
                                    <span className="text-xs text-gray-400 ml-2">Searching documents...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 border-t border-white/5">
                    {selectedDocumentIds.size > 0 && (
                        <div className="mb-2 text-xs text-cyan-400 flex gap-2">
                            <span>Context: {selectedDocumentIds.size} files selected</span>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={selectedDocumentIds.size > 0 ? "Ask a question..." : "Select documents first..."}
                            disabled={loading}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold p-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                            →
                        </button>
                    </form>
                </div>
            </div>
        </FeatureLayout>
    );
};

export default ChatView;
