import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { parseApiError } from '../../utils/errorHelpers';
import { AlertCircle, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full flex items-center justify-center"
      >
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-5 sm:p-6 text-center">
          <Mail size={32} className="text-[var(--accent)] mx-auto mb-4" />
          <h2 className="text-heading text-[var(--text-primary)] mb-2">Check your inbox</h2>
          <p className="text-body text-[var(--text-secondary)] mb-6">
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
          </p>
          <Link to="/auth?tab=signin" className="text-caption text-[var(--accent)] hover:underline">
            Back to sign in
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full flex items-center justify-center"
    >
      <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-heading text-[var(--text-primary)]">Reset your password</h2>
          <p className="text-body text-[var(--text-secondary)] mt-1">
            Enter your email and we'll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-sm)] p-3 flex items-center gap-2 mb-4">
              <AlertCircle size={14} className="text-[var(--danger)]" />
              <span className="text-body text-[var(--danger)]">{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field w-full px-3 py-2.5"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-5 text-center text-caption text-[var(--text-secondary)]">
          <Link to="/auth?tab=signin" className="text-[var(--accent)] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default ForgotPassword;

