import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpace } from '../../context/SpaceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Calendar, FolderOpen, X, MoreVertical } from 'lucide-react';

const KnowledgeSpacesOverview = () => {
    const { spaces, currentSpace, selectSpace, removeSpace, addSpace, updateSpace, loading } = useSpace();
    const navigate = useNavigate();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCreateSpace = async (e) => {
        e.preventDefault();
        if (!newSpaceName.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            await addSpace(newSpaceName.trim(), '');
            setNewSpaceName('');
            setShowAddModal(false);
        } catch (err) {
            setError(err.message || 'Failed to create space');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenameSpace = async (e) => {
        e.preventDefault();
        if (!newSpaceName.trim() || !selectedSpace) return;

        setIsLoading(true);
        setError(null);
        try {
            await updateSpace(selectedSpace.id, {
                name: newSpaceName.trim(),
                description: selectedSpace.description || ''
            });
            setNewSpaceName('');
            setShowRenameModal(false);
            setSelectedSpace(null);
        } catch (err) {
            setError(err.message || 'Failed to rename space');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSpace = async () => {
        if (!selectedSpace) return;

        setIsLoading(true);
        setError(null);
        try {
            await removeSpace(selectedSpace.id);
            setShowDeleteConfirm(false);
            setSelectedSpace(null);
        } catch (err) {
            setError(err.message || 'Failed to delete space');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpaceCardClick = (space) => {
        selectSpace(space);
        navigate('/dashboard/study');
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                {}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 flex items-end justify-between gap-4"
                >
                    <div>
                        <h1 className="text-display text-[var(--text-primary)]">Knowledge Spaces</h1>
                        <p className="text-body text-[var(--text-secondary)] mt-1">Your study workspaces</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Space
                    </button>
                </motion.div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={`space-skeleton-${index}`}
                                    className="h-[120px] bg-[var(--bg-elevated)] rounded-[var(--radius-md)] animate-pulse"
                                />
                            ))
                        ) : spaces && spaces.length > 0 ? (
                            spaces.map((space, index) => (
                                <motion.div
                                    key={space.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    className="group h-full"
                                >
                                    <div
                                        onClick={() => handleSpaceCardClick(space)}
                                        className={`h-full relative bg-[var(--bg-surface)] border rounded-[var(--radius-md)] p-5 cursor-pointer transition-[border-color,box-shadow] duration-200 flex flex-col ${currentSpace?.id === space.id ? 'border-[var(--accent)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:shadow-[var(--shadow-sm)]'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <h3 className="text-subhead text-[var(--text-primary)] truncate flex-1">{space.name}</h3>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === space.id ? null : space.id);
                                                        setDeleteConfirmId(null);
                                                    }}
                                                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)]"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenuId === space.id && (
                                                    <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-[var(--shadow-md)] z-50 overflow-hidden">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedSpace(space);
                                                                setNewSpaceName(space.name);
                                                                setShowRenameModal(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                                                        >
                                                            <Pencil size={15} />
                                                            <span>Rename</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedSpace(space);
                                                                setShowDeleteConfirm(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-body text-[var(--danger)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                                                        >
                                                            <Trash2 size={15} />
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mb-4 text-caption text-[var(--text-muted)]">
                                            <div className="text-caption text-[var(--text-muted)]">
                                                {(space.document_count || space.documents_count || space.docs_count) ? `${space.document_count || space.documents_count || space.docs_count} documents` : ''}
                                            </div>
                                            <div className="text-caption text-[var(--text-muted)] inline-flex items-center gap-1">
                                                <Calendar size={12} />
                                                {space.created_at ? formatDate(space.created_at) : `#${index + 1}`}
                                            </div>
                                        </div>

                                            <div className="mt-auto pt-4 border-t border-[var(--border)]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSpaceCardClick(space);
                                                    }}
                                                    className="inline-flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-caption text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                                                >
                                                    Open
                                                </button>
                                            </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full"
                            >
                                <div className="rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--border)] p-12 bg-transparent flex flex-col items-center gap-3 text-center">
                                    <FolderOpen size={40} className="text-[var(--text-muted)]" />
                                    <h3 className="text-subhead text-[var(--text-primary)] mt-1">No spaces yet</h3>
                                    <p className="text-body text-[var(--text-secondary)]">
                                        Create your first knowledge space to get started.
                                    </p>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="btn-primary inline-flex items-center gap-2 mt-2"
                                    >
                                        <Plus size={16} />
                                        New Space
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="fixed bottom-4 right-4 bg-[var(--bg-surface)] border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-[var(--radius-sm)]"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 w-[400px] max-w-[90vw] shadow-[var(--shadow-md)]"
                        >
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                aria-label="Close create space modal"
                            >
                                <X size={16} />
                            </button>
                            <h2 className="text-heading text-[var(--text-primary)]">Create New Space</h2>
                            <form onSubmit={handleCreateSpace}>
                                <div className="mt-4">
                                    <label className="text-body text-[var(--text-secondary)]">
                                        Space Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newSpaceName}
                                        onChange={(e) => setNewSpaceName(e.target.value)}
                                        placeholder="e.g., Advanced Physics"
                                        className="input-field w-full mt-4"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !newSpaceName.trim()}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {}
            <AnimatePresence>
                {showRenameModal && selectedSpace && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] flex items-center justify-center z-50 p-4"
                        onClick={() => setShowRenameModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 w-[400px] max-w-[90vw] shadow-[var(--shadow-md)]"
                        >
                            <button
                                type="button"
                                onClick={() => setShowRenameModal(false)}
                                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                aria-label="Close rename modal"
                            >
                                <X size={16} />
                            </button>
                            <h2 className="text-heading text-[var(--text-primary)]">Rename Space</h2>
                            <form onSubmit={handleRenameSpace}>
                                <div className="mt-4">
                                    <label className="text-body text-[var(--text-secondary)]">
                                        New Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newSpaceName}
                                        onChange={(e) => setNewSpaceName(e.target.value)}
                                        className="input-field w-full mt-4"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowRenameModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !newSpaceName.trim()}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Renaming...' : 'Rename'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {}
            <AnimatePresence>
                {showDeleteConfirm && selectedSpace && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 w-[400px] max-w-[90vw] shadow-[var(--shadow-md)]"
                        >
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                aria-label="Close delete modal"
                            >
                                <X size={16} />
                            </button>
                            <h2 className="text-heading text-[var(--text-primary)] mb-2">Delete Space?</h2>
                            <p className="text-body text-[var(--text-secondary)] mb-6">
                                Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{selectedSpace.name}"</span>?
                            </p>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSpace}
                                    disabled={isLoading}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--danger)] hover:bg-[var(--danger)]"
                                >
                                    {isLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default KnowledgeSpacesOverview;
