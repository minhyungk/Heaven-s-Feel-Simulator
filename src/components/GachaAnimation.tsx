import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Servant } from "../data/types";
import { CLASS_COLORS } from "../data/types";
import MagicCircle from "./MagicCircle";

interface Props {
  servant: Servant;
  isExtraInvasion?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const STAGES = ["blackout", "circle", "card", "reveal", "info"] as const;
type GachaStage = (typeof STAGES)[number];

export default function GachaAnimation({ servant, isExtraInvasion, onComplete, onSkip }: Props) {
  const [stage, setStage] = useState<GachaStage>("blackout");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const advance = useCallback(() => {
    clearTimers();
    setStage((prev) => {
      const idx = STAGES.indexOf(prev);
      if (idx < STAGES.length - 1) return STAGES[idx + 1];
      onComplete();
      return prev;
    });
  }, [onComplete, clearTimers]);

  // Auto-progress timers
  useEffect(() => {
    timersRef.current = [
      setTimeout(() => setStage("circle"), 800),
      setTimeout(() => setStage("card"), 2500),
      setTimeout(() => setStage("reveal"), 4000),
      setTimeout(() => setStage("info"), 5500),
    ];
    return clearTimers;
  }, [clearTimers]);

  // Enter key to skip entirely
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSkip]);

  const classColor = CLASS_COLORS[servant.class];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={advance}
    >
      {/* Blackout */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage === "blackout" ? 1 : 0.85 }}
        transition={{ duration: 0.5 }}
      />

      {/* Skip */}
      <button
        onClick={(e) => { e.stopPropagation(); onSkip(); }}
        className="absolute top-6 right-6 z-50 text-gray-500 hover:text-gray-300 text-sm px-3 py-1 border border-gray-700 rounded cursor-pointer"
      >
        SKIP →
      </button>

      {/* Extra invasion flash */}
      {isExtraInvasion && (stage === "circle" || stage === "card") && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
          transition={{ duration: 2, delay: 0.5 }}
          style={{ background: "radial-gradient(circle, rgba(147,51,234,0.4) 0%, rgba(255,74,74,0.2) 50%, transparent 80%)" }}
        />
      )}

      {/* Corruption text */}
      {isExtraInvasion && stage === "circle" && (
        <motion.p
          className="absolute top-1/4 z-30 text-sm font-bold tracking-[0.3em] uppercase pointer-events-none"
          style={{ color: "#9333ea", fontFamily: "var(--font-serif)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1, 0] }}
          transition={{ duration: 2.5, delay: 0.3 }}
        >
          ― 성배 오류 ―
        </motion.p>
      )}

      {/* Magic circle */}
      <AnimatePresence>
        {(stage === "circle" || stage === "card") && <MagicCircle corrupted={isExtraInvasion} />}
      </AnimatePresence>

      {/* Card */}
      <AnimatePresence>
        {(stage === "card" || stage === "reveal" || stage === "info") && (
          <motion.div
            className="relative z-10"
            initial={{ y: 300, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
          >
            <div className="card-flip w-[280px] h-[400px] md:w-[320px] md:h-[460px]">
              <div className={`card-flip-inner ${stage !== "card" ? "flipped" : ""}`}>
                {/* Card back */}
                <div
                  className="card-front flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, #1a1a2e, #16213e)`,
                    border: `2px solid ${classColor}`,
                    boxShadow: `0 0 30px ${classColor}40`,
                  }}
                >
                  <div className="text-center">
                    <img src="/7999.png" alt="Holy Grail" className="w-24 h-24 mx-auto mb-4 animate-pulse-glow object-contain" />
                    <div className="text-sm tracking-[0.3em] uppercase" style={{ color: classColor, fontFamily: "var(--font-serif)" }}>
                      Servant
                    </div>
                  </div>
                </div>

                {/* Card front */}
                <div
                  className="card-back flex flex-col items-center justify-center p-6 overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${classColor}22, #0a0a1a 60%)`,
                    border: `2px solid ${classColor}`,
                    boxShadow: `0 0 40px ${classColor}40`,
                  }}
                >
                  {/* Class */}
                  <div
                    className="w-full text-center py-2 mb-3 text-xs tracking-[0.2em] uppercase font-bold"
                    style={{ color: classColor, borderBottom: `1px solid ${classColor}44` }}
                  >
                    {servant.class}
                  </div>

                  {/* Face image */}
                  {servant.imageUrl && (
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2" style={{ borderColor: classColor }}>
                      <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Name */}
                  <AnimatePresence>
                    {(stage === "reveal" || stage === "info") && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                      >
                        <h2 className="text-2xl font-bold text-white mb-1">
                          {servant.name}
                        </h2>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Noble Phantasm with ruby */}
                  <AnimatePresence>
                    {stage === "info" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-4 text-center"
                      >
                        <p className="text-xs text-gray-500 mb-1">보구</p>
                        <ruby className="text-sm text-gold font-bold">
                          {servant.noblePhantasm.name}
                          <rp>(</rp><rt className="text-[10px] text-gray-400">{servant.noblePhantasm.ruby}</rt><rp>)</rp>
                        </ruby>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue prompt */}
      {stage === "info" && (
        <motion.p
          className="absolute bottom-12 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          클릭하여 전쟁 대시보드로 →
        </motion.p>
      )}
    </div>
  );
}
