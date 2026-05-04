import { useState } from 'react';
import { motion } from 'framer-motion';

const OCRProcessor = () => {
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);

  const mockExtractedText = `Sample extracted text from OCR:
  
This is a demonstration of how OCR text extraction works.
The system can extract text from images and PDFs.

Key features:
- Handwritten text recognition
- Printed text extraction
- Multi-language support
- High accuracy`;

  const handleProcess = () => {
    setProcessing(true);
    setTimeout(() => {
      setExtractedText(mockExtractedText);
      setProcessing(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl mb-2 font-heading">OCR Text Extraction</h1>
      <p className="text-gray-400 mb-8">Process uploaded images and extract text</p>

      <div className="card-glass p-6 mb-6">
        <button onClick={handleProcess} disabled={processing} className="btn-primary mb-4">
          {processing ? 'Processing...' : 'Process Files'}
        </button>
        {processing && (
          <div className="flex items-center space-x-2 text-cosmic-purple-light">
            <div className="animate-spin">⏳</div>
            <span>Extracting text from images...</span>
          </div>
        )}
      </div>

      {extractedText && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-6"
        >
          <h2 className="text-2xl mb-4 font-heading">Extracted Text</h2>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            className="w-full h-64 input-field"
            placeholder="Extracted text will appear here..."
          />
          <div className="flex gap-4 mt-4">
            <button className="btn-primary">Save as Note</button>
            <button className="btn-secondary">Generate Quiz</button>
            <button className="btn-secondary">Create Flashcards</button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OCRProcessor;

