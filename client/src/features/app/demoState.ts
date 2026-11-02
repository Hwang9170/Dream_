import { getLocalDateKey, type DreamState } from "@/lib/dreamStore";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getLocalDateKey(d);
};

/** Sample journey shown at /app?demo=1. Never persisted. */
export function demoState(): DreamState {
  return {
    version: 3,
    turns: [
      { id: "welcome", role: "assistant", content: "반가워요. 하고 싶은 일을 찾는 건 정답을 고르기보다 단서를 모으는 일에 가까워요. 최근에 시간 가는 줄 모르고 했던 일이 있나요? 아주 사소한 것도 좋아요." },
      { id: "u1", role: "user", content: "주말에 친구 결혼식 영상을 편집해 줬는데 새벽 3시까지 하고 있더라고요." },
      { id: "a1", role: "assistant", content: "새벽 3시까지라니, 정말 빠져 있었네요. 편집하면서 어떤 순간이 가장 좋았어요?" },
      { id: "u2", role: "user", content: "음악 박자에 맞춰 장면이 딱 넘어갈 때요. 친구가 보고 울었을 때도 좋았고요." },
      { id: "a2", role: "assistant", content: "무언가를 만들어서 사람의 마음을 움직였을 때 살아나는 것처럼 들려요. 어릴 때도 비슷한 걸 좋아했나요?" },
    ],
    clues: [
      { id: "c1", date: daysAgo(9), text: "유튜브 브이로그 컷 편집 방식을 한참 분석함", tag: "curious" },
      { id: "c2", date: daysAgo(6), text: "후배 자소서 봐주다가 두 시간이 지남", tag: "flow" },
      { id: "c3", date: daysAgo(3), text: "동네 빵집 사장님이 인스타 사진 고맙다고 하심", tag: "praise" },
      { id: "c4", date: daysAgo(1), text: "다큐멘터리 감독 인터뷰 보고 부러웠다", tag: "envy" },
    ],
    profile: {
      summary: "무언가를 직접 만들어 다른 사람의 마음을 움직일 때 가장 살아나 보여요. 혼자 깊이 몰입하는 시간과, 그 결과를 누군가와 나누는 순간을 둘 다 중요하게 여겨요.",
      themes: ["영상 편집", "이야기 만들기", "작은 가게"],
      values: ["진심", "몰입", "도움"],
      strengths: ["리듬감 있는 편집", "남의 이야기 듣기"],
      updatedAt: new Date().toISOString(),
    },
    dreams: [
      {
        id: "d1",
        title: "사람들의 이야기를 영상으로 담는 사람",
        why: "친구 결혼식 영상을 새벽까지 편집했고, 친구가 울었을 때 가장 좋았다고 했어요.",
        status: "exploring",
        createdAt: new Date().toISOString(),
        current: { text: "동네 가게 한 곳의 30초 소개 영상을 찍고 편집해 보기", minutes: 60, criteria: "30초 영상 1개를 완성해 사장님께 보여 드리기" },
        coachNote: "세 번의 실험 모두 설렘 4점 이상이에요. 이제 다른 사람에게 보여 주는 단계를 맛볼 차례예요.",
      },
      {
        id: "d2",
        title: "누군가의 글과 진로를 함께 다듬어 주는 일",
        why: "후배 자소서를 봐주다 두 시간이 훌쩍 지났다고 기록했어요.",
        status: "exploring",
        createdAt: new Date().toISOString(),
        current: { text: "커리어 코치 한 명의 글 3편 읽고 질문 하나 남기기", minutes: 30, criteria: "질문 1개 남기기" },
      },
      {
        id: "d3",
        title: "작은 가게 SNS 운영해 주기",
        why: "빵집 사장님이 사진을 고마워했어요.",
        status: "dropped",
        createdAt: new Date().toISOString(),
        current: null,
        note: "사진은 좋은데 매일 올리는 운영은 지루했다",
      },
    ],
    logs: [
      { id: "l1", dreamId: "d1", date: daysAgo(12), text: "좋아하는 뮤비 30초를 박자에 맞춰 다시 편집하기", energy: 4, wantMore: "yes" },
      { id: "l2", dreamId: "d3", date: daysAgo(10), text: "빵집 게시물 3개 기획하기", energy: 3, wantMore: "maybe" },
      { id: "l3", dreamId: "d1", date: daysAgo(8), text: "친구 인터뷰 5분 찍어 보기", energy: 5, wantMore: "yes", reflection: "질문할 때 친구 표정이 바뀌는 순간이 좋았다" },
      { id: "l4", dreamId: "d2", date: daysAgo(7), text: "후배 자소서 1개 피드백하기", energy: 4, wantMore: "maybe" },
      { id: "l5", dreamId: "d3", date: daysAgo(5), text: "일주일 동안 매일 게시물 올리기", energy: 2, wantMore: "no", reflection: "의무감이 들었다" },
      { id: "l6", dreamId: "d1", date: daysAgo(2), text: "인터뷰 영상 2분으로 편집하기", energy: 5, wantMore: "yes", reflection: "또 새벽까지 했다" },
      { id: "l7", dreamId: "d2", date: daysAgo(1), text: "진로 고민 글 3개에 댓글 달기", energy: 3 },
    ],
    insight: {
      headline: "사람의 이야기를 '듣고 → 만들어서 → 돌려줄 때' 설렘이 가장 높았어요.",
      patterns: [
        "영상 실험 3번 모두 설렘 4점 이상, 매번 '또 해보고 싶다'고 답했어요.",
        "매일 반복하는 운영 업무는 설렘 2점, '의무감'이라는 메모가 있었어요.",
        "인터뷰처럼 사람과 마주하는 순간이 메모에 반복해서 등장해요.",
      ],
      focus: "사람들의 이야기를 영상으로 담는 사람",
      suggestion: "다음 2주는 영상 후보에 집중해, 결과물을 다른 사람에게 보여 주는 실험을 해 보세요. 반응을 받았을 때도 설렘이 유지된다면 '나의 꿈'으로 정해도 좋아요.",
      createdAt: new Date().toISOString(),
    },
  };
}
