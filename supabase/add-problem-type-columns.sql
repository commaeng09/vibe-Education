-- 기존 프로젝트에 문제 유형/시험지 payload 컬럼 추가
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS problem_type TEXT NOT NULL
    CHECK (problem_type IN ('coding_single', 'mcq_single', 'exam'))
    DEFAULT 'coding_single',
  ADD COLUMN IF NOT EXISTS question_payload JSONB DEFAULT '{}'::jsonb;
