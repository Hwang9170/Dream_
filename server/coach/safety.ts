// Last-line filter applied after the model answers. The prompts already steer
// away from risky suggestions; this catches anything that slips through.

const unsafeGoalPatterns = [/자해|자살|목숨을 끊|사람을 해치|폭발물|불법 약물/i];

const unsafeActionPatterns = [
  /혼자.{0,10}(?:등산|등반|암벽|빙벽|빙하)/i,
  /(?:단식|굶기|금식|하루.{0,8}굶)/i,
  /(?:약물|처방약|약).{0,16}(?:임의로|마음대로|끊기|중단|복용량|늘리기|줄이기)/i,
  /(?:처방|치료).{0,12}(?:중단|대신)/i,
  /(?:자해|자살|스스로.{0,10}(?:해치기|다치기))/i,
  /(?:통증|부상).{0,12}(?:무시|참고|견디기)/i,
  /(?:음주|술).{0,12}운전/i,
];

const riskyMountainLocation = /에베레스트|고산|빙벽|빙하|절벽|암벽|산\s*정상/i;
const riskyMountainAction = /오르|등반|건너|하강|뛰어내리|도전하|시도하/i;
const safeMountainContext = /계단|실내|안전\s*(?:교육|강습|수칙)|전문가|가이드|정보|자료|상담|준비\s*목록/i;

export function isUnsafeAction(action: string): boolean {
  const unsafeMountainAttempt =
    riskyMountainLocation.test(action) && riskyMountainAction.test(action) && !safeMountainContext.test(action);
  return unsafeMountainAttempt || unsafeActionPatterns.some(pattern => pattern.test(action));
}

export function isUnsafeGoal(goal: string): boolean {
  return unsafeGoalPatterns.some(pattern => pattern.test(goal));
}

export const SAFETY_MESSAGE =
  "이 목표에는 안전이나 전문적인 안내가 먼저 필요해 보여요. 위험한 행동은 제안하지 않을게요. 전문가와 안전한 방법을 상의한 뒤, 작은 첫걸음을 다시 정리해 봐요. 마음이 많이 힘들다면 자살예방상담전화 109(24시간)에 언제든 이야기해 주세요.";
