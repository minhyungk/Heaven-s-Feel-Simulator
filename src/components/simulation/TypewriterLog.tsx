import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { NarrativeLine, NarrativeEffect } from "../../engine/narrativeFormatter";

interface Props {
  lines: NarrativeLine[];
  onComplete?: () => void;
}

const SPEED_MAP = { fast: 8, normal: 25, slow: 60 };

const EFFECT_CLASSES: Record<NarrativeEffect, string> = {
  normal: "text-gray-300",
  np_glow: "text-np-glow",
  critical: "text-critical",
  stealth_fade: "text-stealth-fade",
  elimination: "text-elimination",
  draw: "text-gray-500 italic",
  servant_dialogue: "text-servant-dialogue",
};

export default function TypewriterLog({ lines, onComplete }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<"delay" | "typing" | "done">("delay");
  const [finishedLines, setFinishedLines] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const currentLine = lineIdx < lines.length ? lines[lineIdx] : null;

  // 라인 스킵 (클릭)
  const skipLine = useCallback(() => {
    if (!currentLine) return;
    if (phase === "delay") {
      setPhase("typing");
      return;
    }
    if (phase === "typing") {
      // 현재 라인 즉시 완성 → 다음 라인으로
      setFinishedLines(prev => [...prev, currentLine.text]);
      setCharIdx(0);
      setPhase("delay");
      setLineIdx(prev => prev + 1);
    }
  }, [currentLine, phase]);

  // 딜레이 → 타이핑 전환
  useEffect(() => {
    if (phase !== "delay" || !currentLine) return;
    const timer = setTimeout(() => setPhase("typing"), currentLine.delay);
    return () => clearTimeout(timer);
  }, [phase, currentLine, lineIdx]);

  // 한 글자씩 출력
  useEffect(() => {
    if (phase !== "typing" || !currentLine) return;

    if (charIdx >= currentLine.text.length) {
      // 라인 완료 → 다음으로
      setFinishedLines(prev => [...prev, currentLine.text]);
      setCharIdx(0);
      setPhase("delay");
      setLineIdx(prev => prev + 1);
      return;
    }

    const speed = SPEED_MAP[currentLine.speed];
    const timer = setTimeout(() => setCharIdx(prev => prev + 1), speed);
    return () => clearTimeout(timer);
  }, [phase, currentLine, charIdx, lineIdx]);

  // 전체 완료 감지
  useEffect(() => {
    if (lineIdx >= lines.length && phase === "delay") {
      setPhase("done");
      onCompleteRef.current?.();
    }
  }, [lineIdx, lines.length, phase]);

  // 자동 스크롤
  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [finishedLines.length, charIdx]);

  const displayedText = currentLine ? currentLine.text.slice(0, charIdx) : "";

  return (
    <div
      ref={containerRef}
      onClick={skipLine}
      className="w-full max-h-64 overflow-y-auto cursor-pointer select-none p-3 rounded-lg space-y-1"
      style={{ background: "rgba(0,0,0,0.25)" }}
    >
      {/* 완료된 라인들 */}
      {finishedLines.map((text, i) => {
        const line = lines[i];
        return (
          <motion.p
            key={`done-${i}`}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            className={`text-sm leading-relaxed ${line ? EFFECT_CLASSES[line.effect] : "text-gray-300"}`}
          >
            {text}
          </motion.p>
        );
      })}

      {/* 현재 타이핑 중인 라인 */}
      {currentLine && phase === "typing" && displayedText && (
        <p className={`text-sm leading-relaxed ${EFFECT_CLASSES[currentLine.effect]}`}>
          {displayedText}
          <span className="animate-pulse opacity-70">|</span>
        </p>
      )}

      {/* 완료 표시 */}
      {phase === "done" && (
        <p className="text-[10px] text-gray-600 mt-2 text-center">
          ───
        </p>
      )}
    </div>
  );
}
