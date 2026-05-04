import React from 'react';

const MarkdownRenderer = ({ content, onCitationClick }) => {
    if (!content) return null;

    // Helper to sanitize and process basic markdown
    const processMarkdown = (text) => {
        // ... (JSON handling same as before)
        let cleanText = text;
        try {
            const parsed = JSON.parse(text);
            if (parsed.summary) cleanText = parsed.summary;
            else if (parsed.response) cleanText = parsed.response;
            else if (parsed.content) cleanText = parsed.content;
        } catch (e) {
            // Not JSON, continue
        }

        // 2. Simple regex based markdown parsing
        const lines = cleanText.split('\n');
        return lines.map((line, index) => {
            // Headers
            if (line.startsWith('### ')) {
                return <h4 key={index} className="text-lg font-bold mt-4 mb-2 text-cosmic-purple-light">{line.substring(4)}</h4>;
            }
            if (line.startsWith('## ')) {
                return <h3 key={index} className="text-xl font-bold mt-6 mb-3 text-white border-b border-white/10 pb-1">{line.substring(3)}</h3>;
            }
            if (line.startsWith('# ')) {
                return <h2 key={index} className="text-2xl font-black mt-8 mb-4 text-white uppercase tracking-tight">{line.substring(2)}</h2>;
            }

            // Bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const contentText = line.trim().substring(2);
                return (
                    <div key={index} className="flex gap-2 ml-4 mb-1">
                        <span className="text-cosmic-purple-light">•</span>
                        <span className="text-gray-300">{renderInline(contentText)}</span>
                    </div>
                );
            }

            // Empty line
            if (line.trim() === '') {
                return <div key={index} className="h-2"></div>;
            }

            // Regular paragraph
            return <p key={index} className="text-gray-300 leading-relaxed mb-2">{renderInline(line)}</p>;
        });
    };

    // Helper to handle inline markdown (Bold, Italic, Citations)
    const renderInline = (text) => {
        if (typeof text !== 'string') return text;
        
        // Match **bold** and [^Source N]
        const boldRegex = /\*\*(.*?)\*\*/g;
        const citationRegex = /\[\^Source (\d+)\]/g;
        
        const matches = [];
        let match;

        // Collect all matches
        while ((match = boldRegex.exec(text)) !== null) {
            matches.push({ type: 'bold', text: match[1], index: match.index, length: match[0].length });
        }
        while ((match = citationRegex.exec(text)) !== null) {
            matches.push({ type: 'citation', label: `Source ${match[1]}`, index: match.index, length: match[0].length });
        }

        // Sort matches by index
        matches.sort((a, b) => a.index - b.index);

        if (matches.length === 0) return text;

        const parts = [];
        let currentPos = 0;

        matches.forEach((m, i) => {
            // Add text before match
            if (m.index > currentPos) {
                parts.push(text.substring(currentPos, m.index));
            }

            // Add match
            if (m.type === 'bold') {
                parts.push(<strong key={i} className="text-white font-semibold">{m.text}</strong>);
            } else if (m.type === 'citation') {
                parts.push(
                    <button 
                        key={i}
                        onClick={() => onCitationClick?.(m.label)}
                        className="inline-flex items-center justify-center bg-cosmic-purple/30 hover:bg-cosmic-purple/50 text-cosmic-purple-light text-[10px] px-1.5 rounded-sm ml-1 align-top cursor-pointer transition-colors border border-cosmic-purple/20"
                        title={`Go to ${m.label}`}
                    >
                        {m.label.replace('Source ', '')}
                    </button>
                );
            }

            currentPos = m.index + m.length;
        });

        // Add remaining text
        if (currentPos < text.length) {
            parts.push(text.substring(currentPos));
        }

        return parts;
    };

    return (
        <div className="markdown-content">
            {processMarkdown(content)}
        </div>
    );
};

export default MarkdownRenderer;
