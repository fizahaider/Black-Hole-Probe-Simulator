import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { parseApiError } from '../../utils/errorHelpers';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const ResetPasswordConfirm = () => {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!uidb64 || !token) {
            setError('Invalid password reset link');
        }
    }, [uidb64, token]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await authService.confirmPasswordReset(
                uidb64,
                token,
                formData.newPassword,
                formData.confirmPassword
            );
            setSuccess(true);
            setTimeout(() => {
                navigate('/auth?tab=signin');
            }, 3000);
        } catch (err) {
            setError(parseApiError(err));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[var(--bg-base)]"
            >
                <div className="w-full max-w-[420px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-6 text-center">
                    <CheckCircle size={32} className="text-[var(--success)] mx-auto mb-4" />
                    <h2 className="text-heading text-[var(--text-primary)] mb-2">Password updated</h2>
                    <p className="text-body text-[var(--text-secondary)]">
                        Redirecting you to sign in...
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[var(--bg-base)]"
        >
            <div className="w-full max-w-[420px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-5 sm:p-6">
                <div className="mb-6">
                    <h2 className="text-heading text-[var(--text-primary)]">Set new password</h2>
                    <p className="text-body text-[var(--text-secondary)] mt-1">
                        Choose a strong password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-sm)] p-3 flex items-center gap-2 mb-4">
                            <AlertCircle size={14} className="text-[var(--danger)]" />
                            <span className="text-body text-[var(--danger)]">{error}</span>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">New Password</label>
                        <div className="relative">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                            className="input-field w-full px-3 py-2.5 pr-10"
                            placeholder="••••••••"
                            disabled={!uidb64 || !token}
                        />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Confirm New Password</label>
                        <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="input-field w-full px-3 py-2.5 pr-10"
                            placeholder="••••••••"
                            disabled={!uidb64 || !token}
                        />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !uidb64 || !token}
                        className="btn-primary w-full py-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <p className="mt-5 text-center text-caption text-[var(--text-secondary)]">
                    Remember your password?{' '}
                    <Link to="/auth?tab=signin" className="text-[var(--accent)] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </motion.div>
    );
};

export default ResetPasswordConfirm;
