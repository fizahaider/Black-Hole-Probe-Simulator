import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { analyticsService } from '../../services/analyticsService';
import { OPEN_STUDY_TOOL_EVENT } from '../../constants/studyToolEvents';
import { BookOpen, Play, TrendingUp, AlertTriangle, Flame, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activePlanData, setActivePlanData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const linePoints = useMemo(() => {
    const trend = analytics?.quiz_trend || [];
    if (!trend.length) return '';
    const width = 320;
    const height = 120;
    const minY = 0;
    const maxY = 100;
    const step = trend.length > 1 ? width / (trend.length - 1) : width;
    return trend
      .map((point, index) => {
        const x = index * step;
        const y = height - ((point.score - minY) / (maxY - minY)) * height;
        return `${x},${Math.max(0, Math.min(height, y))}`;
      })
      .join(' ');
  }, [analytics?.quiz_trend]);

  const miniTrendPoints = useMemo(() => {
    const trend = analytics?.quiz_trend || [];
    if (!trend.length) return '';
    const width = 96;
    const height = 24;
    const step = trend.length > 1 ? width / (trend.length - 1) : width;
    return trend
      .map((point, index) => {
        const x = index * step;
        const y = height - (Math.max(0, Math.min(100, Number(point.score || 0))) / 100) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [analytics?.quiz_trend]);

  const masteryBreakdown = useMemo(() => {
    const distribution = analytics?.mastery_distribution || {};
    const total = Object.values(distribution).reduce((sum, val) => sum + Number(val || 0), 0) || 1;
    const parts = [
      { key: 'mastered', label: 'Mastered', color: '#10b981', value: distribution.mastered || 0 },
      { key: 'proficient', label: 'Proficient', color: '#3b82f6', value: distribution.proficient || 0 },
      { key: 'learning', label: 'Learning', color: '#f59e0b', value: distribution.learning || 0 },
      { key: 'struggling', label: 'Struggling', color: '#ef4444', value: distribution.struggling || 0 },
    ];
    return parts.map((item) => ({ ...item, pct: Math.round((item.value / total) * 100) }));
  }, [analytics?.mastery_distribution]);

  const avgQuizScore = useMemo(() => {
    const trend = analytics?.quiz_trend || [];
    if (!trend.length) return 0;
    const total = trend.reduce((sum, point) => sum + Number(point.score || 0), 0);
    return Math.round(total / trend.length);
  }, [analytics?.quiz_trend]);

  const weeklyDelta = useMemo(() => {
    const trend = analytics?.quiz_trend || [];
    if (trend.length < 2) return 0;
    const splitIndex = Math.max(1, Math.floor(trend.length / 2));
    const oldBatch = trend.slice(0, splitIndex);
    const newBatch = trend.slice(splitIndex);
    const oldAvg = oldBatch.reduce((s, p) => s + Number(p.score || 0), 0) / oldBatch.length;
    const newAvg = newBatch.reduce((s, p) => s + Number(p.score || 0), 0) / Math.max(1, newBatch.length);
    return Math.round(newAvg - oldAvg);
  }, [analytics?.quiz_trend]);

  const consistencyScore = useMemo(() => {
    const days = analytics?.activity_heatmap || [];
    if (!days.length) return 0;
    const activeDays = days.filter((d) => Number(d.count || 0) > 0).length;
    return Math.round((activeDays / days.length) * 100);
  }, [analytics?.activity_heatmap]);

  const heatmapWeeks = useMemo(() => {
    const days = analytics?.activity_heatmap || [];
    if (!days.length) return [];
    const columns = [];
    for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));
    return columns;
  }, [analytics?.activity_heatmap]);

  useEffect(() => {
    const loadGlobalTask = async () => {
      try {
        const history = await documentService.getStudyPlanHistory();
        const activePlans = Array.isArray(history) ? history.filter(p => p.status === 'active') : [];
        for (const p of activePlans) {
            const rawSchedule = p.schedule ?? p.plan_content?.schedule;
            const scheduleList = Array.isArray(rawSchedule) ? rawSchedule : [];
            const next = pickNextIncompleteTask(scheduleList);
            if (next) {
                setActivePlanData({ plan: p, next });
                break;
            }
        }
      } catch (e) {
        console.error("Failed to load global study plans", e);
      }
    };
    loadGlobalTask();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        const data = await analyticsService.getDashboard();
        if (mounted) setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics dashboard', error);
      } finally {
        if (mounted) setIsLoadingAnalytics(false);
      }
    };
    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const handleQuickJump = () => {
      if (!activePlanData) return;
      const { plan, next } = activePlanData;
      const t = String(next.slot.task_type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const taskType = ['read', 'quiz', 'flashcards', 'review'].includes(t) ? t : 'review';
      
      const TASK_TOOL = {
        read: 'summary',
        quiz: 'quiz',
        flashcards: 'flashcards',
        review: 'chat'
      };
      
      const dayNum = parseDayNumber(next.slot);
      const displayDay = Number.isFinite(dayNum) ? dayNum : next.slot?.day ?? '—';

      const launchOpts = {
        plannerTask: {
          planId: plan.id,
          scheduleIndex: next.index,
          day: displayDay,
          task: next.slot.task ?? '',
          task_type: taskType,
          estimated_time: next.slot.estimated_time,
          references: Array.isArray(next.slot.references) ? next.slot.references : []
        },
        ...(TASK_TOOL[taskType] === 'quiz' ? { autoStart: true, key: `${Date.now()}` } : {})
      };

      navigate('/dashboard/study');
      setTimeout(() => {
        
        window.dispatchEvent(
            new CustomEvent(OPEN_STUDY_TOOL_EVENT, {
            detail: { tool: TASK_TOOL[taskType], launchOptions: launchOpts }
            })
        );
      }, 500);
  };

  const streakCount = analytics?.top_stats?.streak_days ?? user?.streak_count ?? 0;
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const completedDays = Math.max(0, Math.min(7, streakCount));
  const streakDots = Array.from({ length: 7 }, (_, index) => index < completedDays);
  const readiness = analytics?.exam_readiness || { score: 0, label: 'Not Started' };
  const weakConcepts = analytics?.weak_concepts || [];
  const insights = analytics?.insights || [];
  const prepHub = analytics?.prep_hub || {};
  const focusNow = weakConcepts[0] || null;
  const reviewUrgency = weakConcepts.filter((item) => Number(item.mastery || 0) < 50).length;

  const heroBadgeTone =
    readiness.score >= 85 ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
      : readiness.score >= 65 ? 'text-sky-300 border-sky-500/40 bg-sky-500/10'
      : 'text-amber-300 border-amber-500/40 bg-amber-500/10';

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-full flex flex-col gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
          <h1 className="text-display text-[var(--text-primary)]">{greeting}, {user?.name || 'Scholar'}</h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">
            Learning intelligence at a glance: progress, risks, and your next best move.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            {
              label: 'Exam Readiness',
              value: `${readiness.score}%`,
              sub: readiness.label,
              icon: Target,
            },
            {
              label: 'Average Quiz',
              value: `${avgQuizScore}%`,
              sub: `${weeklyDelta >= 0 ? '+' : ''}${weeklyDelta}% trend shift`,
              icon: TrendingUp,
            },
            {
              label: 'Consistency',
              value: `${consistencyScore}%`,
              sub: 'active study days',
              icon: Flame,
            },
            {
              label: 'Mastered Concepts',
              value: `${analytics?.top_stats?.mastered_concepts ?? 0}`,
              sub: `of ${analytics?.top_stats?.total_concepts ?? 0} total`,
              icon: BookOpen,
            },
            {
              label: 'Prep Plans',
              value: `${prepHub.total_plans ?? 0}`,
              sub: prepHub.active_topic ? `focus: ${prepHub.active_topic}` : 'no active prep focus',
              icon: Target,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]/90 backdrop-blur-sm px-4 py-3 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">{item.label}</span>
                <item.icon size={14} className="text-[var(--text-muted)]" />
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="text-subhead text-[var(--text-primary)]">{item.value}</div>
                {miniTrendPoints && (
                  <svg width="96" height="24" viewBox="0 0 96 24" className="shrink-0 opacity-80">
                    <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={miniTrendPoints} />
                  </svg>
                )}
              </div>
              <div className="text-caption text-[var(--text-secondary)] mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0 flex-1 pb-2">
          <div className="xl:col-span-8 min-h-0 flex flex-col gap-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-surface)] to-[var(--accent-subtle)]/20 p-5 min-h-[240px] shadow-[var(--shadow-sm)] relative overflow-hidden">
              <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Learning Command Trend</div>
                  <div className="text-body text-[var(--text-secondary)] mt-1">Performance trajectory with readiness benchmark</div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-caption ${heroBadgeTone}`}>
                    {readiness.label}
                  </span>
                  <div className="text-subhead text-[var(--accent)] mt-1">{analytics?.top_stats?.weekly_quizzes ?? 0} quizzes</div>
                </div>
              </div>
              {isLoadingAnalytics ? (
                <div className="h-[150px] bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
              ) : (analytics?.quiz_trend || []).length > 0 ? (
                <div>
                  <svg width="320" height="160" viewBox="0 0 320 160" className="w-full max-w-full">
                    <defs>
                      <linearGradient id="trendGradientPremium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="47" x2="320" y2="47" stroke="rgba(148,163,184,0.3)" strokeDasharray="3 4" />
                    <text x="4" y="43" fill="var(--text-muted)" fontSize="9">70 target</text>
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={linePoints}
                      transform="translate(0 25)"
                    />
                    <polygon
                      fill="url(#trendGradientPremium)"
                      points={`0,135 ${linePoints ? `${linePoints} ` : ''}320,135`}
                      transform="translate(0 25)"
                    />
                  </svg>
                  <div className="mt-1 flex justify-between text-caption text-[var(--text-muted)]">
                    <span>{analytics.quiz_trend[0]?.date}</span>
                    <span>{analytics.quiz_trend[analytics.quiz_trend.length - 1]?.date}</span>
                  </div>
                </div>
              ) : (
                <p className="text-body text-[var(--text-muted)]">No quiz attempts yet.</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">Mastery Distribution</div>
                <div className="space-y-2.5">
                  {masteryBreakdown.map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between text-body text-[var(--text-secondary)]">
                        <span>{item.label}</span>
                        <span>{item.value} ({item.pct}%)</span>
                      </div>
                      <div className="h-2 mt-1 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] overflow-hidden">
                        <div className="h-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">Consistency Heatmap</div>
                <div className="overflow-x-auto">
                  <div className="inline-flex gap-1">
                    {heatmapWeeks.map((week, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                        {week.map((day) => {
                          const count = day.count || 0;
                          let bg = 'bg-[var(--bg-elevated)]';
                          if (count >= 4) bg = 'bg-emerald-600';
                          else if (count >= 3) bg = 'bg-emerald-500';
                          else if (count >= 2) bg = 'bg-emerald-400';
                          else if (count >= 1) bg = 'bg-emerald-300';
                          return <span key={day.date} className={`w-3 h-3 rounded-[2px] ${bg}`} title={`${day.date}: ${count}`} />;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-caption text-[var(--text-muted)] mt-2">Last 12 weeks of completed learning activity.</p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 min-h-0 flex flex-col gap-4">
            <div className="rounded-[var(--radius-lg)] border border-[rgba(239,68,68,0.35)] bg-gradient-to-b from-[rgba(239,68,68,0.08)] to-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Focus Now</div>
                <AlertTriangle size={14} className="text-[var(--danger)]" />
              </div>
              {focusNow ? (
                <div>
                  <div className="text-subhead text-[var(--text-primary)] leading-tight">{focusNow.concept}</div>
                  <div className="text-caption text-[var(--text-muted)] mt-1">{focusNow.document}</div>
                  <div className="mt-3 h-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] overflow-hidden">
                    <div className="h-full bg-[var(--danger)]" style={{ width: `${focusNow.mastery}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-caption text-[var(--text-secondary)]">
                    <span>Mastery</span>
                    <span>{focusNow.mastery}%</span>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2 py-1 text-caption text-[var(--danger)]">
                    {reviewUrgency} urgent concept{reviewUrgency === 1 ? '' : 's'}
                  </div>
                </div>
              ) : (
                <p className="text-body text-[var(--text-muted)]">No weak concepts detected yet.</p>
              )}
            </div>

            {activePlanData ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} className="text-[var(--accent)]" />
                  <span className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)]">Next Best Action</span>
                </div>
                <h3 className="text-body text-[var(--text-primary)]">
                  Day {parseDayNumber(activePlanData.next.slot) || 'X'}: {activePlanData.next.slot.task}
                </h3>
                <div className="mt-3 h-1 w-full rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] progress-fill"
                    style={{ '--bar-width': `${Number(activePlanData?.plan?.progress_percent || activePlanData?.plan?.progress || 40)}%` }}
                  />
                </div>
                <button
                  onClick={handleQuickJump}
                  className="btn-primary mt-4 w-full inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Continue Plan
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <p className="text-body text-[var(--text-muted)]">
                  No active study plan. Start one in Study Space.
                </p>
              </div>
            )}

            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-h-0">
              <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">Learning Insights</div>
              <div className="space-y-2 max-h-[190px] overflow-auto pr-1">
                {insights.length > 0 ? (
                  insights.map((insight, idx) => (
                    <div key={`insight-${idx}`} className="text-body text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="pt-0.5">
                        {insight.icon === 'trend'
                          ? <ArrowUpRight size={14} className="text-emerald-400" />
                          : insight.icon === 'warning'
                            ? <AlertTriangle size={14} className="text-amber-400" />
                            : insight.icon === 'clock'
                              ? <ArrowDownRight size={14} className="text-sky-400" />
                              : <Flame size={14} className="text-[var(--accent)]" />}
                      </span>
                      <span>{insight.text}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-body text-[var(--text-muted)]">No insights yet. Complete a few quizzes to unlock them.</p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-caption text-[var(--text-muted)]">
                <span>Streak</span>
                <span>{streakCount} days</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {streakDots.map((active, index) => (
                  <span
                    key={`streak-dot-${index}`}
                    className={`w-2 h-2 rounded-full ${active ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <div className="text-caption uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">Prep Hub Focus</div>
              {prepHub.active_topic ? (
                <div>
                  <div className="text-body text-[var(--text-primary)] font-semibold">{prepHub.active_topic}</div>
                  <div className="text-caption text-[var(--text-secondary)] mt-1">
                    {prepHub.completion_percent ?? 0}% complete • {prepHub.saved_resources ?? 0} saved resources
                  </div>
                  <div className="mt-2 h-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${prepHub.completion_percent ?? 0}%` }} />
                  </div>
                  {prepHub.next_best_action && (
                    <p className="text-caption text-[var(--text-secondary)] mt-2">{prepHub.next_best_action}</p>
                  )}
                </div>
              ) : (
                <p className="text-body text-[var(--text-muted)]">No active prep topic yet. Create one in Prep Hub.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
