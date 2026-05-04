import { motion } from 'framer-motion';
import { FileText, Layers, HelpCircle } from 'lucide-react';

const AuthSlider = ({ currentSlide }) => {
  return (
    <div className="hidden lg:flex w-[45%] h-full bg-[var(--bg-surface)] border-r border-[var(--border)]">
      <div className="h-full w-full flex flex-col justify-between">
        <div className="pt-12 pl-12">
          <h2 className="text-heading text-[var(--text-primary)]">StudyMate</h2>
          <p className="text-body text-[var(--text-secondary)] mt-2">Secure access to your AI study workspace.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="pl-12"
        >
          <h3 className="text-display text-[var(--text-primary)]">Study smarter.</h3>
          <h3 className="text-display text-[var(--accent)]">With confidence.</h3>
          <p className="text-body text-[var(--text-secondary)] max-w-[320px] mt-4">
            One trusted place for notes, quizzes, flashcards, and AI tutoring from your documents.
          </p>
          <div className="w-12 border-t border-[var(--border)] my-6" />
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[var(--accent)]" />
              <span className="text-body text-[var(--text-secondary)]">AI-powered document summaries</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[var(--accent)]" />
              <span className="text-body text-[var(--text-secondary)]">Instant flashcard generation</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle size={14} className="text-[var(--accent)]" />
              <span className="text-body text-[var(--text-secondary)]">Smart quiz creation</span>
            </div>
          </div>
        </motion.div>

        <div className="pb-12 pl-12">
          <p className="text-caption text-[var(--text-muted)]">Built for focused, secure learning.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthSlider;

