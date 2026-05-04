import { motion } from 'framer-motion';

const DocumentSidebar = ({ documents, selectedIds, onToggle, onDelete, onUploadNew }) => {
    return (
        <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="card-glass p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-heading text-white">Resources</h3>
                    <span className="text-xs bg-cosmic-purple/20 text-cosmic-purple-light px-2 py-1 rounded-full border border-cosmic-purple/30">
                        {documents.length} Files
                    </span>
                </div>

                <button
                    onClick={onUploadNew}
                    className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2 group"
                >
                    <span className="group-hover:scale-125 transition-transform">+</span> Upload Resource
                </button>

                <div className="space-y-3 mt-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {documents.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No resources uploaded yet.</p>
                    ) : (
                        documents.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => onToggle(doc.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group/item ${selectedIds.includes(doc.id)
                                    ? 'bg-cosmic-purple/20 border-cosmic-purple/50'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(doc.id)
                                    ? 'bg-cosmic-purple border-cosmic-purple'
                                    : 'border-white/20'
                                    }`}>
                                    {selectedIds.includes(doc.id) && (
                                        <span className="text-[10px] text-white">✓</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-200 truncate">{doc.title}</h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                        {doc.file_type} • {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => onDelete(e, doc.id)}
                                    className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all text-gray-500 hover:text-red-400"
                                    title="Delete resource"
                                >
                                    <span className="text-lg">×</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentSidebar;
