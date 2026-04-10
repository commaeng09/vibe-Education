import type { User, Problem, Submission, Analysis } from "@/types/database";

export const DEMO_USERS: Record<string, User> = {
  instructor: {
    id: "demo-instructor-001",
    email: "instructor@demo.com",
    name: "김교수",
    role: "instructor",
    created_at: new Date().toISOString(),
  },
  student: {
    id: "demo-student-001",
    email: "student@demo.com",
    name: "이학생",
    role: "student",
    created_at: new Date().toISOString(),
  },
};

export const DEMO_PROBLEMS: Problem[] = [
  {
    id: "demo-problem-001",
    title: "두 수의 합 구하기",
    description: `## 문제 설명
두 정수 a, b가 주어졌을 때, a + b를 반환하는 함수를 작성하세요.

## 입력 형식
- 두 정수 a, b (-1000 ≤ a, b ≤ 1000)

## 출력 형식
- a + b의 결과를 출력

## 예시
입력: 3 5
출력: 8

## 제약 조건
- 시간 제한: 1초
- 메모리 제한: 128MB`,
    difficulty: "easy",
    solution_code: `def solution(a, b):
    return a + b

a, b = map(int, input().split())
print(solution(a, b))`,
    test_cases: [
      { input: "3 5", expected_output: "8" },
      { input: "-1 1", expected_output: "0" },
      { input: "100 200", expected_output: "300" },
    ],
    created_by: "demo-instructor-001",
    created_at: "2026-04-01T09:00:00Z",
  },
  {
    id: "demo-problem-002",
    title: "피보나치 수열",
    description: `## 문제 설명
n번째 피보나치 수를 구하는 함수를 작성하세요.
피보나치 수열: 0, 1, 1, 2, 3, 5, 8, 13, 21, ...

## 입력 형식
- 정수 n (0 ≤ n ≤ 30)

## 출력 형식
- n번째 피보나치 수

## 예시
입력: 6
출력: 8

## 제약 조건
- 재귀 또는 반복문 사용 가능`,
    difficulty: "medium",
    solution_code: `def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

n = int(input())
print(fibonacci(n))`,
    test_cases: [
      { input: "0", expected_output: "0" },
      { input: "6", expected_output: "8" },
      { input: "10", expected_output: "55" },
    ],
    created_by: "demo-instructor-001",
    created_at: "2026-04-02T09:00:00Z",
  },
  {
    id: "demo-problem-003",
    title: "문자열 뒤집기",
    description: `## 문제 설명
주어진 문자열을 뒤집어서 반환하는 함수를 작성하세요.
단, 내장 reverse 함수를 사용하지 마세요.

## 입력 형식
- 문자열 s (1 ≤ len(s) ≤ 1000)

## 출력 형식
- 뒤집어진 문자열

## 예시
입력: hello
출력: olleh

## 제약 조건
- 내장 reverse(), [::-1] 사용 금지`,
    difficulty: "easy",
    solution_code: `def reverse_string(s):
    result = ""
    for char in s:
        result = char + result
    return result

s = input()
print(reverse_string(s))`,
    test_cases: [
      { input: "hello", expected_output: "olleh" },
      { input: "abc", expected_output: "cba" },
      { input: "a", expected_output: "a" },
    ],
    created_by: "demo-instructor-001",
    created_at: "2026-04-03T09:00:00Z",
  },
  {
    id: "demo-problem-004",
    title: "이진 탐색 구현",
    description: `## 문제 설명
정렬된 배열에서 특정 값의 인덱스를 찾는 이진 탐색 함수를 구현하세요.
값이 없으면 -1을 반환하세요.

## 입력 형식
- 첫째 줄: 배열의 크기 n과 찾을 값 target
- 둘째 줄: 정렬된 배열 원소들

## 출력 형식
- target의 인덱스 (없으면 -1)

## 예시
입력:
5 3
1 2 3 4 5
출력: 2

## 제약 조건
- 반드시 이진 탐색으로 구현`,
    difficulty: "hard",
    solution_code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

n, target = map(int, input().split())
arr = list(map(int, input().split()))
print(binary_search(arr, target))`,
    test_cases: [
      { input: "5 3\n1 2 3 4 5", expected_output: "2" },
      { input: "5 6\n1 2 3 4 5", expected_output: "-1" },
      { input: "1 1\n1", expected_output: "0" },
    ],
    created_by: "demo-instructor-001",
    created_at: "2026-04-04T09:00:00Z",
  },
];

export const DEMO_SUBMISSIONS: (Submission & { problems?: { title: string } })[] = [
  {
    id: "demo-sub-001",
    user_id: "demo-student-001",
    problem_id: "demo-problem-001",
    code: `def solution(a, b):
    return a + b

a, b = map(int, input().split())
print(solution(a, b))`,
    explanation: "두 수를 더해서 반환하면 됩니다.",
    result: "correct",
    created_at: "2026-04-05T10:00:00Z",
    problems: { title: "두 수의 합 구하기" },
  },
  {
    id: "demo-sub-002",
    user_id: "demo-student-001",
    problem_id: "demo-problem-002",
    code: `def fibonacci(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n-1) + fibonacci(n-2)

n = int(input())
print(fibonacci(n))`,
    explanation: "재귀로 피보나치를 구현했습니다.",
    result: "incorrect",
    created_at: "2026-04-06T10:00:00Z",
    problems: { title: "피보나치 수열" },
  },
];

export const DEMO_ANALYSIS: Analysis = {
  id: "demo-analysis-001",
  submission_id: "demo-sub-002",
  error_type: "논리 오류",
  thinking_pattern:
    "학생은 재귀적 사고를 통해 피보나치 수열의 정의를 올바르게 이해하고 있습니다. 그러나 시간 복잡도에 대한 고려가 부족합니다. 재귀 호출이 중복되어 n이 커질수록 기하급수적으로 느려지는 문제가 있습니다. 메모이제이션이나 반복문을 통한 최적화가 필요합니다.",
  feedback:
    "코드가 올바르게 동작하지만 효율성에 문제가 있습니다.\n\n1. **중복 계산**: fibonacci(5)를 호출하면 fibonacci(3)이 2번, fibonacci(2)가 3번 호출됩니다.\n2. **시간 복잡도**: O(2^n)으로 n=30만 되어도 매우 느려집니다.\n3. **개선 방법**: 반복문을 사용하거나, 메모이제이션(캐싱)을 적용하세요.\n\n```python\n# 개선된 버전 (반복문)\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```",
  score: 55,
  created_at: "2026-04-06T10:01:00Z",
};

export function isDemo(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}
