import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const AISection = () => {
  return (
    <section id="ai-assistant" className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl mb-6 font-heading text-[var(--text-primary)]">
              Your AI Study Assistant
            </h2>
            <p className="text-xl text-[var(--text-secondary)] mb-6">
              Get instant help with your studies from our intelligent AI assistant. Available 24/7 to answer questions, explain concepts, and help you plan your study sessions.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Explain complex concepts in simple terms',
                'Answer study questions instantly',
                'Help plan and organize study sessions',
                'Summarize long texts and notes',
                'Provide personalized learning tips',
              ].map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <span className="text-cosmic-purple text-xl">✓</span>
                  <span className="text-[var(--text-secondary)]">{feature}</span>
                </motion.li>
              ))}
            </ul>
            <Link to="/auth" className="btn-primary">
              Try AI Assistant Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="card-glass p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cosmic-purple/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-[var(--text-secondary)]">AI Assistant Online</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-cosmic-blue/50 p-4 rounded-lg">
                    <p className="text-sm mb-1 text-[var(--text-secondary)]">AI Assistant</p>
                    <p className="text-[var(--text-primary)]">Hello! I'm here to help you with your studies. What would you like to learn today?</p>
                  </div>
                  <div className="bg-cosmic-purple/30 p-4 rounded-lg ml-8">
                    <p className="text-sm mb-1 text-[var(--text-secondary)]">You</p>
                    <p className="text-[var(--text-primary)]">Can you explain quantum physics in simple terms?</p>
                  </div>
                  <div className="bg-cosmic-blue/50 p-4 rounded-lg">
                    <p className="text-sm mb-1 text-[var(--text-secondary)]">AI Assistant</p>
                    <p className="text-[var(--text-primary)]">Absolutely! Quantum physics is the study of matter and energy at the smallest scales...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AISection;

