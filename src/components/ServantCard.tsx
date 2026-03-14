import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Servant } from "../data/types";
import { CLASS_COLORS } from "../data/types";

interface Props {
  servant: Servant;
  isPlayer?: boolean;
  index?: number;
}

const STAT_LABELS = [
  { key: "strength", label: "근력" },
  { key: "endurance", label: "내구" },
  { key: "agility", label: "민첩" },
  { key: "mana", label: "마력" },
  { key: "luck", label: "행운" },
  { key: "np", label: "보구" },
] as const;

export default function ServantCard({ servant, isPlayer, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const classColor = CLASS_COLORS[servant.class];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="w-full max-w-xl 2xl:max-w-2xl mx-auto"
    >
      {/* Main card */}
      <motion.div
        whileHover={{ y: -3 }}
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer rounded-xl p-5 2xl:p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${classColor}15, #0a0a1a 70%)`,
          border: `1px solid ${isPlayer ? "#ffd700" : classColor + "44"}`,
          boxShadow: isPlayer ? "0 0 20px rgba(255,215,0,0.15)" : undefined,
        }}
      >
        <div className="flex items-center gap-4 2xl:gap-5">
          {/* Face image */}
          <div
            className="w-16 h-16 2xl:w-20 2xl:h-20 rounded-full overflow-hidden shrink-0 border-2"
            style={{ borderColor: isPlayer ? "#ffd700" : classColor }}
          >
            {servant.imageUrl ? (
              <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: `${classColor}20` }}>⚔</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[0.65rem] 2xl:text-xs tracking-[0.15em] uppercase font-bold mb-1" style={{ color: classColor }}>
              {servant.class}
            </div>
            <h3 className="text-base 2xl:text-lg font-bold text-white truncate">{servant.name}</h3>
            {/* NP with ruby */}
            <div className="mt-1">
              <ruby className="text-xs 2xl:text-sm text-gray-400">
                {servant.noblePhantasm.name}
                <rp>(</rp><rt className="text-gray-500">{servant.noblePhantasm.ruby}</rt><rp>)</rp>
              </ruby>
            </div>
          </div>

          {/* Stats summary */}
          <div className="shrink-0 grid grid-cols-2 gap-x-3 2xl:gap-x-4 gap-y-0.5 text-[0.7rem] 2xl:text-xs">
            {STAT_LABELS.map(({ key, label }) => (
              <div key={key} className="flex gap-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-300 font-mono">{servant.stats[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expand indicator */}
        <div className="text-center mt-2">
          <span className="text-gray-600 text-[0.65rem]">
            {expanded ? "▲ 접기" : "▼ 상세 보기"}
          </span>
        </div>
      </motion.div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-b-xl p-5 2xl:p-6 -mt-1 space-y-4"
              style={{
                background: `linear-gradient(180deg, #0a0a1a, ${classColor}08)`,
                border: `1px solid ${classColor}22`,
                borderTop: "none",
              }}
            >
              {/* Noble Phantasm */}
              <div className="p-3 rounded-lg" style={{ background: `${classColor}10`, border: `1px solid ${classColor}20` }}>
                <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mb-1">보구 — {servant.noblePhantasm.rank} / {servant.noblePhantasm.type}</div>
                <ruby className="text-sm 2xl:text-base font-bold text-white">
                  {servant.noblePhantasm.name}
                  <rp>(</rp><rt className="text-gray-400">{servant.noblePhantasm.ruby}</rt><rp>)</rp>
                </ruby>
                <p className="text-xs 2xl:text-sm text-gray-500 mt-1 leading-relaxed">{servant.noblePhantasm.detail}</p>
              </div>

              {/* Class Skills */}
              <div>
                <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mb-2">클래스 스킬</div>
                <div className="flex flex-wrap gap-2">
                  {servant.classSkills.map((s, i) => (
                    <span key={i} className="text-xs 2xl:text-sm px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Personal Skills */}
              <div>
                <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mb-2">보유 스킬</div>
                <div className="flex flex-wrap gap-2">
                  {servant.personalSkills.map((s, i) => (
                    <span key={i} className="text-xs 2xl:text-sm px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Profile */}
              {servant.profile && (
                <div>
                  <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mb-2">프로필</div>
                  <p className="text-xs 2xl:text-sm text-gray-400 leading-relaxed">{servant.profile}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
