-- VibeEducation Database Schema
-- Supabase SQL Editor에서 실행하세요

-- 1. Users 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor')) DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Problems 테이블
CREATE TABLE IF NOT EXISTS public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  solution_code TEXT DEFAULT '',
  test_cases JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Submissions 테이블
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  result TEXT NOT NULL CHECK (result IN ('pending', 'correct', 'incorrect')) DEFAULT 'pending',
  instructor_comment TEXT,
  instructor_comment_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  instructor_commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Analysis 테이블
CREATE TABLE IF NOT EXISTS public.analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  error_type TEXT DEFAULT '없음',
  thinking_pattern TEXT DEFAULT '',
  feedback TEXT DEFAULT '',
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Problem Insights 테이블
CREATE TABLE IF NOT EXISTS public.problem_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE UNIQUE,
  common_errors JSONB DEFAULT '[]'::jsonb,
  confusion_points JSONB DEFAULT '[]'::jsonb,
  difficulty_score INTEGER DEFAULT 50 CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_problems_created_by ON public.problems(created_by);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON public.submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_analysis_submission_id ON public.analysis(submission_id);
CREATE INDEX IF NOT EXISTS idx_problem_insights_problem_id ON public.problem_insights(problem_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_insights ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Users
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS 정책: Problems
CREATE POLICY "Anyone can view problems"
  ON public.problems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instructors can create problems"
  ON public.problems FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

CREATE POLICY "Instructors can update own problems"
  ON public.problems FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Instructors can delete own problems"
  ON public.problems FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS 정책: Submissions
CREATE POLICY "Users can view own submissions"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

CREATE POLICY "Users can create submissions"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update submissions"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (true);

-- RLS 정책: Analysis
CREATE POLICY "Users can view analysis of own submissions"
  ON public.analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE submissions.id = analysis.submission_id
      AND (
        submissions.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'instructor'
        )
      )
    )
  );

CREATE POLICY "System can insert analysis"
  ON public.analysis FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS 정책: Problem Insights
CREATE POLICY "Instructors can view insights"
  ON public.problem_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage insights"
  ON public.problem_insights FOR ALL
  TO authenticated
  USING (true);

-- Foreign key 이름 지정 (Supabase 조인용)
ALTER TABLE public.problems
  DROP CONSTRAINT IF EXISTS problems_created_by_fkey;

ALTER TABLE public.problems
  ADD CONSTRAINT problems_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
