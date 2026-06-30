import { useEffect, useState } from 'react'
import type { Task } from '../lib/supabase'

type Props = {
  open: boolean
  initial: Task | null
  onClose: () => void
  onSave: (data: {
    title: string
    description: string | null
    priority: Task['priority']
    status: Task['status']
    due_date: string | null
  }) => Promise<void>
}

const empty = {
  title: '',
  description: '',
  priority: 'medium' as Task['priority'],
  status: 'todo' as Task['status'],
  due_date: '' as string,
}

export default function TaskForm({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        title: initial?.title ?? '',
        description: initial?.description ?? '',
        priority: initial?.priority ?? 'medium',
        status: initial?.status ?? 'todo',
        due_date: initial?.due_date ? initial.due_date.slice(0, 10) : '',
      })
    }
  }, [open, initial])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    })
    setBusy(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{initial ? 'تعديل المهمة' : 'مهمة جديدة'}</h2>
          <button className="btn-icon" onClick={onClose} type="button" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="t-title">العنوان</label>
              <input
                id="t-title"
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ما الذي تريد إنجازه؟"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="t-desc">الوصف (اختياري)</label>
              <textarea
                id="t-desc"
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="تفاصيل إضافية…"
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="t-priority">الأولوية</label>
                <select
                  id="t-priority"
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="t-status">الحالة</label>
                <select
                  id="t-status"
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
                >
                  <option value="todo">للقيام به</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="done">مكتمل</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="t-due">تاريخ الاستحقاق (اختياري)</label>
              <input
                id="t-due"
                className="input"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              إلغاء
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'جارٍ الحفظ…' : initial ? 'حفظ التغييرات' : 'إضافة المهمة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
