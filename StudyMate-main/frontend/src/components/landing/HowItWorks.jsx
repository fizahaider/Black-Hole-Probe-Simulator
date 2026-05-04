import { useState } from 'react';
import { motion } from 'framer-motion';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: '01',
      title: 'Sign Up & Create Profile',
      description: 'Create your free account and set up your student profile in seconds. Choose your subjects and set your learning goals.',
      visual: 'signup',
      color: 'from-cosmic-purple to-cosmic-purple-light',
    },
    {
      number: '02',
      title: 'Upload Your Materials',
      description: 'Upload notes, images, or PDFs. Our advanced OCR technology extracts and organizes everything automatically.',
      visual: 'upload',
      color: 'from-cosmic-neon to-cosmic-purple',
    },
    {
      number: '03',
      title: 'Generate Study Tools',
      description: 'Create quizzes, flashcards, and summaries automatically from your content. AI-powered tools adapt to your needs.',
      visual: 'generate',
      color: 'from-cosmic-purple-light to-cosmic-neon',
    },
    {
      number: '04',
      title: 'Study & Track Progress',
      description: 'Practice with interactive tools, chat with AI, and monitor your improvement with detailed analytics.',
      visual: 'study',
      color: 'from-cosmic-purple to-cosmic-neon',
    },
  ];

  

  const SignupVisual = ({ isActive }) => (
    <div className="relative w-full h-64 bg-gradient-to-br from-cosmic-blue/30 to-cosmic-purple/10 rounded-2xl border border-cosmic-purple/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
      <motion.div 
        className="w-48 h-32 bg-cosmic-blue/60 rounded-xl border border-cosmic-purple/30 p-4 flex flex-col gap-3 shadow-lg backdrop-blur-md"
        animate={isActive ? { y: [5, -5, 5] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={isActive ? { scale: 1 } : { scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-cosmic-purple to-cosmic-purple-light" 
          />
          <div className="space-y-2 flex-1">
            <motion.div 
              className="h-2 w-20 bg-white/20 rounded-full"
              animate={isActive ? { width: ["0%", "80%"], opacity: [0, 1] } : { width: "80%" }}
              transition={{ duration: 1, delay: 0.2 }}
            />
            <motion.div 
              className="h-2 w-12 bg-white/10 rounded-full"
              animate={isActive ? { width: ["0%", "50%"], opacity: [0, 1] } : { width: "50%" }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
           <motion.div className="h-6 w-12 rounded bg-cosmic-purple/20 border border-cosmic-purple/30" animate={isActive ? { opacity: [0,1] } : { opacity: 0.5 }} transition={{ delay: 0.6 }} />
           <motion.div className="h-6 w-12 rounded bg-cosmic-purple/20 border border-cosmic-purple/30" animate={isActive ? { opacity: [0,1] } : { opacity: 0.5 }} transition={{ delay: 0.7 }} />
        </div>
      </motion.div>
    </div>
  );

  const UploadVisual = ({ isActive }) => (
    <div className="relative w-full h-64 bg-gradient-to-br from-cosmic-blue/30 to-cosmic-purple/10 rounded-2xl border border-cosmic-purple/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
      <div className="relative w-32 h-40 bg-white/5 border border-white/10 rounded-lg overflow-hidden flex flex-col p-3 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-2 rounded-full bg-white/10 ${i === 1 ? 'w-3/4' : 'w-full'}`} />
        ))}
        <div className="mt-4 w-full h-16 bg-white/5 rounded border border-white/5 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-white/20" />
        </div>
        <motion.div
          className="absolute left-0 w-full h-12 bg-gradient-to-b from-cosmic-neon/0 via-cosmic-neon/20 to-cosmic-neon/0 border-y border-cosmic-neon/40"
          initial={{ top: "-20%" }}
          animate={isActive ? { top: ["-20%", "120%"] } : { top: "50%" }}
          transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "linear" }}
        />
      </div>
    </div>
  );

  const GenerateVisual = ({ isActive }) => (
    <div className="relative w-full h-64 bg-gradient-to-br from-cosmic-blue/30 to-cosmic-purple/10 rounded-2xl border border-cosmic-purple/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-0 left-0 w-12 h-16 bg-gradient-to-br from-cosmic-purple/40 to-cosmic-blue/40 border border-cosmic-purple-light/30 rounded-md backdrop-blur-md"
            style={{ originX: 2.5, originY: 0.5 }}
            animate={isActive ? { rotate: [0 + (i * 120), 360 + (i * 120)] } : { rotate: i * 120 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
             <div className="w-full h-full flex flex-col justify-center items-center gap-1 opacity-50">
                <div className="w-8 h-1 bg-white/40 rounded-full" />
                <div className="w-5 h-1 bg-white/20 rounded-full" />
             </div>
          </motion.div>
        ))}
        <motion.div 
          className="relative z-10 w-16 h-16 bg-cosmic-blue rounded-full border border-cosmic-purple flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]"
          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-8 h-8 rounded-sm rotate-45 border-2 border-cosmic-purple-light/60" />
        </motion.div>
      </div>
    </div>
  );

  const StudyVisual = ({ isActive }) => (
    <div className="relative w-full h-64 bg-gradient-to-br from-cosmic-blue/30 to-cosmic-purple/10 rounded-2xl border border-cosmic-purple/20 backdrop-blur-sm flex items-end justify-center pb-8 gap-4 overflow-hidden shadow-2xl">
      <div className="absolute inset-0 w-full h-full opacity-10" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
      />
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-12 rounded-t-lg bg-gradient-to-t from-cosmic-purple to-cosmic-purple-light/50 border-x border-t border-cosmic-purple-light/30 relative overflow-hidden"
          initial={{ height: "20%" }}
          animate={isActive ? { height: [`${20 + i * 10}%`, `${40 + i * 15}%`, `${20 + i * 10}%`] } : { height: `${20 + i * 10}%` }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-30" />
        </motion.div>
      ))}
    </div>
  );

  const renderVisual = (visualType, isActive) => {
    switch (visualType) {
      case 'signup': return <SignupVisual isActive={isActive} />;
      case 'upload': return <UploadVisual isActive={isActive} />;
      case 'generate': return <GenerateVisual isActive={isActive} />;
      case 'study': return <StudyVisual isActive={isActive} />;
      default: return null;
    }
  };

  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cosmic-purple/5 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 lg:mb-32"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-6">How It Works</h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Your journey from signup to success in four simple steps.
          </p>
        </motion.div>

        <div className="space-y-24 lg:space-y-32 relative">
          {/* Connecting Vertical Line for Desktop - Centered and behind content */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cosmic-purple/30 to-transparent -translate-x-1/2 z-0" />

          {steps.map((step, index) => {
            const isActive = activeStep === index;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.8 }}
                onViewportEnter={() => setActiveStep(index)}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-32 items-center relative z-10`}
              >
                {/* Step Connector Dot - Centered */}
                <div className={`hidden lg:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-[var(--bg-base)] items-center justify-center z-20 transition-colors duration-500 ${isActive ? 'bg-cosmic-neon shadow-[0_0_20px_rgba(45,212,191,0.4)]' : 'bg-cosmic-blue/50'}`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100'}`} />
                </div>

                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`flex-1 w-full max-w-xl ${
                    isEven 
                      ? 'lg:text-right lg:pr-16' // Padding Right ensures text doesn't hit center line
                      : 'lg:text-left lg:pl-16'  // Padding Left ensures text doesn't hit center line
                  } text-center lg:text-left`}
                >
                  {/* Number styling updated: Less bold, larger size, lighter weight */}
                  <div className={`inline-block text-6xl font-medium tracking-tighter bg-gradient-to-r ${step.color} bg-clip-text text-transparent mb-4 opacity-90`}>
                    {step.number}
                  </div>
                  
                  <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-light">{step.description}</p>
                </motion.div>

                {/* Visual */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex-1 w-full max-w-lg"
                >
                  {renderVisual(step.visual, isActive)}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Progress Bar (Hidden on Desktop) */}
        <div className="mt-20 flex justify-center gap-2 lg:hidden">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                activeStep === index ? 'bg-cosmic-purple-light w-8' : 'bg-white/10 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;