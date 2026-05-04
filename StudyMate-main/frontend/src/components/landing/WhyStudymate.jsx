import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const WhyStudymate = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const reasons = [
    {
      title: 'AI-Powered Learning',
      description: 'Get instant help from our AI assistant, available 24/7 to answer your questions and explain complex concepts.',
      visual: 'ai',
    },
    {
      title: 'Smart Organization',
      description: 'Keep all your study materials organized with our intelligent note-taking and content management system.',
      visual: 'organization',
    },
    {
      title: 'Active Learning',
      description: 'Engage with interactive quizzes, flashcards, and writing exercises to reinforce your understanding.',
      visual: 'learning',
    },
    {
      title: 'Collaborative Study',
      description: 'Connect with other students, form study groups, and learn together in real-time chat sessions.',
      visual: 'collaboration',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reasons.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const AIVisual = ({ isActive }) => (
    <div className="relative w-full h-40 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
      <motion.div
        animate={isActive ? { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"
      />
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {[...Array(9)].map((_, i) => (
          <motion.div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i === 4 ? 'bg-cyan-400' : 'bg-white/20'}`}
            animate={isActive ? { scale: i === 4 ? [1, 1.5, 1] : [1, 0.8, 1], opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );

  const OrganizationVisual = ({ isActive }) => (
    <div className="relative w-full h-40 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
      <div className="flex flex-col gap-2 w-1/2">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full bg-white/20"
            initial={{ width: "100%", opacity: 0.2 }}
            animate={isActive ? { width: ["100%", "60%", "100%"], opacity: 0.5 } : { width: "100%", opacity: 0.2 }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
        <motion.div 
            className="h-12 w-full rounded-lg border border-white/10 bg-white/5 mt-2 flex items-center justify-center"
            animate={isActive ? { borderColor: ['rgba(255,255,255,0.1)', 'rgba(168, 85, 247, 0.4)'] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
        >
            <div className="w-4 h-4 rounded-full border border-white/20" />
        </motion.div>
      </div>
    </div>
  );

  const LearningVisual = ({ isActive }) => (
    <div className="relative w-full h-40 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
            <motion.div 
                key={i}
                className="w-10 h-14 rounded border border-white/10 bg-white/5"
                animate={isActive ? { rotateY: [0, 180, 0], backgroundColor: ["rgba(255,255,255,0.05)", "rgba(34, 211, 238, 0.1)", "rgba(255,255,255,0.05)"] } : { rotateY: 0 }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
            />
        ))}
      </div>
    </div>
  );

  const CollaborationVisual = ({ isActive }) => (
    <div className="relative w-full h-40 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
      <div className="relative w-24 h-24">
         <motion.div 
            className="absolute top-1/2 left-1/2 w-3 h-3 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"
         />
         {[0, 180].map((deg, i) => (
             <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-16 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
                style={{ rotate: deg, transformOrigin: "0 0" }}
                animate={isActive ? { rotate: deg + 360 } : { rotate: deg }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
             >
                <div className="w-2 h-2 bg-purple-400 rounded-full absolute right-0 -top-1" />
             </motion.div>
         ))}
      </div>
    </div>
  );

  const renderVisual = (visualType, isActive) => {
    switch (visualType) {
      case 'ai': return <AIVisual isActive={isActive} />;
      case 'organization': return <OrganizationVisual isActive={isActive} />;
      case 'learning': return <LearningVisual isActive={isActive} />;
      case 'collaboration': return <CollaborationVisual isActive={isActive} />;
      default: return null;
    }
  };

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Why Choose Studymate?</h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Experience the future of learning with our comprehensive study platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => {
            const isActive = activeIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                onHoverStart={() => setActiveIndex(index)}
                className={`p-8 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-white/10 border-purple-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-6">
                  {renderVisual(reason.visual, isActive)}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{reason.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{reason.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyStudymate;