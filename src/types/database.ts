export type UserRole = "student" | "instructor";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  solution_code: string;
  test_cases: TestCase[];
  created_by: string;
  created_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  explanation: string;
  result: "pending" | "correct" | "incorrect";
  instructor_comment?: string | null;
  instructor_comment_by?: string | null;
  instructor_commented_at?: string | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  submission_id: string;
  error_type: string;
  thinking_pattern: string;
  feedback: string;
  score: number;
  created_at: string;
}

export interface ProblemInsight {
  id: string;
  problem_id: string;
  common_errors: string[];
  confusion_points: string[];
  difficulty_score: number;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "created_at">;
        Update: Partial<Omit<User, "id">>;
      };
      problems: {
        Row: Problem;
        Insert: Omit<Problem, "id" | "created_at">;
        Update: Partial<Omit<Problem, "id">>;
      };
      submissions: {
        Row: Submission;
        Insert: Omit<Submission, "id" | "created_at">;
        Update: Partial<Omit<Submission, "id">>;
      };
      analysis: {
        Row: Analysis;
        Insert: Omit<Analysis, "id" | "created_at">;
        Update: Partial<Omit<Analysis, "id">>;
      };
      problem_insights: {
        Row: ProblemInsight;
        Insert: Omit<ProblemInsight, "id" | "updated_at">;
        Update: Partial<Omit<ProblemInsight, "id">>;
      };
    };
  };
}
