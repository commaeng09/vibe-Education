# VibeEducation - AI 기반 코딩 교육 플랫폼

AI가 학생의 코드와 사고 과정을 분석하는 차세대 코딩 교육 플랫폼입니다.

## 핵심 기능

- **교강사**: 문제 생성, AI 자동 문제 생성, 학생 제출 관리
- **학생**: 문제 풀기, 코드 작성 (Monaco Editor), 풀이 설명 입력
- **AI 분석**: 문법/논리 오류 분석, 사고 패턴 분석, 맞춤형 피드백
- **인사이트**: 문제별 반복 오류 패턴, 학생 혼동 포인트 추출

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + Auth) |
| Code Editor | Monaco Editor |
| AI | OpenAI API (GPT-4o-mini) |
| Deployment | Vercel |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 수정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행합니다.
3. Authentication > Providers에서 Email 인증을 활성화합니다.
4. `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 프로젝트 설정에서 복사합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인하세요.

## 프로젝트 구조

```
src/
├── app/
│   ├── (protected)/           # 인증 필요 페이지
│   │   ├── dashboard/         # 대시보드
│   │   ├── problems/          # 문제 리스트 & 상세
│   │   ├── instructor/create/ # 문제 생성
│   │   └── analysis/          # AI 분석 결과
│   ├── api/
│   │   ├── problems/          # 문제 CRUD API
│   │   ├── submissions/       # 제출 + AI 분석 API
│   │   ├── analysis/          # 분석 조회 API
│   │   └── ai/
│   │       ├── generate-problem/  # AI 문제 생성
│   │       └── analyze/           # 문제 인사이트 생성
│   ├── auth/callback/         # OAuth 콜백
│   ├── layout.tsx
│   └── page.tsx               # 로그인/회원가입
├── components/
│   ├── ui/                    # 재사용 가능한 UI 컴포넌트
│   └── code-editor.tsx        # Monaco Editor 래퍼
├── lib/
│   ├── supabase-server.ts     # 서버용 Supabase 클라이언트
│   ├── supabase-browser.ts    # 브라우저용 Supabase 클라이언트
│   ├── supabase-middleware.ts # 미들웨어용 Supabase 클라이언트
│   └── openai.ts              # OpenAI 설정 및 프롬프트
├── types/
│   └── database.ts            # TypeScript 타입 정의
└── middleware.ts               # 인증 미들웨어
```

## 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 로그인/회원가입 |
| `/dashboard` | 역할 기반 대시보드 |
| `/problems` | 문제 목록 |
| `/problems/[id]` | 문제 상세 + 코드 에디터 |
| `/instructor/create` | 문제 생성 (AI 생성 포함) |
| `/analysis/[submissionId]` | AI 분석 결과 |

## Vercel 배포

```bash
npm run build
```

Vercel에 환경 변수를 설정한 후 배포하세요.

## 라이선스

MIT
