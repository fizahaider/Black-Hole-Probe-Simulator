import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../../services/documentService';
import { useDocument } from '../../context/DocumentContext';
import { useSpace } from '../../context/SpaceContext';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

const UploadArea = ({ onUploadComplete }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { refreshDocuments, setLoading, addDocument } = useDocument();
    const { currentSpace } = useSpace();

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        
        const allowedExtensions = ['.pdf', '.txt', '.docx', '.docs', '.pptx'];
        const fileName = (file.name || '').toLowerCase();
        const hasAllowedExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
        if (!hasAllowedExtension) {
            setError('Only PDF, TXT, DOCX, and PPTX files are currently supported.');
            return;
        }

        setIsUploading(true);
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await documentService.upload(file, currentSpace?.id);

            const tempDoc = {
                name: file.name,
                title: file.name,
                text: response.text,
                page_count: response.page_count,
                uploadedAt: new Date().toISOString()
            };

            addDocument(tempDoc);

            
            setSuccess(true);

            
            
            setTimeout(() => {
                refreshDocuments();
            }, 500);

            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error("Upload failed", err);
            setError(err.response?.data?.error || "Failed to upload document. Please try again.");
        } finally {
            setIsUploading(false);
            setLoading(false);
        }
    }, [refreshDocuments, setLoading, addDocument]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx', '.docs'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
        }
    });

    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => {
            onUploadComplete?.();
        }, 1500);
        return () => clearTimeout(timer);
    }, [success, onUploadComplete]);

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`
                    relative border-[1.5px] border-dashed rounded-[var(--radius-md)] p-6 text-center cursor-pointer
                    transition-all duration-150
                    ${isDragActive
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : success
                            ? 'border-[var(--success)] bg-transparent'
                            : error
                                ? 'border-[var(--danger)] bg-transparent'
                                : 'border-[var(--border)] bg-transparent hover:border-[var(--accent)]'}
                `}
            >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                    {isUploading ? (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-2"
                        >
                            <UploadCloud size={24} className="text-[var(--text-muted)]" />
                            <p className="text-caption text-[var(--text-muted)]">Uploading...</p>
                        </motion.div>
                    ) : success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-2"
                        >
                            <CheckCircle size={24} className="text-[var(--success)]" />
                            <p className="text-body text-[var(--success)]">Upload complete</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-2"
                        >
                            <AlertCircle size={24} className="text-[var(--danger)]" />
                            <p className="text-body text-[var(--danger)]">{error}</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <UploadCloud size={24} className={`${isDragActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                            <p className={`text-body ${isDragActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                                {isDragActive ? "Drop files here or click to upload" : "Drop files here or click to upload"}
                            </p>
                            <p className={`text-caption ${isDragActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                PDF, DOCX, TXT, PPTX supported
                            </p>
                            {currentSpace && (
                                <p className="text-caption text-[var(--text-muted)]">
                                    Uploading to: {currentSpace.name}
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                {isUploading && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--bg-elevated)] overflow-hidden rounded-b-[var(--radius-md)]">
                        <div className="h-full bg-[var(--accent)] animate-[upload-progress_1.5s_ease-in-out_infinite]" />
                    </div>
                )}
            </div>

            <style>{`
                @keyframes upload-progress {
                    0% { width: 0%; }
                    100% { width: 90%; }
                }
            `}</style>
        </div>
    );
};

export default UploadArea;
