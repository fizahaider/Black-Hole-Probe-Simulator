import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../../context/ChatContext';

const Chatbot = () => {
  const { messages, isOpen, sendMessage, toggleChat } = useChat();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatbotWrapperRef = useRef(null);

  const defaultQuestions = [
    "Who are you?",
    "How can you help me?",
    "What features do you have?",
    "Help me with quiz preparation"
  ];

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatbotWrapperRef.current && !chatbotWrapperRef.current.contains(event.target)) {
        const button = document.querySelector('[data-chatbot-button]');
        if (button && !button.contains(event.target)) {
          toggleChat();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, toggleChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      sendMessage(input);
      setInput('');
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleQuestionClick = (question) => {
    sendMessage(question);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleChatScroll = (e) => {
    e.stopPropagation();
  };

  const showSuggestions = messages.length === 1;

  return (
    <>
      <motion.button
        data-chatbot-button
        onClick={toggleChat}
        className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[9999] p-4 rounded-full shadow-[0_0_20px_rgba(108,92,231,0.4)] bg-cosmic-purple text-white hover:bg-cosmic-purple-light transition-all duration-300 ease-out cursor-pointer
          ${isOpen ? 'scale-75 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-110'}`}
        whileHover={!isOpen ? { scale: 1.1 } : {}}
        whileTap={{ scale: 0.9 }}
        aria-label="Open Chat"
      >
        <span className="text-2xl">💬</span>
      </motion.button>

      <motion.div
        ref={chatbotWrapperRef}
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.95,
          y: isOpen ? 0 : 10,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed z-[9999] flex flex-col bg-cosmic-dark/95 backdrop-blur-xl border border-cosmic-purple/20 shadow-2xl transition-all duration-300 ease-out origin-bottom-right
          ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
          inset-0 sm:inset-auto sm:top-0 sm:right-8 sm:w-[400px] sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl sm:mt-4`}
        aria-hidden={!isOpen}
      >
        <header className="p-5 flex justify-between items-center shrink-0 border-b border-cosmic-purple/10 bg-gradient-to-r from-cosmic-purple/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cosmic-purple/20 flex items-center justify-center border border-cosmic-purple/30">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">AI Study Assistant</h3>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleChat}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
            aria-label="Close Chat"
          >
            <span className="text-xl">✕</span>
          </button>
        </header>

        <div
          className="flex-grow p-5 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onWheel={handleChatScroll}
          onTouchMove={handleChatScroll}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isAI ? 'justify-start' : 'justify-end'}`}
            >
              {message.isAI && (
                <span className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-cosmic-blue/50 border border-cosmic-purple/20 mt-1">
                  <span className="text-sm">🤖</span>
                </span>
              )}

              <div className={`flex flex-col max-w-[85%] ${message.isAI ? 'items-start' : 'items-end'}`}>
                <div
                  className={`p-3.5 text-sm leading-relaxed shadow-md backdrop-blur-sm
                  ${message.isAI
                      ? 'bg-cosmic-blue/50 text-white rounded-2xl rounded-tl-sm border border-cosmic-purple/20'
                      : 'bg-cosmic-purple/50 text-white rounded-2xl rounded-tr-sm'
                    }`}
                >
                  {message.message}
                </div>
                <span className="text-[10px] text-gray-500 mt-1.5 px-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>

              {!message.isAI && (
                <span className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-cosmic-purple/20 border border-cosmic-purple/30 mt-1">
                  <span className="text-sm">👤</span>
                </span>
              )}
            </div>
          ))}

          {showSuggestions && (
            <div className="grid gap-2 mt-2">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider text-center mb-1">
                Suggested
              </p>
              {defaultQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestionClick(q)}
                  className="text-left text-xs text-cosmic-purple-light bg-cosmic-purple/10 border border-cosmic-purple/20 hover:bg-cosmic-purple/20 hover:border-cosmic-purple/40 px-4 py-2.5 rounded-xl transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {isTyping && (
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-cosmic-blue/50 border border-cosmic-purple/20">
                <span className="text-sm">🤖</span>
              </span>
              <div className="bg-cosmic-blue/30 border border-cosmic-purple/20 p-4 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-cosmic-purple-light rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-cosmic-purple-light rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-cosmic-purple-light rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <footer className="p-4 border-t border-cosmic-purple/10 bg-cosmic-dark/50">
          <form onSubmit={handleSend} className="flex items-center gap-2 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-grow pl-5 pr-12 py-3.5 bg-cosmic-blue/30 text-white text-sm border border-cosmic-purple/20 rounded-full focus:outline-none focus:border-cosmic-purple/50 focus:bg-cosmic-blue/40 transition-all placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="absolute right-2 p-2 bg-cosmic-purple text-white rounded-full hover:bg-cosmic-purple-light transition-colors disabled:opacity-50 disabled:hover:bg-cosmic-purple disabled:cursor-not-allowed cursor-pointer"
              disabled={isTyping || !input.trim()}
              aria-label="Send"
            >
              <span className="text-lg">➤</span>
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-600">Powered by Studymate AI</span>
          </div>
        </footer>
      </motion.div>
    </>
  );
};

export default Chatbot;