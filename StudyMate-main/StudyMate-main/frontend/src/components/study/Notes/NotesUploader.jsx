import { useState } from 'react';
import { motion } from 'framer-motion';

const NotesUploader = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);

    
    setTimeout(() => {
      setUploadedFiles((prev) =>
        prev.map((file) => (file.status === 'processing' ? { ...file, status: 'completed' } : file))
      );
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl mb-2 font-heading">Upload Notes</h1>
      <p className="text-gray-400 mb-8">Upload images or PDFs to extract text using OCR</p>

      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        className={`card-glass p-12 border-2 border-dashed ${
          dragActive ? 'border-cosmic-purple bg-cosmic-purple/10' : 'border-cosmic-purple/30'
        } text-center cursor-pointer transition-all`}
      >
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-2xl mb-2 font-heading">Drag & Drop Files Here</h3>
        <p className="text-gray-400 mb-6">or click to browse</p>
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="btn-primary inline-block cursor-pointer">
          Choose Files
        </label>
        <p className="text-sm text-gray-500 mt-4">Supports: JPG, PNG, PDF</p>
      </motion.div>

      {uploadedFiles.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl mb-4 font-heading">Uploaded Files</h2>
          {uploadedFiles.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-glass p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="font-semibold">{file.name}</div>
                  <div className="text-sm text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {file.status === 'processing' ? (
                  <span className="text-yellow-400">Processing...</span>
                ) : (
                  <span className="text-green-400">✓ Extracted</span>
                )}
                <button className="btn-secondary text-sm">View</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesUploader;

