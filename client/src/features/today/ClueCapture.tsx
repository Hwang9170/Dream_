import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { clueTags, type ClueTag } from "@/lib/dreamStore";
import { useDream } from "@/features/app/DreamContext";

/** Quick journal for "moments that moved me" — raw material for discovery. */
export default function ClueCapture() {
  const { addClue, state } = useDream();
  const [tag, setTag] = useState<ClueTag>("flow");
  const [text, setText] = useState("");
  const active = clueTags.find(t => t.value === tag)!;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    addClue(text, tag);
    setText("");
    toast.success("단서를 모았어요", { description: `지금까지 ${state.clues.length + 1}개 · 꿈 후보를 찾을 때 함께 쓰여요` });
  };

  return (
    <section className="clue-capture" aria-labelledby="clue-title">
      <div className="clue-head">
        <h2 id="clue-title">오늘 마음이 움직인 순간</h2>
        <span>하고 싶은 일의 단서는 일상에 숨어 있어요</span>
      </div>
      <div className="clue-tags" role="radiogroup" aria-label="어떤 순간이었나요">
        {clueTags.map(t => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={tag === t.value}
            className={tag === t.value ? "selected" : ""}
            onClick={() => setTag(t.value)}
          >
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
      <form className="clue-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="clue-input">{active.prompt}</label>
        <input id="clue-input" value={text} maxLength={200} onChange={e => setText(e.target.value)} placeholder={active.prompt} />
        <button className="send-button" type="submit" disabled={!text.trim()} aria-label="단서 저장"><Plus size={18} /></button>
      </form>
    </section>
  );
}
