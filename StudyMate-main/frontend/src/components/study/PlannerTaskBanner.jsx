import { useState } from 'react';
const PlannerTaskBanner = ({ task, onMarkComplete }) => {
    const [marking, setMarking] = useState(false);
    const [markedLocally, setMarkedLocally] = useState(false);

    if (!task) return null;

    const canMark =
        typeof onMarkComplete === 'function' &&
        task.planId != null &&
        task.scheduleIndex != null &&
        !task.completedInPlan &&
        !markedLocally;

    const handleMark = async () => {
        if (!canMark || marking) return;
        setMarking(true);
        try {
            await onMarkComplete(task.planId, task.scheduleIndex);
            setMarkedLocally(true);
        } catch (e) {
            console.error('Mark planner task failed:', e);
        } finally {
            setMarking(false);
        }
    };

    const mins = task.estimated_time != null && task.estimated_time !== '' ? `${task.estimated_time} min` : null;
    const typeLabel = String(task.task_type || '').replace(/_/g, ' ');

    return (
        <div className="mb-4 p-4 rounded-xl border border-cosmic-purple/30 bg-cosmic-purple/10 text-left shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cosmic-purple-light mb-1">From your study plan</div>
            <div className="text-sm font-semibold text-white">
                Day {task.day} · {typeLabel}
                {mins ? ` · ${mins}` : ''}
            </div>
            <p className="text-xs text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{task.task}</p>
            {(canMark || markedLocally || task.completedInPlan) && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    {markedLocally || task.completedInPlan ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">Marked complete in planner</span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleMark}
                            disabled={marking}
                            className="btn-secondary h-9 px-4 text-xs rounded-lg cursor-pointer disabled:opacity-50"
                        >
                            {marking ? 'Saving…' : 'Mark this day complete'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlannerTaskBanner;
