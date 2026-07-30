-- ============================================
-- lilxu 的工作台 - Supabase 建表 SQL
-- 把这段复制到 Supabase Dashboard → SQL Editor → New query → Run
-- ============================================

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. 年度目标
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  target_date DATE
);
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_goals" ON goals FOR ALL USING (true) WITH CHECK (true);

-- 2. 人生支线
CREATE TABLE IF NOT EXISTS life_quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  category TEXT DEFAULT '',
  progress INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  target_date DATE
);
CREATE TRIGGER life_quests_updated_at BEFORE UPDATE ON life_quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE life_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_life_quests" ON life_quests FOR ALL USING (true) WITH CHECK (true);

-- 3. 读书
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  status TEXT DEFAULT 'want',
  progress INT DEFAULT 0,
  rating INT,
  notes TEXT DEFAULT ''
);
CREATE TRIGGER books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_books" ON books FOR ALL USING (true) WITH CHECK (true);

-- 4. 每日任务
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  due_date DATE DEFAULT CURRENT_DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  project_id UUID
);
CREATE TRIGGER daily_tasks_updated_at BEFORE UPDATE ON daily_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_daily_tasks" ON daily_tasks FOR ALL USING (true) WITH CHECK (true);

-- 5. 临时任务 (Inbox)
CREATE TABLE IF NOT EXISTS inbox_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  processed BOOLEAN DEFAULT false
);
CREATE TRIGGER inbox_tasks_updated_at BEFORE UPDATE ON inbox_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE inbox_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_inbox_tasks" ON inbox_tasks FOR ALL USING (true) WITH CHECK (true);

-- 6. 项目池
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  blockers TEXT DEFAULT '',
  materials TEXT DEFAULT ''
);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- 7. 重要日子
CREATE TABLE IF NOT EXISTS important_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'other',
  recurring BOOLEAN DEFAULT false
);
CREATE TRIGGER important_dates_updated_at BEFORE UPDATE ON important_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_important_dates" ON important_dates FOR ALL USING (true) WITH CHECK (true);
