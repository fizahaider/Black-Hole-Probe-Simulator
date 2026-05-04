import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Target, Clock3, BookOpenText, Link2, CheckCircle2, Loader2, RefreshCw, Trash2, Pencil, RotateCcw, Star } from 'lucide-react';
import { prepHubService } from '../../services/prepHubService';
import { parseApiError } from '../../utils/errorHelpers';

const GOAL_OPTIONS = [
  { value: 'interview', label: 'Interview Preparation' },
  { value: 'exam', label: 'Exam Preparation' },
  { value: 'placement', label: 'Placement Readiness' },
  { value: 'skill_building', label: 'Skill Building' },
  { value: 'project', label: 'Project Oriented' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const FORMAT_OPTIONS = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Articles' },
  { value: 'practice', label: 'Practice' },
  { value: 'repo', label: 'Repositories' },
];

const GENERATION_STEPS = [
  'Analyzing your target outcome',
  'Mapping phase-wise milestones',
  'Selecting quality learning resources',
  'Building your personalized command plan',
];

const PrepHub = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [mode, setMode] = useState('create');
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    topic: '',
    goal: 'interview',
    level: 'intermediate',
    duration_days: 30,
    hours_per_day: 2,
    preferred_format: 'mixed',
    use_web_search: true,
  });
  const [result, setResult] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateOptions, setShowRegenerateOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showResources, setShowResources] = useState(true);
  const [showPlanSnapshot, setShowPlanSnapshot] = useState(false);
  const [regenerateFormData, setRegenerateFormData] = useState({
    use_web_search: false,
  });
  const [focusedPlanId, setFocusedPlanId] = useState(() => {
    const stored = localStorage.getItem('prepHub_focusedPlan');
    return stored ? JSON.parse(stored) : null;
  });
  const [savedResourceId, setSavedResourceId] = useState(null);
  const [viewingSavedPlan, setViewingSavedPlan] = useState(null);
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [renamePlanId, setRenamePlanId] = useState(null);
  const [renameTopicValue, setRenameTopicValue] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await prepHubService.listPlans();
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setPlans(list);

        if (focusedPlanId && !list.find((p) => p.id === focusedPlanId)) {
          setFocusedPlanId(null);
          localStorage.removeItem('prepHub_focusedPlan');
        }

        if (list.length === 0) {
          setActiveTab('create');
          setMode('create');
        } else if (list.length > 0) {
          setSelectedPlanId(list[0].id);
        }
      } catch (e) {
        console.error('Failed to load prep plans', e);
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    };
    loadHistory();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (mode !== 'generating') return undefined;
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [mode]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );
  const activePlans = useMemo(() => plans.filter((p) => p.status !== 'archived'), [plans]);
  const activeFocusPlan = useMemo(
    () => activePlans.find((p) => p.id === focusedPlanId) || activePlans.find((p) => p.is_active_focus) || activePlans.find((p) => p.status === 'active') || null,
    [activePlans, focusedPlanId]
  );

  useEffect(() => {
    if (activeTab === 'active' && activeFocusPlan && mode !== 'result') {
      openExistingPlan(activeFocusPlan.id);
    }
  }, [activeTab, activeFocusPlan?.id]);

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      topic: '',
      goal: 'interview',
      level: 'intermediate',
      duration_days: 30,
      hours_per_day: 2,
      preferred_format: 'mixed',
      use_web_search: true,
    });
    setError('');
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError('');
    setMode('generating');
    setLoadingStep(0);
    try {
      const generated = await prepHubService.generatePlan(formData);
      const updated = await prepHubService.listPlans();
      const list = Array.isArray(updated) ? updated : [];
      setPlans(list);

      if (generated?.id) {
        setResult(generated);
        setSelectedPlanId(generated.id);
        setMode('result');
      }
    } catch (e) {
      setError(parseApiError(e));
      setMode('create');
    }
  };

  const refreshPlans = async (nextSelectedId = null) => {
    const updated = await prepHubService.listPlans();
    const list = Array.isArray(updated) ? updated : [];
    setPlans(list);
    if (nextSelectedId) {
      setSelectedPlanId(nextSelectedId);
      return;
    }
    if (list.length > 0 && !list.find((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(list[0].id);
    }
  };

  const openExistingPlan = async (planId) => {
    setError('');
    try {
      const data = await prepHubService.getPlanDetail(planId);
      setResult(data?.result_payload ? { id: data.id, ...data.result_payload, progress: data.progress, progress_payload: data.progress_payload } : null);
      setSelectedPlanId(planId);
      setMode('result');
      setViewingSavedPlan(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleCloseSavedPlan = () => {
    setViewingSavedPlan(null);
    setMode('create');
    setResult(null);
  };

  const resultData = result || null;
  const completedTaskIds = new Set(resultData?.progress_payload?.completed_task_ids || []);
  const currentPhaseIndex = resultData?.progress?.current_phase_index ?? resultData?.progress_payload?.current_phase_index ?? 0;

  const handleRenamePlan = async (planId, currentTopic) => {
    setRenamePlanId(planId);
    setRenameTopicValue(currentTopic || '');
  };

  const handleConfirmRename = async () => {
    if (!renamePlanId || !renameTopicValue.trim()) {
      setRenamePlanId(null);
      setRenameTopicValue('');
      return;
    }
    setError('');
    try {
      await prepHubService.renamePlan(renamePlanId, renameTopicValue.trim());
      await refreshPlans(renamePlanId);
      if (resultData?.id === renamePlanId) {
        setResult((prev) => (prev ? { ...prev, topic: renameTopicValue.trim() } : prev));
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setRenamePlanId(null);
      setRenameTopicValue('');
    }
  };

  const handleDeletePlan = async (planId) => {
    setDeletePlanId(planId);
  };

  const handleConfirmDelete = async () => {
    if (!deletePlanId) return;
    setError('');
    try {
      await prepHubService.deletePlan(deletePlanId);
      const updated = plans.filter((p) => p.id !== deletePlanId);
      setPlans(updated);

      if (focusedPlanId === deletePlanId) {
        setFocusedPlanId(null);
        localStorage.removeItem('prepHub_focusedPlan');
      }

      if (resultData?.id === deletePlanId) {
        setResult(null);
        setMode('create');
        setViewingSavedPlan(null);
      }
      if (selectedPlanId === deletePlanId) {
        setSelectedPlanId(updated[0]?.id || null);
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setDeletePlanId(null);
    }
  };

  const handleRegenerateCurrent = async () => {
    const planId = resultData?.id || selectedPlanId;
    if (!planId) return;
    setIsRegenerating(true);
    setError('');
    try {
      const regenerated = await prepHubService.regeneratePlan(planId, Boolean(regenerateFormData.use_web_search));
      const detail = await prepHubService.getPlanDetail(planId);
      setResult(detail?.result_payload ? { id: detail.id, ...detail.result_payload, progress: detail.progress, progress_payload: detail.progress_payload } : regenerated);
      setMode('result');
      await refreshPlans(planId);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSetFocus = async (planId) => {
    try {
      await prepHubService.setFocus(planId);
      setFocusedPlanId(planId);
      localStorage.setItem('prepHub_focusedPlan', JSON.stringify(planId));
      await refreshPlans(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleRemoveFocus = async (planId) => {
    try {
      setFocusedPlanId(null);
      localStorage.removeItem('prepHub_focusedPlan');
      await refreshPlans(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleStartPhase = async (phaseIndex) => {
    const planId = resultData?.id || selectedPlanId;
    if (!planId) return;
    try {
      await prepHubService.startPhase(planId, phaseIndex);
      await openExistingPlan(planId);
      await refreshPlans(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleToggleTask = async (phaseIndex, taskIndex) => {
    const planId = resultData?.id || selectedPlanId;
    if (!planId) return;
    const id = `${phaseIndex}:${taskIndex}`;
    const completed = !completedTaskIds.has(id);
    try {
      await prepHubService.toggleTask(planId, phaseIndex, taskIndex, completed);
      await openExistingPlan(planId);
      await refreshPlans(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleSaveResource = async (url) => {
    const planId = resultData?.id || selectedPlanId;
    if (!planId || !url) return;
    try {
      await prepHubService.saveResource(planId, url);
      setSavedResourceId(url);
      setTimeout(() => setSavedResourceId(null), 2000);
      await openExistingPlan(planId);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const renderPhases = () => (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 overflow-y-auto shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-[var(--accent)]" />
        <h3 className="text-subhead text-[var(--text-primary)]">Roadmap Phases</h3>
      </div>
      <div className="space-y-3">
        {(resultData.phases || []).length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-base)] px-4 py-5 text-body text-[var(--text-muted)]">
            No phases generated for this plan yet.
          </div>
        ) : (resultData.phases || []).map((phase, index) => {
          const isCurrentPhase = currentPhaseIndex === index;
          const isCompletedPhase = index < currentPhaseIndex;
          const isFuturePhase = index > currentPhaseIndex;
          const canStart = isFuturePhase && index === currentPhaseIndex + 1;

          const allPreviousCompleted = () => {
            if (index === 0) return true;
            for (let i = 0; i < index; i++) {
              const prevPhase = resultData.phases[i];
              const prevTasks = prevPhase.tasks || [];
              const allDone = prevTasks.every((_, taskIdx) =>
                completedTaskIds.has(`${i}:${taskIdx}`)
              );
              if (!allDone) return false;
            }
            return true;
          };

          const shouldShowStartButton = (index === 0 && !isCurrentPhase) || (canStart && allPreviousCompleted() && !isCurrentPhase);

          return (
            <div key={`${phase.title}-${index}`} className={`rounded-[var(--radius-md)] border p-4 transition-all ${
              isCurrentPhase
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                : isCompletedPhase
                ? 'border-[var(--border)] bg-[var(--bg-base)] opacity-75'
                : 'border-[var(--border)] bg-[var(--bg-base)]'
            }`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Phase {index + 1}</div>
                  <div className="text-body text-[var(--text-primary)] font-semibold mt-1 break-words">{phase.title}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {currentPhaseIndex === index && (
                    <span className="text-caption px-2 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-emerald-400">
                      Current
                    </span>
                  )}
                  <span className="text-caption px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                    {phase.duration_label}
                  </span>
                </div>
              </div>
              <p className="text-caption text-[var(--text-secondary)] mt-2">{phase.objective}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {shouldShowStartButton && (
                  <button
                    onClick={() => handleStartPhase(index)}
                    className="btn-secondary text-caption px-3 py-2"
                  >
                    Start This Phase
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {(phase.tasks || []).map((task, taskIndex) => (
                  <button
                    type="button"
                    key={`${phase.title}-task-${taskIndex}`}
                    onClick={() => handleToggleTask(index, taskIndex)}
                    className="w-full flex items-start gap-2 text-body text-[var(--text-secondary)] text-left hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    <CheckCircle2
                      size={13}
                      className={`mt-0.5 ${completedTaskIds.has(`${index}:${taskIndex}`) ? 'text-emerald-400' : 'text-[var(--accent)]'}`}
                    />
                    <span className={completedTaskIds.has(`${index}:${taskIndex}`) ? 'line-through opacity-70' : ''}>{task}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderResources = (animated = false) => (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 overflow-y-auto shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 mb-3">
        {animated ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BookOpenText size={14} className="text-[var(--accent)]" />
          </motion.div>
        ) : (
          <BookOpenText size={14} className="text-[var(--accent)]" />
        )}
        {animated ? (
          <motion.h3
            className="text-subhead text-[var(--text-primary)]"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--accent) 50%, var(--text-primary) 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Live Resources
          </motion.h3>
        ) : (
          <h3 className="text-subhead text-[var(--text-primary)]">Live Resources</h3>
        )}
      </div>
      <div className="space-y-3">
        {(resultData.resources || []).length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-base)] px-4 py-5 text-body text-[var(--text-muted)]">
            No curated resources found for this plan yet.
          </div>
        ) : (resultData.resources || []).map((resource, index) => (
          <a
            key={`${resource.title}-${index}`}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] p-3 hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-body text-[var(--text-primary)] font-medium line-clamp-2">{resource.title}</div>
              <Link2 size={13} className="text-[var(--text-muted)] shrink-0" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-caption px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">{resource.type}</span>
              <span className="text-caption px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{resource.difficulty}</span>
              <span className="text-caption px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{resource.estimated_time}</span>
            </div>
            <p className="text-caption text-[var(--text-secondary)] mt-2">{resource.why_recommended}</p>
            <div className="text-caption text-[var(--text-muted)] mt-2">Phase: {resource.phase_tag}</div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSaveResource(resource.url);
              }}
              className={`mt-2 text-caption hover:underline inline-flex items-center gap-1.5 transition-colors ${
                savedResourceId === resource.url ? 'text-emerald-400' : 'text-[var(--accent)]'
              }`}
            >
              {savedResourceId === resource.url ? (
                <><CheckCircle2 size={12} />Saved ✓</>
              ) : (
                'Save Resource'
              )}
            </button>
          </a>
        ))}
      </div>
      {resultData.next_step && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent-subtle)] p-3 text-body text-[var(--text-primary)]">
          <span className="text-caption uppercase tracking-[0.08em] text-[var(--accent)]">Recommended Next Step</span>
          <p className="mt-1">{resultData.next_step}</p>
        </div>
      )}
      <div className="mt-3">
        {focusedPlanId === resultData.id ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRemoveFocus(resultData.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] border-2 border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent-subtle)] transition-colors"
            >
              <Star size={16} fill="currentColor" />
              Remove Focus
            </button>
            <span className="text-caption text-[var(--text-muted)] px-2">✓ Currently Focused</span>
          </div>
        ) : (
          <button
            onClick={() => handleSetFocus(resultData.id)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] border-2 border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent-subtle)] transition-colors"
          >
            <Star size={16} />
            Set as Focus
          </button>
        )}
      </div>
    </div>
  );

  const renderSavedPlanCards = () => (
    <motion.div
      key="saved-cards"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full h-full overflow-y-auto"
    >
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <Target size={64} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
            <h3 className="text-heading text-[var(--text-primary)] mb-2">No saved plans yet</h3>
            <p className="text-body text-[var(--text-secondary)] mb-6">
              Create your first prep plan and it will appear here
            </p>
            <button
              onClick={() => {
                setActiveTab('create');
                resetForm();
                setMode('create');
                setResult(null);
              }}
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
            >
              <Compass size={18} />
              Create Your First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {plans.map((plan) => {
            const completionPercent = plan.completion_percent || 0;
            const overview = plan.overview || '';
            const updatedAt = plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : '';

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] transition-all cursor-pointer group"
                onClick={() => openExistingPlan(plan.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-body text-[var(--text-primary)] font-semibold line-clamp-2 flex-1 mr-2 group-hover:text-[var(--accent)] transition-colors">
                    {plan.topic}
                  </h3>
                  {plan.is_active_focus && (
                    <Star size={16} className="text-[var(--accent)] shrink-0" fill="currentColor" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-caption text-[var(--text-secondary)]">
                    <Target size={12} />
                    <span className="capitalize">{plan.goal?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-[var(--text-secondary)]">
                    <Clock3 size={12} />
                    <span>{plan.duration_days} days • {plan.hours_per_day}h/day</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-[var(--text-secondary)]">
                    <BookOpenText size={12} />
                    <span className="capitalize">{plan.level}</span>
                  </div>
                </div>

                {overview && (
                  <p className="text-caption text-[var(--text-muted)] line-clamp-2 mb-3">
                    {overview}
                  </p>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between text-caption mb-1">
                    <span className="text-[var(--text-secondary)]">Progress</span>
                    <span className="text-[var(--accent)] font-medium">{completionPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <span className="text-caption text-[var(--text-muted)]">
                    Updated {updatedAt}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                      className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--danger)] hover:bg-opacity-10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                      title="Delete plan"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenamePlan(plan.id, plan.topic);
                      }}
                      className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--accent-subtle)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      title="Rename plan"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  const renderSavedPlanDetail = () => (
    <motion.div
      key="saved-plan-detail"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseSavedPlan}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            title="Close and back to saved plans"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h2 className="text-heading text-[var(--text-primary)]">{resultData.topic}</h2>
          {focusedPlanId === resultData.id && (
            <span className="text-caption px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
              <Star size={12} className="inline mr-1" fill="currentColor" />
              Focused
            </span>
          )}
        </div>
        <button
          onClick={() => setShowRegenerateOptions(!showRegenerateOptions)}
          disabled={isRegenerating}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 h-full">
          {renderPhases()}
          {renderResources(false)}
        </div>
      </div>

      {showRegenerateOptions && (
        <div className="absolute right-4 top-16 z-50 w-72 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-md)]">
          <div className="text-caption text-[var(--text-muted)] mb-2">Regeneration Options</div>
          <label className="flex items-center gap-2 cursor-pointer text-body text-[var(--text-secondary)] mb-3">
            <input
              type="checkbox"
              checked={regenerateFormData.use_web_search}
              onChange={(e) => setRegenerateFormData({ use_web_search: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Use live web search for fresher resources
          </label>
          <button
            onClick={() => {
              handleRegenerateCurrent();
              setShowRegenerateOptions(false);
            }}
            disabled={isRegenerating}
            className="btn-primary w-full text-caption px-3 py-2"
          >
            {isRegenerating ? 'Regenerating...' : 'Confirm Regenerate'}
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {mode === 'result' && resultData ? (
          <div className="flex items-center gap-3">
            <h1 className="text-display text-[var(--text-primary)]">{resultData.topic}</h1>
            {focusedPlanId === resultData.id && (
              <span className="text-caption px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                <Star size={12} className="inline mr-1" fill="currentColor" />
                Focused
              </span>
            )}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] p-1 gap-1">
            {[
              { id: 'active', label: 'Active Plans' },
              { id: 'saved', label: 'Saved' },
              { id: 'create', label: 'Create' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'create') {
                    resetForm();
                    setMode('create');
                    setResult(null);
                  }
                  if (tab.id === 'active' && activeFocusPlan && resultData?.id !== activeFocusPlan.id) {
                    openExistingPlan(activeFocusPlan.id);
                  }
                  if (tab.id === 'saved') {
                    setViewingSavedPlan(null);
                    setMode('create');
                    setResult(null);
                  }
                }}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-caption whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {mode === 'result' && activeTab !== 'saved' && (
            <div className="relative">
              <button
                onClick={() => setShowRegenerateOptions(!showRegenerateOptions)}
                disabled={isRegenerating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}</span>
              </button>
              {showRegenerateOptions && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-md)]">
                  <div className="text-caption text-[var(--text-muted)] mb-2">Regeneration Options</div>
                  <label className="flex items-center gap-2 cursor-pointer text-body text-[var(--text-secondary)] mb-3">
                    <input
                      type="checkbox"
                      checked={regenerateFormData.use_web_search}
                      onChange={(e) => setRegenerateFormData({ use_web_search: e.target.checked })}
                      className="accent-[var(--accent)]"
                    />
                    Use live web search for fresher resources
                  </label>
                  <button
                    onClick={() => {
                      handleRegenerateCurrent();
                      setShowRegenerateOptions(false);
                    }}
                    disabled={isRegenerating}
                    className="btn-primary w-full text-caption px-3 py-2"
                  >
                    {isRegenerating ? 'Regenerating...' : 'Confirm Regenerate'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--accent-subtle)] px-4 py-3 text-body text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 px-4 pb-3 flex items-center justify-center">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 size={48} className="text-[var(--accent)] animate-spin" />
            <p className="text-body text-[var(--text-secondary)]">Loading your prep plans...</p>
          </div>
        ) : activeTab === 'saved' ? (
          <div className="w-full h-full">
            <AnimatePresence mode="wait">
              {viewingSavedPlan && mode === 'result' && resultData
                ? renderSavedPlanDetail()
                : renderSavedPlanCards()
              }
            </AnimatePresence>
          </div>
        ) : mode === 'create' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-6xl"
            >
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-base)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-[var(--radius-md)] bg-[var(--accent-subtle)]">
                      <Sparkles size={18} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <h2 className="text-heading text-[var(--text-primary)]">Create New Prep Plan</h2>
                      <p className="text-caption text-[var(--text-secondary)] mt-0.5">Define your learning goal and we'll generate a structured roadmap</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleGenerate} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="md:col-span-2 lg:col-span-3">
                      <label htmlFor="prep-topic" className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Topic / Subject
                      </label>
                      <input
                        id="prep-topic"
                        type="text"
                        value={formData.topic}
                        onChange={(e) => handleFormChange('topic', e.target.value)}
                        required
                        placeholder="e.g., Data Structures & Algorithms for Tech Interviews"
                        className="input-field w-full px-4 py-3 text-body"
                      />
                    </div>

                    <div>
                      <label htmlFor="prep-goal" className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Goal Type
                      </label>
                      <select
                        id="prep-goal"
                        value={formData.goal}
                        onChange={(e) => handleFormChange('goal', e.target.value)}
                        className="input-field w-full px-4 py-3 text-body"
                      >
                        {GOAL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="prep-level" className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Current Level
                      </label>
                      <select
                        id="prep-level"
                        value={formData.level}
                        onChange={(e) => handleFormChange('level', e.target.value)}
                        className="input-field w-full px-4 py-3 text-body"
                      >
                        {LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="prep-duration" className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Duration (Days)
                      </label>
                      <input
                        id="prep-duration"
                        type="number"
                        min="3"
                        max="180"
                        value={formData.duration_days}
                        onChange={(e) => handleFormChange('duration_days', Number(e.target.value))}
                        className="input-field w-full px-4 py-3 text-body"
                      />
                    </div>

                    <div>
                      <label htmlFor="prep-hours" className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Study Hours / Day
                      </label>
                      <input
                        id="prep-hours"
                        type="number"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={formData.hours_per_day}
                        onChange={(e) => handleFormChange('hours_per_day', Number(e.target.value))}
                        className="input-field w-full px-4 py-3 text-body"
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="block text-caption font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                        Preferred Resource Format
                      </label>
                      <div className="grid grid-cols-5 gap-3">
                        {FORMAT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleFormChange('preferred_format', option.value)}
                            className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-body font-medium transition-all ${
                              formData.preferred_format === option.value
                                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm'
                                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-[var(--border)] flex justify-center">
                    <button
                      type="submit"
                      className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-3.5 min-w-[280px]"
                    >
                      <Compass size={18} />
                      Generate Roadmap
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}

        {mode === 'generating' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 h-full flex flex-col justify-center"
            >
              <div className="max-w-xl mx-auto w-full">
                <h2 className="text-heading text-[var(--text-primary)] mb-2">Generating your Prep Hub mission plan...</h2>
                <p className="text-body text-[var(--text-secondary)] mb-6">We're tailoring the plan for your topic, level, and schedule.</p>
                <div className="space-y-3">
                  {GENERATION_STEPS.map((step, idx) => {
                    const active = idx === loadingStep;
                    const done = idx < loadingStep;
                    return (
                      <div
                        key={step}
                        className={`rounded-[var(--radius-sm)] border px-4 py-3 flex items-center gap-3 ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                            : done
                              ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)]'
                              : 'border-[var(--border)] bg-[var(--bg-base)]'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : active ? (
                          <Loader2 size={16} className="text-[var(--accent)] animate-spin" />
                        ) : (
                          <Clock3 size={16} className="text-[var(--text-muted)]" />
                        )}
                        <span className={`text-body ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {mode === 'result' && resultData && activeTab !== 'saved' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="h-full flex flex-col gap-3 sm:gap-4 min-h-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-3 sm:gap-4 min-h-0 flex-1">
                {renderPhases()}
                {renderResources(true)}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {activeTab === 'active' && !isLoadingHistory && activePlans.length === 0 && mode !== 'result' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="empty-active"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center"
            >
              <Target size={64} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
              <h3 className="text-heading text-[var(--text-primary)] mb-2">No active plans yet</h3>
              <p className="text-body text-[var(--text-secondary)] mb-6">
                Create your first prep plan to get started with a personalized learning roadmap
              </p>
              <button
                onClick={() => {
                  setActiveTab('create');
                  resetForm();
                  setMode('create');
                  setResult(null);
                }}
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
              >
                <Compass size={18} />
                Create Your First Plan
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {deletePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-lg)] p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[var(--danger)] bg-opacity-10">
                <Trash2 size={24} className="text-[var(--danger)]" />
              </div>
              <h3 className="text-heading text-[var(--text-primary)]">Delete Plan</h3>
            </div>
            <p className="text-body text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this prep plan? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletePlanId(null)}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--danger)] text-white hover:bg-opacity-90 transition-colors"
              >
                Delete Plan
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {renamePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-lg)] p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[var(--accent-subtle)]">
                <Pencil size={24} className="text-[var(--accent)]" />
              </div>
              <h3 className="text-heading text-[var(--text-primary)]">Rename Plan</h3>
            </div>
            <div className="mb-6">
              <label className="block text-caption text-[var(--text-secondary)] mb-2">
                Plan Topic
              </label>
              <input
                type="text"
                value={renameTopicValue}
                onChange={(e) => setRenameTopicValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmRename();
                  } else if (e.key === 'Escape') {
                    setRenamePlanId(null);
                    setRenameTopicValue('');
                  }
                }}
                className="input-field w-full px-4 py-3 text-body"
                placeholder="Enter new topic name"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRenamePlanId(null);
                  setRenameTopicValue('');
                }}
                className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={!renameTopicValue.trim()}
                className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PrepHub;