import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(formData.name, formData.email, formData.password, formData.confirmPassword);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full flex items-center justify-center"
    >
      <div className="w-full">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-heading text-[var(--text-primary)]">Create your account</h2>
          <p className="text-body text-[var(--text-secondary)] mt-1">Set up your workspace in less than a minute.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-sm)] p-3 flex items-center gap-2 mb-4">
              <AlertCircle size={14} className="text-[var(--danger)]" />
              <span className="text-body text-[var(--danger)]">{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field w-full px-3 py-2.5"
              placeholder="Izen Fatima"
            />
          </div>

          <div className="mb-4">
            <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field w-full px-3 py-2.5"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Password</label>
            <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input-field w-full px-3 py-2.5 pr-10"
              placeholder="••••••••"
            />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium mb-1.5">Confirm Password</label>
            <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="input-field w-full px-3 py-2.5 pr-10"
              placeholder="••••••••"
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
            disabled={loading}
            className="btn-primary w-full py-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-5 text-center text-caption text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/auth?tab=signin" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SignUp;

