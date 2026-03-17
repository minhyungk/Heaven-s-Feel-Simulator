import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { CLASS_COLORS } from "../data/types";
import type { ServantClass } from "../data/types";
import { useServantData } from "../contexts/ServantDataContext";
import koServants from "../data/servants-ko.json";

// Build Korean name+class → servant ID map (handles duplicate names across classes)
const koNameClassToId = new Map<string, number>();
for (const s of koServants as { id: number; name: string; class: string }[]) {
  koNameClassToId.set(`${s.name}|${s.class}`, s.id);
}
// Also build name-only fallback (last write wins, but better than nothing)
const koNameToId = new Map<string, number>();
for (const s of koServants as { id: number; name: string }[]) {
  koNameToId.set(s.name, s.id);
}

interface RankEntry {
  id: number | null; // servant ID for cross-language lookup
  name: string;      // DB name (Korean)
  class: string;
  count: number;
}

type Tab = "winner" | "summon" | "catalyst";

interface Props {
  onBack: () => void;
}

function RankRow({ rank, displayName, className, countLabel, imageUrl, pct }: {
  rank: number; displayName: string; className: string; countLabel: string; imageUrl?: string; pct: number;
}) {
  const color = CLASS_COLORS[className as ServantClass] ?? "#888";
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="relative flex items-center gap-3 py-2 border-b border-white/5 overflow-hidden"
    >
      {/* Background bar */}
      <motion.div
        className="absolute inset-y-0 left-0 pointer-events-none"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay: rank * 0.04 + 0.2, duration: 0.6, ease: "easeOut" }}
        style={{ background: `linear-gradient(90deg, ${color}30, ${color}12)` }}
      />
      <span className="relative w-6 text-right text-sm font-mono text-gray-500 shrink-0">{rank}</span>
      <div
        className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border"
        style={{ borderColor: color }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${color}20` }}>⚔</div>
        )}
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 truncate">{displayName}</p>
        <p className="text-xs" style={{ color }}>{className}</p>
      </div>
      <span className="relative text-sm font-mono font-bold text-gold shrink-0">{countLabel}</span>
    </motion.div>
  );
}


export default function RankingPage({ onBack }: Props) {
  const { t } = useTranslation();
  const { servants } = useServantData();
  const [tab, setTab] = useState<Tab>("winner");
  const [data, setData] = useState<Record<Tab, RankEntry[]>>({ winner: [], summon: [], catalyst: [] });
  const [loading, setLoading] = useState(true);
  const [totalWars, setTotalWars] = useState<number | null>(null);

  // Build ID → current language servant lookup
  const servantById = useMemo(() => {
    const map = new Map<number, { name: string; imageUrl: string }>();
    for (const s of servants) {
      map.set(s.id, { name: s.name, imageUrl: s.imageUrl });
    }
    return map;
  }, [servants]);

  const TAB_LABELS: Record<Tab, string> = {
    winner: t("ranking.winner"),
    summon: t("ranking.summon"),
    catalyst: t("ranking.catalystRanking"),
  };

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      const [countRes, winnerRes, summonRes, catalystRes] = await Promise.all([
        supabase.from("war_results").select("id", { count: "exact", head: true }),
        supabase.from("war_results").select("winner_servant_id, winner_servant_name, winner_class").limit(2000),
        supabase.rpc("get_summon_ranking", { lim: 10 }),
        supabase
          .from("war_results")
          .select("catalyst_servant_id, catalyst_servant_name, catalyst_class")
          .eq("summon_type", "catalyst")
          .limit(2000),
      ]);

      setTotalWars(countRes.count ?? null);

      const winnerMap = new Map<string, RankEntry>();
      for (const row of winnerRes.data ?? []) {
        const key = String(row.winner_servant_id ?? row.winner_servant_name);
        const existing = winnerMap.get(key);
        if (existing) existing.count++;
        else winnerMap.set(key, {
          id: row.winner_servant_id ?? null,
          name: row.winner_servant_name,
          class: row.winner_class,
          count: 1,
        });
      }
      const winnerRanking = [...winnerMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

      const summonRanking: RankEntry[] = (summonRes.data ?? []).map((r: { servant_name: string; servant_class: string; count: number }) => ({
        id: koNameClassToId.get(`${r.servant_name}|${r.servant_class}`) ?? koNameToId.get(r.servant_name) ?? null,
        name: r.servant_name,
        class: r.servant_class,
        count: Number(r.count),
      }));

      const catalystMap = new Map<string, RankEntry>();
      for (const row of catalystRes.data ?? []) {
        if (!row.catalyst_servant_name) continue;
        const key = String(row.catalyst_servant_id ?? row.catalyst_servant_name);
        const existing = catalystMap.get(key);
        if (existing) existing.count++;
        else catalystMap.set(key, {
          id: row.catalyst_servant_id ?? null,
          name: row.catalyst_servant_name,
          class: row.catalyst_class ?? "",
          count: 1,
        });
      }
      const catalystRanking = [...catalystMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

      setData({ winner: winnerRanking, summon: summonRanking, catalyst: catalystRanking });
      setLoading(false);
    }

    fetchAll();
  }, []);

  const entries = data[tab];

  // Resolve display name and image for an entry using current language
  function getDisplay(entry: RankEntry) {
    if (entry.id !== null) {
      const s = servantById.get(entry.id);
      if (s) return { displayName: s.name, imageUrl: s.imageUrl };
    }
    return { displayName: entry.name, imageUrl: undefined };
  }

  return (
    <motion.div
      key="rankings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col items-center justify-start px-4 py-10"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            {t("ranking.back")}
          </button>
          <h2
            className="text-2xl font-bold text-gold flex-1 text-center"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {t("ranking.title")}
          </h2>
          {totalWars !== null && (
            <span className="text-xs text-gray-500 shrink-0">{t("ranking.totalWars", { count: totalWars.toLocaleString() } as Record<string, string>)}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1">
          {(["winner", "summon", "catalyst"] as Tab[]).map((tKey) => (
            <button
              key={tKey}
              onClick={() => setTab(tKey)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                tab === tKey
                  ? "bg-gold/20 text-gold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {TAB_LABELS[tKey]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-500 py-16 text-sm">{t("ranking.loading")}</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-600 py-16 text-sm">{t("ranking.noData")}</div>
        ) : (
          <div>
            {(() => {
              const maxCount = Math.max(...entries.map((e) => e.count), 1);
              return entries.map((entry, i) => {
                const { displayName, imageUrl } = getDisplay(entry);
                return (
                  <RankRow
                    key={entry.name}
                    rank={i + 1}
                    displayName={displayName}
                    className={entry.class}
                    countLabel={t("ranking.count", { count: entry.count })}
                    imageUrl={imageUrl}
                    pct={Math.round((entry.count / maxCount) * 100)}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
    </motion.div>
  );
}
