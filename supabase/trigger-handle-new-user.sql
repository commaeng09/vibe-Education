-- 회원가입 시 auth.users에 행이 생기면 public.users에도 같은 id로 프로필을 만듭니다.
-- 이메일 인증을 켜 둔 경우(가입 직후 세션 없음)에도 동작합니다.
-- Supabase → SQL Editor에서 한 번 실행하세요.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  r := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF r NOT IN ('student', 'instructor') THEN
    r := 'student';
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), ''),
      split_part(COALESCE(NEW.email, 'user@local'), '@', 1)
    ),
    r
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
