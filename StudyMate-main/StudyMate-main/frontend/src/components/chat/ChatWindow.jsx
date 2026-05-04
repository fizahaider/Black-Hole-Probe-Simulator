import { useState } from 'react';
import { motion } from 'framer-motion';

const ChatWindow = ({ student, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: student.name,
      message: 'Hey! Can you help me with this problem?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: 'You',
        message: input,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 w-96 h-[500px] bg-cosmic-blue/90 backdrop-blur-md border border-cosmic-purple/30 rounded-2xl shadow-2xl z-50 flex flex-col"
    >
      <div className="p-4 border-b border-cosmic-purple/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-cosmic-purple rounded-full flex items-center justify-center">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold">{student.name}</div>
            <div className="text-xs text-gray-400">Online</div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.sender === 'You'
                  ? 'bg-cosmic-purple/30'
                  : 'bg-cosmic-blue/50'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-cosmic-purple/20">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary px-4">
            Send
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ChatWindow;

