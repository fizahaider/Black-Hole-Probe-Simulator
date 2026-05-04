import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const FileUpload = ({ onUploadSuccess, disabled = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFilesSelection(files);
        }
    };

    const handleFilesSelection = async (files) => {
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            alert('Please upload PDF files ONLY.');
            return;
        }

        setIsUploading(true);
        setUploadProgress({ current: 0, total: pdfFiles.length });

        try {
            for (let i = 0; i < pdfFiles.length; i++) {
                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
                await onUploadSuccess(pdfFiles[i]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-all duration-300 rounded-2xl border-2 border-dashed p-12 text-center flex flex-col items-center justify-center min-h-[300px] ${
                    disabled 
                        ? 'opacity-50 cursor-not-allowed border-white/5 bg-white/[0.02]' 
                        : isDragging
                            ? 'border-cosmic-purple bg-cosmic-purple/10 shadow-[0_0_30px_rgba(108,92,231,0.2)] cursor-pointer'
                            : 'border-white/10 hover:border-cosmic-purple/40 bg-white/5 cursor-pointer'
                    }`}
                onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && handleFilesSelection(e.target.files)}
                    className="hidden"
                    accept=".pdf"
                    multiple
                />

                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-cosmic-purple border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xl font-heading text-cosmic-purple-light">
                            Processing {uploadProgress.current} of {uploadProgress.total} documents...
                        </p>
                        <p className="text-gray-400 mt-2">Extracting text and preparing AI tools</p>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-cosmic-purple/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl text-cosmic-purple-light">📄</span>
                        </div>
                        <h3 className="text-3xl font-heading mb-3">Upload PDF</h3>
                        <p className="text-gray-400 max-w-sm">
                            Drag and drop your study material here, or click to browse files.
                        </p>
                        <div className="mt-8 flex gap-4 text-xs">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">PDF ONLY</span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">MAX 10MB</span>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default FileUpload;
