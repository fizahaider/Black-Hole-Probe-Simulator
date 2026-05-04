export const renderMarkdown = (text) => {
    if (!text) return '';

    
    const html = text
        .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-2 text-[var(--text-primary)]">$1</h4>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-[var(--text-primary)]">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-2 text-[var(--text-primary)] border-b border-[var(--border)] pb-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3 text-[var(--text-primary)]">$1</h1>')
        
        .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-[var(--accent)] pl-4 italic text-[var(--text-secondary)] my-3">$1</blockquote>')
        
        .replace(/\*\*([^*]+)\*\*/gim, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
        .replace(/\*([^*]+)\*/gim, '<em class="italic text-[var(--text-secondary)]">$1</em>')
        
        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-[var(--text-secondary)] mb-1">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-[var(--text-secondary)] mb-1">$1</li>')
        
        .replace(/`([^`]+)`/gim, '<code class="bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded text-[var(--code-text)] font-mono text-sm">$1</code>')
        
        .replace(/\n\n+/gim, '</p><p class="mb-3">')
        .replace(/\n/gim, ' ');

    return `<div class="markdown-body"><p class="mb-3">${html}</p></div>`;
};

export const stripMarkdown = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '- ')
        .replace(/\*\*([^*]+)\*\*/gim, '$1')
        .replace(/\*([^*]+)\*/gim, '$1')
        .replace(/`([^`]+)`/gim, '$1')
        .replace(/^>\s*/gm, '')
        .replace(/\[(.*?)\]\(.*?\)/gim, '$1')
        .replace(/\n{2,}/gim, '\n\n')
        .trim()
        .replace(/\n/gm, '<br/>');
};
export const generatePDF = (title, content, type = 'summary') => {
    try {
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            alert('Please allow popups for this site to download PDFs. Alternatively, use the text download option.');
            return;
        }

        let formattedContent = '';
        if (type === 'flashcards' && Array.isArray(content)) {
            formattedContent = content.map(card => `
            <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #d1d5db; border-radius: 8px; page-break-inside: avoid;">
                <div style="font-weight: 800; color: #6366f1; text-transform: uppercase; font-size: 10px; margin-bottom: 8px;">Front</div>
                <div style="font-size: 18px; margin-bottom: 20px; color: #1f2937;">${card.front}</div>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <div style="font-weight: 800; color: #6366f1; text-transform: uppercase; font-size: 10px; margin-bottom: 8px;">Back</div>
                <div style="font-size: 16px; color: #1f2937;">${card.back}</div>
            </div>
        `).join('');
        } else if (type === 'quiz' && Array.isArray(content)) {
            formattedContent = content.map((q, i) => `
            <div style="margin-bottom: 40px; page-break-inside: avoid;">
                <h3 style="font-size: 18px; margin-bottom: 15px; color: #1f2937;">Question ${i + 1}: ${q.question}</h3>
                <div style="margin-left: 20px;">
                    ${q.options.map((opt, j) => `
                        <div style="margin-bottom: 10px; color: ${opt === q.correct_answer ? '#059669' : '#1f2937'}; font-weight: ${opt === q.correct_answer ? '600' : '400'}">
                            <strong>${String.fromCharCode(65 + j)})</strong> ${opt} 
                            ${opt === q.correct_answer ? '<span style="font-size: 10px; font-weight: bold; margin-left: 10px;">(✓ Correct)</span>' : ''}
                        </div>
                    `).join('')}
                </div>
                ${q.hint ? `<div style="margin-top: 15px; font-style: italic; color: #6b7280; font-size: 13px;">Hint: ${q.hint}</div>` : ''}
            </div>
        `).join('');
        } else {
            // Fallback for Markdown/Text
            formattedContent = `<div style="line-height: 1.6; color: #1f2937;">${content.replace(/\n/g, '<br/>')}</div>`;
        }

        printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1f2937; }
                    .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
                    .brand { color: #6366f1; font-weight: 800; font-size: 24px; }
                    .title { font-size: 28px; font-weight: 700; color: #1f2937; }
                    .footer { margin-top: 50px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">${title}</div>
                    <div class="brand">StudyMate</div>
                </div>
                <div class="content">${formattedContent}</div>
                <div class="footer">Generated by StudyMate AI • ${new Date().toLocaleDateString()}</div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 100);
                    };
                </script>
            </body>
        </html>
    `);
        printWindow.document.close();
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF. Please try again or check your browser settings.');
    }
};

export const downloadContent = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
