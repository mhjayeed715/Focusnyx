"use client";

import { useState } from "react";
import { BadgeCheck, Clock3, Flame, Edit2, Trash2, CheckSquare, CheckCircle2, ChevronDown } from "lucide-react";

export type TaskStatus = "ready" | "in-progress" | "done";

export type Task = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  xp: number;
  status: TaskStatus;
};

type TaskListProps = {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  totalXp?: number;
};

export function TaskList({ tasks, onToggleComplete, onEdit, onDelete, totalXp }: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="rounded-[20px] border-2 border-dashed border-[var(--foreground)] bg-white px-4 py-8 text-center">
        <p className="text-sm text-[var(--muted-fg)]">No tasks yet. Add one to build momentum.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id}>
          <button
            onClick={() => setExpandedTaskId((value) => (value === task.id ? null : task.id))}
            className={`w-full rounded-[22px] border-2 border-[var(--foreground)] px-4 py-3 text-left shadow-[4px_4px_0_0_#1E293B] transition ${task.status === "done" ? "bg-[#ECFDF5]" : "bg-white"}`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleComplete(task);
                }}
                className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] ${task.status === "done" ? "bg-[#34D399]" : "bg-[#FDF2F8]"}`}
              >
                {task.status === "done" ? <CheckCircle2 size={14} strokeWidth={2.5} className="text-white" /> : <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-bold leading-6 ${task.status === "done" ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">
                      {task.subject} • {task.minutes}m
                    </p>
                  </div>
                  <span className="hard-chip shrink-0 px-3 py-1.5 text-xs font-black text-[var(--foreground)]">+{task.xp} XP</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">
                  <span className={`rounded-full px-2 py-1 ${
                    task.subject.toLowerCase().includes("focus") 
                      ? "bg-[#F472B6] text-white" 
                      : task.subject.toLowerCase().includes("finance") 
                        ? "bg-[#34D399] text-[var(--foreground)]" 
                        : task.subject.toLowerCase().includes("science") 
                          ? "bg-[#FBBF24] text-[var(--foreground)]" 
                          : "bg-[#8B5CF6] text-white"
                  }`}>{task.subject}</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      ))}
      {totalXp !== undefined && totalXp > 0 && (
        <div className="mt-3 text-center">
          <span className="hard-chip px-4 py-2 text-sm font-black">Total XP: {totalXp}</span>
        </div>
      )}
    </div>
  );
}

export type EditableTask = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  xp: number;
  status: TaskStatus;
};

type EditTaskModalProps = {
  task: EditableTask | null;
  onClose: () => void;
  onSave: (task: EditableTask) => void;
};

export function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [subject, setSubject] = useState(task?.subject || "");
  const [minutes, setMinutes] = useState(String(task?.minutes || 25));

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]" onClick={(e) => e.stopPropagation()}>
        <h4 className="font-display text-xl font-black">Edit Task</h4>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-[12px] border-2 border-[var(--foreground)] px-3 py-2"
            placeholder="Task title"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-[12px] border-2 border-[var(--foreground)] px-3 py-2"
            placeholder="Subject"
          />
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full rounded-[12px] border-2 border-[var(--foreground)] px-3 py-2"
            placeholder="Minutes"
            min="1"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onSave({ ...task, title, subject, minutes: Number(minutes) || 25 })} className="candy-button flex-1 py-2 text-sm">Save</button>
          <button onClick={onClose} className="secondary-button flex-1 py-2 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}