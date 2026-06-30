import { useCallback, useEffect, useState } from 'react'
import { supabase, type Task } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'

type Filter = 'all' | 'todo' | 'in_progress' | 'done'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const flash = (msg: string, error?: boolean) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 2600)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) {
      flash('تعذّر تحميل المهام', true)
      return
    }
    setTasks(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setFormOpen(true)
  }

  async function save(data: {
    title: string
    description: string | null
    priority: Task['priority']
    status: Task['status']
    due_date: string | null
  }) {
    if (editing) {
      const { error } = await supabase.from('tasks').update(data).eq('id', editing.id)
      if (error) return flash('تعذّر تحديث المهمة', true)
      flash('تم تحديث المهمة')
    } else {
      const { error } = await supabase.from('tasks').insert(data)
      if (error) return flash('تعذّر إضافة المهمة', true)
      flash('تمت إضافة المهمة')
    }
    setFormOpen(false)
    setEditing(null)
    load()
  }

  async function remove(task: Task) {
    if (!confirm(`حذف المهمة "${task.title}"؟`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) return flash('تعذّر الحذف', true)
    flash('تم حذف المهمة')
    setTasks((t) => t.filter((x) => x.id !== task.id))
  }

  async function toggleStatus(task: Task) {
    const next: Task['status'] = task.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    if (error) return flash('تعذّر التحديث', true)
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status: next } : x)))
  }

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  const initials = (user?.email ?? '?')[0].toUpperCase()

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          TaskFlow
        </div>
        <div className="header-actions">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <strong>{user?.email}</strong>
          </div>
          <button className="btn btn-ghost" onClick={signOut} type="button">
            خروج
          </button>
        </div>
      </header>

      <main className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">مهامي</h1>
            <p className="page-sub">نظّم يومك وتابع تقدّك</p>
          </div>
          <button className="btn btn-primary" onClick={openNew} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            مهمة جديدة
          </button>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)', color: '#7dd3fc' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{counts.all}</div>
              <div className="stat-label">إجمالي المهام</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{counts.todo}</div>
              <div className="stat-label">للقيام به</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{counts.in_progress}</div>
              <div className="stat-label">قيد التنفيذ</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div className="stat-value">{counts.done}</div>
              <div className="stat-label">مكتمل</div>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="ابحث في المهام…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            {(['all', 'todo', 'in_progress', 'done'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
                type="button"
              >
                {f === 'all' ? 'الكل' : f === 'todo' ? 'للقيام به' : f === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              جارٍ التحميل…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
              </svg>
            </div>
            <h3>{search || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد مهام بعد'}</h3>
            <p>{search || filter !== 'all' ? 'جرّب تعديل البحث أو الفلتر' : 'ابدأ بإضافة مهمتك الأولى'}</p>
            {!search && filter === 'all' && (
              <button className="btn btn-primary" onClick={openNew} type="button">
                إضافة مهمة
              </button>
            )}
          </div>
        ) : (
          <div className="task-grid">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={openEdit}
                onDelete={remove}
                onToggleStatus={toggleStatus}
              />
            ))}
          </div>
        )}
      </main>

      <TaskForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSave={save} />

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
