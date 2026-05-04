import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudy } from '../../../context/StudyContext';

const NotesEditor = () => {
  const { notes, addNote } = useStudy();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');

  const handleSave = () => {
    if (title && content) {
      const newNote = {
        id: Date.now(),
        title,
        subject: subject || 'General',
        content,
        createdAt: new Date().toISOString(),
      };
      addNote(newNote);
      setTitle('');
      setContent('');
      setSubject('');
      alert('Note saved successfully!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-2 font-heading">My Notes</h1>
          <p className="text-gray-400">Create and manage your study notes</p>
        </div>
        <button className="btn-primary">New Note</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card-glass p-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="input-field mb-4 text-2xl font-bold"
            />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (optional)"
              className="input-field mb-4"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your notes here..."
              className="input-field h-96 resize-none"
            />
            <div className="flex gap-4 mt-4">
              <button onClick={handleSave} className="btn-primary">
                Save Note
              </button>
              <button className="btn-secondary">Generate Summary</button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Notes</h2>
          <div className="space-y-4">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                whileHover={{ scale: 1.02 }}
                className="card-glass p-4 cursor-pointer"
              >
                <h3 className="font-semibold mb-1">{note.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{note.subject}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{note.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;

