import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant, ServantClass } from "../data/types";
import { CLASS_COLORS, BASIC_CLASSES } from "../data/types";
import { useServantData } from "../contexts/ServantDataContext";

const EXTRA_CLASSES: ServantClass[] = ["Ruler", "Avenger", "MoonCancer", "AlterEgo", "Foreigner", "Pretender", "Shielder"];
const ALL_CLASSES = [...BASIC_CLASSES, ...EXTRA_CLASSES];

interface Preset {
  labelKey: string;
  playerId: number;
  enemyIds: number[];
}

const PRESETS: Preset[] = [
  {
    labelKey: "designated.preset4th",
    playerId: 2,    // 알트리아 펜드래곤
    enemyIds: [12, 71, 108, 32, 110, 48], // 길가메시, 디어뮈드, 이스칸다르, 질 드 레(캐스터), 백모의 하산, 랜슬롯
  },
  {
    labelKey: "designated.preset5th",
    playerId: 2,    // 알트리아 펜드래곤
    enemyIds: [11, 17, 23, 31, 40, 47], // 에미야, 쿠 훌린, 메두사, 메데이아, 주완의 하산, 헤라클레스
  },
];

interface Props {
  onConfirm: (playerServant: Servant, enemies: Servant[]) => void;
  onClose: () => void;
}

export default function DesignatedSummonModal({ onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const { servants, jaOnlyServants } = useServantData();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<ServantClass | null>(null);
  const [player, setPlayer] = useState<Servant | null>(null);
  const [enemies, setEnemies] = useState<Servant[]>([]);

  const allServants = useMemo(() => [...servants, ...jaOnlyServants], [servants, jaOnlyServants]);

  const filtered = useMemo(() => {
    return allServants.filter((s) => {
      if (classFilter && s.class !== classFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [allServants, query, classFilter]);

  const availableClasses = useMemo(() => {
    return ALL_CLASSES.filter((cls) => allServants.some((s) => s.class === cls));
  }, [allServants]);

  // Track which servants are already selected
  const selectedIds = useMemo(() => {
    const ids = new Set<number>();
    if (player) ids.add(player.id);
    for (const e of enemies) ids.add(e.id);
    return ids;
  }, [player, enemies]);

  const handleSelect = useCallback((servant: Servant) => {
    if (selectedIds.has(servant.id)) return;
    if (!player) {
      setPlayer(servant);
    } else if (enemies.length < 6) {
      setEnemies((prev) => [...prev, servant]);
    }
  }, [player, enemies.length, selectedIds]);

  const removePlayer = useCallback(() => setPlayer(null), []);
  const removeEnemy = useCallback((id: number) => {
    setEnemies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    const byId = (id: number) => allServants.find((s) => s.id === id);
    const p = byId(preset.playerId);
    const es = preset.enemyIds.map(byId).filter((s): s is Servant => s != null);
    if (p && es.length === 6) {
      setPlayer(p);
      setEnemies(es);
    }
  }, [allServants]);

  const canConfirm = player !== null && enemies.length === 6;

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
        className="relative z-10 w-full max-w-2xl h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gold" style={{ fontFamily: "var(--font-serif)" }}>
              {t("designated.title")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.labelKey}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 text-[11px] rounded border border-white/15 text-gray-400 cursor-pointer transition-colors hover:border-gold/50 hover:text-gold hover:bg-gold/5"
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>

          {/* Selected slots */}
          <div className="mb-3">
            {/* My Servant */}
            <div className="mb-2">
              <span className="text-[11px] text-gold font-bold uppercase tracking-wider">
                {t("designated.myServant")}
              </span>
              <div className="flex gap-1.5 mt-1">
                {player ? (
                  <button
                    onClick={removePlayer}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer transition-colors hover:bg-white/10"
                    style={{ borderColor: CLASS_COLORS[player.class], color: CLASS_COLORS[player.class] }}
                  >
                    <span className="truncate max-w-[120px]">{player.name}</span>
                    <span className="text-gray-500">✕</span>
                  </button>
                ) : (
                  <div className="px-2 py-1 rounded border border-dashed border-gold/30 text-[11px] text-gold/50">
                    {t("designated.selectPlayer")}
                  </div>
                )}
              </div>
            </div>
            {/* Enemy Servants */}
            <div>
              <span className="text-[11px] text-magic-blue font-bold uppercase tracking-wider">
                {t("designated.enemyServants")} ({enemies.length}/6)
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {enemies.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => removeEnemy(s.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer transition-colors hover:bg-white/10"
                    style={{ borderColor: CLASS_COLORS[s.class], color: CLASS_COLORS[s.class] }}
                  >
                    <span className="truncate max-w-[120px]">{s.name}</span>
                    <span className="text-gray-500">✕</span>
                  </button>
                ))}
                {enemies.length < 6 && (
                  <div className="px-2 py-1 rounded border border-dashed border-magic-blue/30 text-[11px] text-magic-blue/50">
                    {t("designated.selectEnemy", { remaining: 6 - enemies.length })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("catalyst.searchPlaceholder")}
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
              {t("catalyst.all")}
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
            <p className="text-center text-gray-600 text-sm py-8">{t("catalyst.noResults")}</p>
          ) : (
            filtered.map((servant) => {
              const isSelected = selectedIds.has(servant.id);
              const isFull = player !== null && enemies.length >= 6;
              const disabled = isSelected || (isFull && !isSelected);
              return (
                <button
                  key={servant.id}
                  onClick={() => handleSelect(servant)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                    disabled
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-white/5 cursor-pointer"
                  }`}
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
                  {isSelected && (
                    <span className="text-[10px] text-gold/60 shrink-0">
                      {player?.id === servant.id ? t("designated.myServant") : t("designated.enemy")}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Confirm button */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => canConfirm && onConfirm(player!, enemies)}
            disabled={!canConfirm}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
              canConfirm
                ? "bg-gold/20 border border-gold text-gold cursor-pointer hover:bg-gold/30"
                : "bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed"
            }`}
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {t("designated.confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
