# 첫걸음 — 하고 싶은 일, 해 보면서 찾기

"뭘 하고 싶은지 모르겠다"는 사람을 위한 한국어 AI 꿈 탐색 코치.
대화와 일상 기록으로 **단서**를 모으고 → **꿈 후보**를 작게 **실험**하고 → 실험마다 남긴 **설렘**으로 무엇이 진짜 하고 싶은 일인지 **추적**합니다.

- `/` — 서비스 소개 랜딩 페이지
- `/app` — 앱 (오늘 · 찾기 · 꿈 지도 · 기록 탭)
- `/app?demo=1` — 예시 데이터로 둘러보기 (저장되지 않음)

## 기능

- **찾기**: 몰입·호기심·부러움·강점·가치 렌즈로 묻는 스트리밍 탐색 대화, 단서 진행도
- **단서 노트**: "시간 가는 줄 몰랐다 / 부러웠다 / 궁금했다…" 순간을 빠르게 기록 (대화·분석에 함께 사용)
- **꿈 후보 찾기**: 대화+단서 → 나의 모습(관심·가치·강점) + 결이 다른 후보 3개와 각 첫 실험
- **오늘**: 후보별 현재 실험, 완료 시 설렘 1~5 · 또 하고 싶은지 · 메모 기록, 다음 실험 / 더 작게 / 다른 방식으로
- **꿈 지도**: 후보별 설렘 지수(0~100)·추세 스파크라인, 나의 꿈으로 정하기 · 잠시 쉬기 · 내려놓기(이유 기록)
- **AI 패턴 분석**: 모든 실험 기록과 단서를 근거로 "무엇을 할 때 살아나는지"와 집중할 후보 제안
- **기록**: 탐색 달력(6주), 연속 기록, 실험·단서 타임라인, 백업/불러오기
- 이전 버전(단일 목표 여정) 기록은 '나의 꿈'으로 자동 이전
- 다크 모드, 모바일 하단 탭바, 홈 화면에 추가(PWA 매니페스트)
- 안전 필터(위험 행동 차단, 위기 상담 안내), IP별 요청 제한

## 구조

```
client/src/pages/Landing.tsx        소개 랜딩
client/src/pages/Home.tsx           앱 셸 (탭 내비게이션)
client/src/features/app/            DreamContext(상태·액션·AI 호출), 예시 데이터
client/src/features/{today,discover,dreams,records}/  탭별 화면
client/src/lib/dreamStore.ts        localStorage 저장/백업 (v1 → v3 자동 이전)
shared/dreamModel.ts                데이터 모델, 설렘 지수·연속 기록 계산 (테스트됨)
server/app.ts                       Express API (로컬 서버와 Vercel 함수가 공유)
server/coach/ai.ts                  Claude 호출 (탐색 대화, 후보·실험·분석 구조화 출력)
server/coach/chatStream.ts          POST /api/coach/chat (텍스트 스트림)
server/coachRouter.ts               tRPC: coach.discover, coach.experiment, coach.insight
server/coach/safety.ts              안전 필터
server/coach/rateLimit.ts           IP별 요청 제한
scripts/build-vercel.mjs            Vercel Build Output 생성
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
