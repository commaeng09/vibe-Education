-- 기존 프로젝트에 강사 코멘트 컬럼을 추가할 때 1회 실행
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS instructor_comment TEXT,
  ADD COLUMN IF NOT EXISTS instructor_comment_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_commented_at TIMESTAMPTZ;
