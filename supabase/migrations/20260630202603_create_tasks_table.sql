/*
# Create tasks table (multi-user, owner-scoped)

1. New Tables
- `tasks`
  - `id` (uuid, primary key)
  - `title` (text, not null) — عنوان المهمة
  - `description` (text, nullable) — وصف اختياري للمهمة
  - `priority` (text, not null, default 'medium') — الأولوية: low / medium / high
  - `status` (text, not null, default 'todo') — الحالة: todo / in_progress / done
  - `due_date` (date, nullable) — تاريخ الاستحقاق
  - `user_id` (uuid, not null, defaults to auth.uid()) — مالك المهمة
  - `created_at` (timestamptz, default now())

2. Constraints
- CHECK on priority to restrict to allowed values.
- CHECK on status to restrict to allowed values.

3. Indexes
- `idx_tasks_user_id` on `user_id` for fast per-user queries.
- `idx_tasks_created_at` on `created_at` for ordering.

4. Security
- Enable RLS on `tasks`.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- 4 separate policies (select/insert/update/delete), scoped TO authenticated.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy the WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date date,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
