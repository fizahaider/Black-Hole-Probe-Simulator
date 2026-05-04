import { useState } from 'react';
import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import { newsletterService } from '../../services/newsletter';
import { parseApiError } from '../../utils/errorHelpers';

const StarryBackground = () => {
  return (
    <>
      <Stars radius={300} depth={60} count={3000} factor={5} fade speed={0.5} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
    </>
  );
};

const CTA = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email.trim()) {
      setLoading(true);
      try {
        await newsletterService.subscribe(email);
        setSubmitted(true);
        setEmail('');
        setTimeout(() => setSubmitted(false), 5000);
      } catch (error) {
        console.error('Newsletter subscription failed:', error);
        alert(parseApiError(error));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <StarryBackground />
        </Canvas>
      </div>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-cosmic-blue/20 backdrop-blur-xl border border-cosmic-purple/30 rounded-2xl p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple/5 to-cosmic-neon/5"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl mb-4 font-heading text-[var(--text-primary)]">
              Stay Updated
            </h2>
            <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
              Get the latest study tips, feature updates, and learning resources delivered to your inbox.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-lg"
              >
                ✓ Successfully subscribed! Check your email.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="flex-1 input-field"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary px-8 py-3 whitespace-nowrap"
                  >
                    {loading ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-4">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
