import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotebook } from '../../context/NotebookContext';

const SpacesList = () => {
    const { spaces, activeSpace, switchSpace, deleteSpace, updateSpace, createSpace } = useNotebook();
    const navigate = useNavigate();
    const [editingSpace, setEditingSpace] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleOpenSpace = (id) => {
        switchSpace(id);
        navigate('/dashboard/study');
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this Knowledge Space? All associated documents and progress will be lost.')) {
            try {
                await deleteSpace(id);
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleEdit = (e, space) => {
        e.stopPropagation();
        setEditingSpace({ ...space });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await updateSpace(editingSpace.id, editingSpace);
            setEditingSpace(null);
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-heading">Your Knowledge Spaces</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary px-4 py-2 text-sm"
                >
                    + New Space
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map((space, index) => (
                    <motion.div
                        key={space.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleOpenSpace(space.id)}
                        className={`card-glass p-6 cursor-pointer group hover:border-cosmic-purple/50 transition-all relative overflow-hidden ${activeSpace?.id === space.id ? 'border-cosmic-purple bg-cosmic-purple/5' : ''
                            }`}
                    >
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-400">
                                    {space.subject}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleEdit(e, space)}
                                        className="text-gray-500 hover:text-white transition-colors"
                                        title="Edit Space"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, space.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                        title="Delete Space"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-heading mb-2 group-hover:text-cosmic-purple-light transition-colors">
                                {space.name}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                                {space.goal}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Rigor: {space.difficulty}</span>
                                <span className="text-cosmic-purple-light opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Space →
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {spaces.length === 0 && (
                    <div className="col-span-full py-12 text-center card-glass bg-white/5 border-dashed">
                        <p className="text-gray-500">No Knowledge Spaces yet. Create one to get started!</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingSpace && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="card-glass p-8 max-w-md w-full relative">
                            <button onClick={() => setEditingSpace(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                            <h2 className="text-2xl font-heading mb-6">Edit Knowledge Space</h2>
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-1 block">Space Name</label>
                                    <input
                                        value={editingSpace.name}
                                        onChange={(e) => setEditingSpace({ ...editingSpace, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-1 block">Subject</label>
                                    <input
                                        value={editingSpace.subject}
                                        onChange={(e) => setEditingSpace({ ...editingSpace, subject: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-1 block">Learning Goal</label>
                                    <textarea
                                        value={editingSpace.goal}
                                        onChange={(e) => setEditingSpace({ ...editingSpace, goal: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none h-24"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase mb-1 block">Difficulty</label>
                                    <select
                                        value={editingSpace.difficulty}
                                        onChange={(e) => setEditingSpace({ ...editingSpace, difficulty: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary w-full py-3 mt-4">Save Changes</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="card-glass p-8 max-w-md w-full relative">
                            <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                            <h2 className="text-2xl font-heading mb-6">Create Knowledge Space</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                try {
                                    await createSpace({
                                        name: formData.get('name'),
                                        subject: formData.get('subject'),
                                        goal: formData.get('goal'),
                                        difficulty: formData.get('difficulty')
                                    });
                                    setIsCreating(false);
                                } catch (error) {
                                    alert(error.message);
                                }
                            }} className="space-y-4">
                                <input name="name" placeholder="Space Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                                <input name="subject" placeholder="Subject" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" required />
                                <textarea name="goal" placeholder="Learning Goal" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none h-24" required />
                                <select name="difficulty" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                                <button type="submit" className="btn-primary w-full py-3 mt-4">Create Space</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpacesList;
