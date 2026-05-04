import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const StudentChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Izen Fatima',
      message: 'Hey! Can anyone help me with React hooks?',
      timestamp: new Date(Date.now() - 3600000),
      isOnline: true,
    },
    {
      id: 2,
      sender: 'You',
      message: 'Sure! What specifically do you need help with?',
      timestamp: new Date(Date.now() - 3300000),
      isOnline: true,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: 'You',
        message: input,
        timestamp: new Date(),
        isOnline: true,
      };
      setMessages([...messages, newMessage]);
      setInput('');
    }
  };

  const mockStudents = [
    { id: 1, name: 'Izen Fatima', isOnline: true },
    { id: 2, name: 'Jane Smith', isOnline: true },
    { id: 3, name: 'Mike Johnson', isOnline: false },
    { id: 4, name: 'Sarah Williams', isOnline: true },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl mb-2 font-heading">Student Chat</h1>
      <p className="text-gray-400 mb-8">Connect with other students for collaborative learning</p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card-glass p-4">
            <h2 className="text-lg font-semibold mb-4">Online Students</h2>
            <div className="space-y-2">
              {mockStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-cosmic-blue/30 cursor-pointer"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-cosmic-purple rounded-full flex items-center justify-center">
                      {student.name.charAt(0)}
                    </div>
                    {student.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-cosmic-blue"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{student.name}</div>
                    <div className="text-xs text-gray-400">
                      {student.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card-glass p-6 flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      msg.sender === 'You'
                        ? 'bg-cosmic-purple/30'
                        : 'bg-cosmic-blue/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm">{msg.sender}</span>
                      {msg.isOnline && msg.sender !== 'You' && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary px-6">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentChat;

