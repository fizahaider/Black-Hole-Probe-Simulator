import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, X, Settings, Volume2, VolumeX } from 'lucide-react';

const PomodoroPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomodorosBeforeLongBreak: 4,
  });
  const [tempSettings, setTempSettings] = useState(settings);

  if (isRunning) {
    return (
      <ImmersiveTimer
        settings={settings}
        onExit={() => setIsRunning(false)}
      />
    );
  }

  return (
    <div className="h-full max-w-[92rem] mx-auto px-3 sm:px-5 lg:px-6 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center"
      >
        <div className="max-w-2xl w-full text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="text-6xl mb-4">🍅</div>
            <h1 className="text-display text-[var(--text-primary)] mb-3">
              Pomodoro Timer
            </h1>
            <p className="text-body text-[var(--text-secondary)] leading-relaxed">
              The Pomodoro Technique is a time management method that uses a timer to break work into intervals, 
              traditionally 25 minutes in length, separated by short breaks. Each interval is known as a pomodoro, 
              from the Italian word for 'tomato'.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 mb-6"
          >
            <h2 className="text-subhead text-[var(--text-primary)] mb-4">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-base)] p-4">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="text-body font-semibold text-[var(--text-primary)] mb-1">Focus Time</h3>
                <p className="text-caption text-[var(--text-secondary)]">
                  Work on your task for {settings.workDuration} minutes without distractions
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-base)] p-4">
                <div className="text-2xl mb-2">☕</div>
                <h3 className="text-body font-semibold text-[var(--text-primary)] mb-1">Short Break</h3>
                <p className="text-caption text-[var(--text-secondary)]">
                  Take a {settings.shortBreak}-minute break to rest and recharge
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-base)] p-4">
                <div className="text-2xl mb-2">🌟</div>
                <h3 className="text-body font-semibold text-[var(--text-primary)] mb-1">Long Break</h3>
                <p className="text-caption text-[var(--text-secondary)]">
                  After {settings.pomodorosBeforeLongBreak} pomodoros, take a {settings.longBreak}-minute break
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => setIsRunning(true)}
              className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 text-body"
            >
              <Play size={18} fill="currentColor" />
              Start Session
            </button>
            <button
              onClick={() => {
                setTempSettings(settings);
                setShowSettings(true);
              }}
              className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 text-body"
            >
              <Settings size={16} />
              Settings
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 max-w-md w-full"
            >
              <h2 className="text-heading text-[var(--text-primary)] mb-4">Session Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5 block">
                    Focus Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.workDuration}
                    onChange={(e) => setTempSettings({ ...tempSettings, workDuration: Number(e.target.value) })}
                    min="1"
                    max="60"
                    className="input-field w-full px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5 block">
                    Short Break (minutes)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.shortBreak}
                    onChange={(e) => setTempSettings({ ...tempSettings, shortBreak: Number(e.target.value) })}
                    min="1"
                    max="30"
                    className="input-field w-full px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5 block">
                    Long Break (minutes)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.longBreak}
                    onChange={(e) => setTempSettings({ ...tempSettings, longBreak: Number(e.target.value) })}
                    min="1"
                    max="60"
                    className="input-field w-full px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5 block">
                    Pomodoros Before Long Break
                  </label>
                  <input
                    type="number"
                    value={tempSettings.pomodorosBeforeLongBreak}
                    onChange={(e) => setTempSettings({ ...tempSettings, pomodorosBeforeLongBreak: Number(e.target.value) })}
                    min="1"
                    max="10"
                    className="input-field w-full px-3 py-2.5"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setSettings(tempSettings);
                    setShowSettings(false);
                  }}
                  className="btn-primary flex-1 py-2.5"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Immersive Full-Screen Timer Component with CSS-only galaxy
const ImmersiveTimer = ({ settings, onExit }) => {
  const [currentPhase, setCurrentPhase] = useState('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);

  const getTotalDuration = useCallback(() => {
    if (currentPhase === 'work') return settings.workDuration * 60;
    if (currentPhase === 'shortBreak') return settings.shortBreak * 60;
    return settings.longBreak * 60;
  }, [currentPhase, settings]);

  const progress = ((getTotalDuration() - timeLeft) / getTotalDuration()) * 100;

  // Timer Logic
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, currentPhase]);

  const handlePhaseComplete = () => {
    playNotificationSound();

    if (currentPhase === 'work') {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);

      if (newCompleted % settings.pomodorosBeforeLongBreak === 0) {
        setCurrentPhase('longBreak');
        setTimeLeft(settings.longBreak * 60);
      } else {
        setCurrentPhase('shortBreak');
        setTimeLeft(settings.shortBreak * 60);
      }
    } else {
      setCurrentPhase('work');
      setTimeLeft(settings.workDuration * 60);
    }
  };

  const playNotificationSound = () => {
    if (isMuted) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    if (currentPhase === 'work') return 'Focus Time';
    if (currentPhase === 'shortBreak') return 'Short Break';
    return 'Long Break';
  };

  const getPhaseColor = () => {
    if (currentPhase === 'work') return '#6366f1';
    if (currentPhase === 'shortBreak') return '#10b981';
    return '#f59e0b';
  };

  const handleSkip = () => {
    handlePhaseComplete();
  };

  const circumference = 2 * Math.PI * 180;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 50%, #2d1b4e 100%)',
      }}
    >
      {/* CSS-only Starry Galaxy Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Stars layer 1 - small stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, white, transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 90px 40px, white, transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
              radial-gradient(2px 2px at 160px 30px, white, transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 100px',
            animation: 'twinkle 4s ease-in-out infinite',
          }}
        />
        
        {/* Stars layer 2 - medium stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 50px 50px, rgba(255,255,255,0.9), transparent),
              radial-gradient(3px 3px at 100px 100px, white, transparent),
              radial-gradient(2px 2px at 150px 50px, rgba(255,255,255,0.7), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '250px 150px',
            animation: 'twinkle 5s ease-in-out infinite 1s',
          }}
        />
        
        {/* Stars layer 3 - large bright stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(3px 3px at 75px 75px, white, transparent),
              radial-gradient(3px 3px at 200px 150px, rgba(255,255,255,0.9), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '300px 200px',
            animation: 'twinkle 6s ease-in-out infinite 2s',
          }}
        />

        {/* Nebula effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)
            `,
            animation: 'nebula-drift 20s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Exit Button - Top Right, Always Visible */}
      <button
        onClick={onExit}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg"
        title="Exit to Dashboard"
      >
        <X size={28} strokeWidth={2.5} />
      </button>

      {/* Mute Toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg"
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* Main Timer UI */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center">
        {/* Phase Label */}
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span
            className="text-lg font-semibold uppercase tracking-widest px-6 py-2 rounded-full"
            style={{
              backgroundColor: `${getPhaseColor()}20`,
              color: getPhaseColor(),
              border: `2px solid ${getPhaseColor()}`,
            }}
          >
            {getPhaseLabel()}
          </span>
        </motion.div>

        {/* Circular Timer */}
        <div className="relative mb-8">
          <svg width="400" height="400" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke={getPhaseColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>

          {/* Timer Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              key={timeLeft}
              initial={{ scale: 1 }}
              animate={{ scale: timeLeft <= 10 ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.5 }}
              className="text-white text-7xl font-mono font-bold"
            >
              {formatTime(timeLeft)}
            </motion.div>
          </div>
        </div>

        {/* Pomodoro Counter */}
        <div className="text-white/70 text-sm mb-8">
          {completedPomodoros}/{settings.pomodorosBeforeLongBreak} pomodoros completed
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}
          </button>

          <button
            onClick={handleSkip}
            className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20 shadow-lg"
            title="Skip to Next Phase"
          >
            <SkipForward size={28} />
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes nebula-drift {
          0% { transform: translateX(-20px) scale(1); }
          100% { transform: translateX(20px) scale(1.1); }
        }
      `}</style>
    </motion.div>
  );
};

export default PomodoroPage;
