import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../../../services/documentService';
import { generatePDF } from '../../../utils/markdown';
import { OPEN_STUDY_TOOL_EVENT } from '../../../constants/studyToolEvents';
function getSchedule(plan) {
  if (!plan) return [];
  const raw = plan.schedule ?? plan.plan_content?.schedule;
  return Array.isArray(raw) ? raw : [];
}

function parseDayNumber(slot) {
  if (!slot || typeof slot !== 'object') return NaN;
  const raw = slot.day ?? slot.day_number ?? slot.Day;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}
function pickNextIncompleteTask(schedule) {
  if (!schedule?.length) return null;
  const enriched = schedule.map((slot, index) => ({ slot, index, d: parseDayNumber(slot) }));
  enriched.sort((a, b) => {
    const fa = Number.isFinite(a.d);
    const fb = Number.isFinite(b.d);
    if (fa && fb) return a.d - b.d;
    if (fa) return -1;
    if (fb) return 1;
    return a.index - b.index;
  });
  const found = enriched.find((x) => !x.slot.completed);
  return found ? { slot: found.slot, index: found.index } : null;
}

const StudyPlanner = ({ documentId, spaceId, documentIds, onContentGenerated, onNavigateTool, refreshToken = 0 }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  const [historyPlans, setHistoryPlans] = useState([]);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const [config, setConfig] = useState({
    totalDays: 7,
    timePerDay: 2,
    skillLevel: 'intermediate',
    focus: ['read', 'quiz', 'flashcards'],
    learningStyle: 'interactive',
    revisionStrategy: 'spaced_repetition'
  });

  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchExistingPlan = async () => {
      try {
        const history = await documentService.getStudyPlanHistory(spaceId);
        const completedPlans = history.filter(p => p.status === 'completed');
        setHistoryPlans(completedPlans);

        const activePlan = history.find(p => p.status !== 'abandoned' && p.status !== 'completed');
        if (activePlan) {
          setPlan(activePlan);
          setStarted(true);
        }
      } catch (err) {
        console.error('Failed to load existing plan:', err);
      }
    };
    if (spaceId) {
      fetchExistingPlan();
    }
  }, [spaceId, refreshToken]);

  const toggleTaskComplete = async (idx) => {
    if (!plan || !plan.id) return;
    try {
      const activeSchedule = getSchedule(plan);
      const currentTask = activeSchedule[idx];

      if (!currentTask.completed) {
        const earlierUnfinished = activeSchedule.findIndex((s, i) => i < idx && !s.completed);
        if (earlierUnfinished !== -1) {
             setError(`Please complete Day ${activeSchedule[earlierUnfinished].day || 'earlier tasks'} first.`);
             return;
        }
      } else {
        const laterFinished = activeSchedule.findIndex((s, i) => i > idx && s.completed);
        if (laterFinished !== -1) {
             setError(`Please uncheck subsequent completed tasks first.`);
             return;
        }
      }

      setError(null);
      const updatedSchedule = [...activeSchedule];
      
      updatedSchedule[idx] = {
        ...currentTask,
        completed: !currentTask.completed
      };

      const newPlanContent = {
        ...plan.plan_content,
        schedule: updatedSchedule
      };

      setPlan({ ...plan, plan_content: newPlanContent });

      const response = await documentService.updateStudyPlan(plan.id, { plan_content: newPlanContent });
      if (response.current_streak !== undefined) {
          setStreak(response.current_streak);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);
      if (!docId && !spaceId) {
        setError('Please select documents or a knowledge space first.');
        setLoading(false);
        return;
      }
      const data = await documentService.getStudyPlan(docId, {
        ...config,
        spaceId,
        documentIds: documentIds || []
      });
      const incomingSchedule = getSchedule(data);
      if (incomingSchedule.length > 0) {
        setPlan(data);
        setStarted(true);
        if (onContentGenerated) {
          setTimeout(() => onContentGenerated(), 500);
        }
      } else {
        setError('No plan generated. Try adjusting your settings.');
      }
    } catch (err) {
      console.error('Planner error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Plan generation failed. Please try again or adjust settings.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!plan) return;
    const content = getSchedule(plan).map(s =>
      `Day ${s.day}: ${s.task} | Type: ${s.task_type} | Time: ${s.estimated_time}m`
    ).join('\n\n');
    generatePDF('Study Plan', content, 'summary');
  };

  const toggleFocus = (id) => {
    if (config.focus.includes(id)) {
      if (config.focus.length > 1) {
        setConfig({ ...config, focus: config.focus.filter(f => f !== id) });
      }
    } else {
      setConfig({ ...config, focus: [...config.focus, id] });
    }
  };

  const normalizeTaskType = (raw) => {
    const t = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const aliases = {
      reading: 'read',
      summary: 'read',
      summarize: 'read',
      summarisation: 'read',
      summarization: 'read',
      overview: 'read',
      introduction: 'read',
      learn: 'read',
      study: 'read',
      flashcard: 'flashcards',
      flash_cards: 'flashcards',
      cards: 'flashcards',
      practise: 'quiz',
      practice: 'quiz',
      test: 'quiz',
      assessment: 'quiz',
      exam: 'quiz',
      revision: 'review',
      recap: 'review',
      recall: 'review'
    };
    const key = aliases[t] || t;
    if (['read', 'quiz', 'flashcards', 'review'].includes(key)) return key;
    return 'review';
  };

  const handleBeginDay = () => {
    const schedule = getSchedule(plan);
    if (schedule.length === 0) {
      return;
    }
    const next = pickNextIncompleteTask(schedule);
    if (!next) return;

    openTaskAtIndex(next.index);
  };

  const isTaskUnlocked = (idx) => {
    const schedule = getSchedule(plan);
    const slot = schedule[idx];
    if (!slot || slot.completed) return false;
    return schedule.findIndex((s, i) => i < idx && !s.completed) === -1;
  };

  const openTaskAtIndex = (idx) => {
    if (!plan) return;
    const schedule = getSchedule(plan);
    const slot = schedule[idx];
    if (!slot || slot.completed) return;
    if (!isTaskUnlocked(idx)) return;

    const taskKey = normalizeTaskType(slot.task_type);
    const TASK_TOOL = {
      read: 'summary',
      quiz: 'quiz',
      flashcards: 'flashcards',
      review: 'chat'
    };
    const targetTool = TASK_TOOL[taskKey] || 'chat';

    const dayNum = parseDayNumber(slot);
    const displayDay = Number.isFinite(dayNum) ? dayNum : slot.day ?? '—';

    const launchOpts = {
      plannerTask: {
        planId: plan.id,
        scheduleIndex: idx,
        day: displayDay,
        task: slot.task ?? '',
        task_type: taskKey,
        estimated_time: slot.estimated_time,
        references: Array.isArray(slot.references) ? slot.references : []
      },
      ...(targetTool === 'quiz'
        ? { autoStart: true, key: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
        : {})
    };

    window.dispatchEvent(
      new CustomEvent(OPEN_STUDY_TOOL_EVENT, {
        detail: { tool: targetTool, launchOptions: launchOpts }
      })
    );
    onNavigateTool?.(targetTool, launchOpts);
  };

  const Icons = {
    Calendar: () => (
      <svg className="w-6 h-6 text-cosmic-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    ),
    Download: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    ),
    Settings: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v10" /><path d="M1 12h6m6 0h10" /></svg>
    ),
    Clock: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    ),
    Task: (type) => {
      const props = { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
      switch (type) {
        case 'read': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
        case 'quiz': return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
        case 'flashcards': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>;
        case 'review': return <svg {...props}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;
        default: return <svg {...props}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
      }
    }
  };

  // Configuration screen
  if (!started && !loading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card-glass p-6 border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-cosmic-purple/10 rounded-xl border border-cosmic-purple/20">
              <Icons.Calendar />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Study Planner</h2>
              <p className="text-xs text-gray-500">Create your personalized learning roadmap</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Total Days slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Days to Prepare</label>
                <span className="text-sm font-medium text-cosmic-purple-light">{config.totalDays} days</span>
              </div>
              <input
                type="range" min="1" max="90"
                value={config.totalDays}
                onChange={(e) => setConfig({ ...config, totalDays: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cosmic-purple cursor-pointer"
              />
            </div>

            {/* Time per day slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Daily Study Time</label>
                <span className="text-sm font-medium text-cosmic-purple-light">{config.timePerDay} hours</span>
              </div>
              <input
                type="range" min="1" max="8"
                value={config.timePerDay}
                onChange={(e) => setConfig({ ...config, timePerDay: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cosmic-purple cursor-pointer"
              />
            </div>

            {/* Skill level */}
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Skill Level</label>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {['beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfig({ ...config, skillLevel: level })}
                    className={`flex-1 py-2 text-[10px] uppercase font-semibold rounded-lg transition-all cursor-pointer ${config.skillLevel === level ? 'bg-cosmic-purple text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus areas */}
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Focus Areas</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'read', label: 'Reading' },
                  { id: 'quiz', label: 'Quizzes' },
                  { id: 'flashcards', label: 'Flashcards' },
                  { id: 'review', label: 'Review' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => toggleFocus(mode.id)}
                    className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-medium cursor-pointer ${config.focus.includes(mode.id)
                      ? 'bg-cosmic-purple/20 border-cosmic-purple text-white'
                      : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'}`}
                  >
                    <span className={config.focus.includes(mode.id) ? 'text-cosmic-purple-light' : 'text-gray-600'}>{Icons.Task(mode.id)}</span>
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Learning Style</label>
                <select className="input-field h-10 text-sm cursor-pointer" value={config.learningStyle} onChange={(e) => setConfig({ ...config, learningStyle: e.target.value })}>
                  <option value="textual">Textual</option>
                  <option value="interactive">Interactive</option>
                  <option value="visual">Visual</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Revision Strategy</label>
                <select className="input-field h-10 text-sm cursor-pointer" value={config.revisionStrategy} onChange={(e) => setConfig({ ...config, revisionStrategy: e.target.value })}>
                  <option value="mixed">Balanced</option>
                  <option value="spaced_repetition">Spaced Repetition</option>
                  <option value="review-heavy">Intensive</option>
                </select>
              </div>
            </div>

            <button
              onClick={generatePlan}
              className="btn-primary w-full h-11 text-sm font-medium rounded-xl cursor-pointer"
            >
              Generate Study Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto py-6">
        <div className="space-y-2">
          <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
          <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
          <div className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  const scheduleList = getSchedule(plan);
  const totalDays = plan.total_days ?? plan.plan_content?.total_days ?? scheduleList.length;
  const nextIncomplete = pickNextIncompleteTask(scheduleList);
  const ctaDayLabel = nextIncomplete
    ? Number.isFinite(parseDayNumber(nextIncomplete.slot))
      ? parseDayNumber(nextIncomplete.slot)
      : nextIncomplete.slot?.day ?? '—'
    : null;

  if (viewHistory) {
      return (
        <div className="max-w-3xl mx-auto pb-8">
           <div className="flex items-center justify-between mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div>
                 <h2 className="text-lg font-semibold text-white">Study History</h2>
                 <p className="text-xs text-gray-500">Your 100% completed mastery plans</p>
              </div>
              <button onClick={() => setViewHistory(false)} className="btn-secondary h-9 px-4 rounded-xl text-xs cursor-pointer">
                 Back to Active Plan
              </button>
           </div>
           
           <div className="space-y-3">
              {historyPlans.length === 0 ? (
                 <div className="card-glass p-8 text-center border-dashed">
                    <p className="text-sm text-gray-500">You haven't fully completed any plans yet. Keep studying!</p>
                 </div>
              ) : (
                  historyPlans.map((hp) => (
                      <div key={hp.id} className="card-glass p-5 border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                         <h3 className="text-sm font-semibold text-white mb-1">Completed {hp.total_days} Day Plan</h3>
                         <p className="text-xs text-gray-400">Mastered {(hp.plan_content?.schedule || []).length} modules.</p>
                      </div>
                  ))
              )}
           </div>
        </div>
      );
  }

  return (
    <div className="max-w-[640px] mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-subhead text-[var(--text-primary)] flex items-center gap-3">
            Your Study Plan
            {streak > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold font-mono">
                <span>🔥</span>
                <span>{streak} Day Streak!</span>
              </span>
            )}
          </h2>
          <p className="text-caption text-[var(--text-muted)]">{totalDays} days of structured learning</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {historyPlans.length > 0 && (
             <button onClick={() => setViewHistory(true)} className="btn-secondary h-9 px-4 rounded-xl text-xs cursor-pointer bg-white/5 border-white/10 hover:bg-white/10">
                History
             </button>
          )}
          <button onClick={handleDownloadPDF} className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-[0.4rem] text-caption text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]">
            <Icons.Download />
            <span>Export</span>
          </button>
          <button onClick={() => setStarted(false)} className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer" title="Create New Plan">
            <Icons.Settings />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Schedule Timeline */}
      <div className="mt-4 mb-2">
          <button 
              onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
              className="w-full flex items-center justify-between p-3 card-glass border border-[var(--border)] rounded-[var(--radius-md)] cursor-pointer"
          >
              <span className="text-sm font-medium text-white">View Full Schedule</span>
              <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${isTimelineExpanded ? 'rotate-180' : ''}`} 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                  <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
          </button>
      </div>

      <AnimatePresence>
      {isTimelineExpanded && (
      <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex flex-col gap-0 overflow-hidden"
      >
        {scheduleList.map((slot, idx) => {
          const rowEnabled = !slot.completed && isTaskUnlocked(idx);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => rowEnabled && openTaskAtIndex(idx)}
              className={`border-b border-[var(--border)] px-2 py-3 transition-colors ${slot.completed ? 'opacity-60' : ''} ${rowEnabled ? 'cursor-pointer hover:bg-[var(--bg-surface)]' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox Trigger */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (rowEnabled) toggleTaskComplete(idx); }}
                  className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                    !slot.completed && !rowEnabled
                      ? 'opacity-30 cursor-not-allowed border-gray-600'
                      : 'cursor-pointer hover:border-cosmic-purple'
                  } ${slot.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 text-transparent'}`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>

                <div className="text-caption text-[var(--text-muted)] min-w-[48px]">Day {slot.day}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const tt = normalizeTaskType(slot.task_type);
                      const chip =
                        tt === 'read'
                          ? 'bg-blue-500/20 text-blue-400'
                          : tt === 'quiz'
                            ? 'bg-purple-500/20 text-purple-400'
                            : tt === 'flashcards'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400';
                      return (
                        <>
                          <span className={`p-1 rounded ${chip}`}>
                            {Icons.Task(tt)}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{tt}</span>
                        </>
                      );
                    })()}
                  </div>
                  <p className={`text-body mb-1 line-clamp-2 ${slot.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{slot.task}</p>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Icons.Clock />
                    <span className="text-caption text-[var(--text-muted)]">{slot.estimated_time} min</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {rowEnabled && !slot.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTaskAtIndex(idx);
                      }}
                      className="text-[11px] font-semibold text-cosmic-purple hover:underline"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>

              {!slot.completed && !rowEnabled && (
                <div className="mt-2 text-[11px] text-gray-500">Locked until earlier tasks are complete.</div>
              )}

              {slot.references && slot.references.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                  {slot.references.map((ref, i) => (
                    <span key={i} className="text-[9px] text-gray-500 bg-white/5 px-2 py-1 rounded">{ref}</span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
      )}
      </AnimatePresence>

      {/* Footer CTA — isolate stacking so clicks are not eaten by animated siblings */}
      <div className="relative z-30 mt-6 p-4 card-glass text-center border-dashed border-2 border-white/5 isolate pointer-events-auto">
        {nextIncomplete ? (
          <>
            <h3 className="text-base font-medium text-white mb-2">Ready to Start?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Opens <span className="text-gray-400">Day {ctaDayLabel}</span> in Summary, Quiz, Flashcards, or Chat based on that row&apos;s task type.
            </p>
            <button
              type="button"
              onClick={handleBeginDay}
              className="btn-primary h-10 px-8 text-sm rounded-xl cursor-pointer relative z-10"
            >
              Begin day {ctaDayLabel}
            </button>
          </>
        ) : scheduleList.length > 0 ? (
          <>
            <h3 className="text-base font-medium text-white mb-2">Plan complete</h3>
            <p className="text-xs text-gray-500">Every task in this roadmap is marked done. Use the gear icon if you want to generate a new plan.</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default StudyPlanner;
