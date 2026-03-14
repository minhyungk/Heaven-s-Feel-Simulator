import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Servant, ServantClass } from "../data/types";
import { CLASS_COLORS, BASIC_CLASSES } from "../data/types";
import servants from "../data/servants";

const EXTRA_CLASSES: ServantClass[] = ["Ruler", "Avenger", "MoonCancer", "AlterEgo", "Foreigner"];
const ALL_CLASSES = [...BASIC_CLASSES, ...EXTRA_CLASSES];

interface Props {
  onSelect: (servant: Servant) => void;
  onClose: () => void;
}

export default function CatalystModal({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<ServantClass | null>(null);

  const filtered = useMemo(() => {
    return servants.filter((s) => {
      if (classFilter && s.class !== classFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, classFilter]);

  // Only show classes that have servants in the pool
  const availableClasses = useMemo(() => {
    return ALL_CLASSES.filter((cls) => servants.some((s) => s.class === cls));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gold" style={{ fontFamily: "var(--font-serif)" }}>
              촉매소환
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="서번트 이름 검색..."
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 outline-none focus:border-gold/50"
            autoFocus
          />

          {/* Class filter */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setClassFilter(null)}
              className={`px-2 py-1 text-[11px] rounded border cursor-pointer transition-colors ${
                classFilter === null
                  ? "border-gold text-gold bg-gold/10"
                  : "border-white/10 text-gray-500 hover:text-gray-300"
              }`}
            >
              전체
            </button>
            {availableClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setClassFilter(classFilter === cls ? null : cls)}
                className="px-2 py-1 text-[11px] rounded border cursor-pointer transition-colors"
                style={{
                  borderColor: classFilter === cls ? CLASS_COLORS[cls] : "rgba(255,255,255,0.1)",
                  color: classFilter === cls ? CLASS_COLORS[cls] : "#6b7280",
                  background: classFilter === cls ? `${CLASS_COLORS[cls]}15` : "transparent",
                }}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">검색 결과 없음</p>
          ) : (
            filtered.map((servant) => (
              <button
                key={servant.id}
                onClick={() => onSelect(servant)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden shrink-0 border"
                  style={{ borderColor: CLASS_COLORS[servant.class] }}
                >
                  {servant.imageUrl ? (
                    <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-sm"
                      style={{ background: `${CLASS_COLORS[servant.class]}20` }}
                    >
                      ⚔
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{servant.name}</div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-bold"
                    style={{ color: CLASS_COLORS[servant.class] }}
                  >
                    {servant.class}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
