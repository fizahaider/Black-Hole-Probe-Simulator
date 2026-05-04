import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { authService } from '../../services/authService';
import { parseApiError } from '../../utils/errorHelpers';
import { CheckCircle, AlertCircle, Lock, User, Shield } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await profileService.updateProfile({ name: formData.name });
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(parseApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        setPasswordLoading(true);

        try {
            await authService.updatePassword(
                passwordForm.oldPassword,
                passwordForm.newPassword,
                passwordForm.confirmPassword
            );
            setPasswordSuccess('Password updated successfully.');
            setPasswordForm({
                oldPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (err) {
            setPasswordError(parseApiError(err));
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col"
            >
                <div className="mb-4 sm:mb-6 px-4">
                    <h1 className="text-display text-[var(--text-primary)]">Account Settings</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 flex-1 px-4">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-[var(--shadow-sm)] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <User size={14} className="text-[var(--accent)]" />
                            <h2 className="text-subhead text-[var(--text-primary)]">Profile Info</h2>
                        </div>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center text-heading font-semibold">
                                {(formData.name || formData.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="text-subhead text-[var(--text-primary)] truncate">{formData.name || 'User'}</div>
                                <div className="text-body text-[var(--text-muted)] truncate">{formData.email}</div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">Display Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Email</label>
                                    <Lock size={13} className="text-[var(--text-muted)]" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    readOnly
                                    tabIndex={-1}
                                    className="w-full bg-[var(--bg-base)] border border-transparent rounded-[var(--radius-sm)] px-3 py-2.5 text-body text-[var(--text-muted)] cursor-not-allowed"
                                />
                                <p className="text-caption text-[var(--text-muted)] mt-1.5">Email cannot be changed.</p>
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto sm:min-w-[180px] bg-[var(--accent)] text-white rounded-[var(--radius-sm)] px-5 py-2.5 text-body font-medium hover:opacity-90 disabled:opacity-60"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {success && (
                                <div className="bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-[var(--radius-sm)] px-3 py-2 flex items-center gap-2">
                                    <CheckCircle size={14} className="text-[#22c55e]" />
                                    <span className="text-caption text-[#22c55e]">{success}</span>
                                </div>
                            )}
                            {error && (
                                <div className="bg-[var(--accent-subtle)] border border-[var(--danger)] rounded-[var(--radius-sm)] px-3 py-2 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-[var(--danger)]" />
                                    <span className="text-caption text-[var(--danger)]">{error}</span>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-[var(--shadow-sm)] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield size={14} className="text-[var(--accent)]" />
                            <h2 className="text-subhead text-[var(--text-primary)]">Security</h2>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    name="oldPassword"
                                    value={passwordForm.oldPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="Enter your current password"
                                />
                            </div>

                            <div>
                                <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="Enter a new password"
                                />
                            </div>

                            <div>
                                <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="Re-enter your new password"
                                />
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full sm:w-auto sm:min-w-[190px] bg-[var(--accent)] text-white rounded-[var(--radius-sm)] px-5 py-2.5 text-body font-medium hover:opacity-90 disabled:opacity-60"
                                >
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>

                            {passwordSuccess && (
                                <div className="bg-[rgba(34,197,94,0.1)] border border-[#22c55e] rounded-[var(--radius-sm)] px-3 py-2 flex items-center gap-2">
                                    <CheckCircle size={14} className="text-[#22c55e]" />
                                    <span className="text-caption text-[#22c55e]">{passwordSuccess}</span>
                                </div>
                            )}
                            {passwordError && (
                                <div className="bg-[var(--accent-subtle)] border border-[var(--danger)] rounded-[var(--radius-sm)] px-3 py-2 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-[var(--danger)]" />
                                    <span className="text-caption text-[var(--danger)]">{passwordError}</span>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
