import { Mountain } from "lucide-react";

/** Line-drawn mountains with a dotted path from today's step to the summit. */
export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-sun" />
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <svg className="mountain-lines" viewBox="0 0 540 260" fill="none">
        <path className="m-back" d="M40 236 L170 96 L232 160 L318 58 L420 168 L470 128 L520 236 Z" />
        <path className="m-front" d="M10 240 L120 150 L190 206 L290 112 L380 196 L430 170 L530 240 Z" />
        <path className="m-snow" d="M318 58 L298 82 L312 78 L322 90 L334 76 L340 82 Z" />
        <path className="m-trail" d="M92 236 C 150 222, 170 200, 214 196 S 268 160, 252 140 S 288 104, 318 70" />
        <circle className="m-dot start" cx="92" cy="236" r="6" />
        <circle className="m-dot" cx="214" cy="196" r="3.5" />
        <circle className="m-dot" cx="262" cy="144" r="3.5" />
        <circle className="m-dot goal" cx="318" cy="64" r="5" />
      </svg>
      <div className="art-caption">
        <Mountain size={14} /> 큰 꿈도, 한 걸음부터
      </div>
      <div className="art-pin">
        <span>오늘의 시작</span>
        <i />
      </div>
    </div>
  );
}
