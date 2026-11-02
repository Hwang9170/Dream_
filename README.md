# 첫걸음 — 목표 발견 & 실행 코치

AI와 대화하며 하고 싶은 일을 찾고, 오늘 바로 할 수 있는 작은 행동으로 바꿔 주는 한국어 웹 서비스.

- `/` — 서비스 소개 랜딩 페이지
- `/app` — 앱 (AI 대화 · 첫걸음 카드 · 실천 기록)

## 기능

- Claude 기반 실시간(스트리밍) 목표 탐색 대화, 답변 중단
- 대화 → 목표 · 오늘의 첫 행동 · 완료 기준 정리 (구조화 출력, 직접 수정 가능)
- 완료 기록 + 느낌(쉬웠어요/적당했어요/어려웠어요) + 한 줄 회고
- 회고를 반영한 **다음 걸음** 제안, 버거울 때 **더 작게 쪼개기**
- 최근 6주 실천 달력, 연속 실천일
- 기록 백업(JSON 내보내기/불러오기), 로그인 없이 브라우저에 저장
- 다크 모드, 모바일 최적화, 홈 화면에 추가(PWA 매니페스트)
- 안전 필터(위험 행동 차단, 위기 상담 안내), IP별 요청 제한

## 구조

```
client/src/pages/Landing.tsx      소개 랜딩
client/src/pages/Home.tsx         앱 화면
client/src/features/              PlanCard · ProgressCard · PracticeCalendar · HeroArt
client/src/lib/coachStorage.ts    localStorage 모델(v1 → v2 자동 이전), 백업
client/src/lib/streamChat.ts      스트리밍 대화 클라이언트
server/app.ts                     Express API (로컬 서버와 Vercel 함수가 공유)
server/coach/ai.ts                Claude 호출 (스트리밍 대화, 구조화 출력)
server/coach/chatStream.ts        POST /api/coach/chat (텍스트 스트림)
server/coachRouter.ts             tRPC: coach.plan, coach.nextStep
server/coach/safety.ts            안전 필터
server/coach/rateLimit.ts         IP별 요청 제한
scripts/build-vercel.mjs          Vercel Build Output 생성
```

## 실행

```bash
pnpm install
cp .env.example .env        # ANTHROPIC_API_KEY 입력
pnpm dev                    # http://localhost:3000 (macOS/Linux/Git Bash)
pnpm test && pnpm check
```

## 배포 (Vercel)

`vercel.json`이 `pnpm build:vercel`을 실행해 정적 파일 + `/api/*` 서버리스 함수를 만듭니다.
Vercel 프로젝트 환경 변수에 `ANTHROPIC_API_KEY`를 설정하세요. 선택: `ANTHROPIC_MODEL`(기본 `claude-opus-5-5`), `COACH_RATE_LIMIT`(기본 10분당 60회).
