import type { Task } from '../lib/supabase'

const statusLabels: Record<Task['status'], string> = {
  todo: 'للقيام به',
  in_progress: 'قيد التنفيذ',
  done: 'مكتمل',
}

const priorityLabels: Record<Task['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
}

function isOverdue(due: string | null, status: Task['status']) {
  if (!due || status === 'done') return false
  return new Date(due) < new Date(new Date().toDateString())
}

function formatDue(due: string | null) {
  if (!due) return null
  const d = new Date(due)
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

type Props = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onToggleStatus: (task: Task) => void
}

export default function TaskCard({ task, onEdit, onDelete, onToggleStatus }: Props) {
  const due = formatDue(task.due_date)
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className={`task-card priority-${task.priority} ${task.status === 'done' ? 'done' : ''}`}>
      <div className="task-top">
        <h3 className="task-title">{task.title}</h3>
      </div>
      {task.description && <p className="task-desc">{task.description}</p>}

      <div className="task-meta">
        <span className={`status-pill status-${task.status}`}>
          <span className="status-dot" />
          {statusLabels[task.status]}
        </span>
        <span className={`badge badge-${task.priority}`}>{priorityLabels[task.priority]}</span>
        {due && (
          <span className={`due-date ${overdue ? 'overdue' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {due}
          </span>
        )}
      </div>

      <div className="task-actions">
        <button
          className="btn-icon"
          onClick={() => onToggleStatus(task)}
          title={task.status === 'done' ? 'إعادة فتح' : 'إكمال'}
          type="button"
        >
          {task.status === 'done' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
        <button className="btn-icon" onClick={() => onEdit(task)} title="تعديل" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button className="btn-icon delete" onClick={() => onDelete(task)} title="حذف" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
