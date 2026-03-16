import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { CLASS_COLORS } from "../data/types";
import type { ServantClass } from "../data/types";
import servants from "../data/servants";

function getImageUrl(name: string): string | undefined {
  return servants.find((s) => s.name === name)?.imageUrl;
}

interface RankEntry {
  name: string;
  class: string;
  count: number;
}

type Tab = "winner" | "summon" | "catalyst";

const TAB_LABELS: Record<Tab, string> = {
  winner: "우승 랭킹",
  summon: "소환 랭킹",
  catalyst: "촉매 소환 랭킹",
};

interface Props {
  onBack: () => void;
}

function RankRow({ rank, entry }: { rank: number; entry: RankEntry }) {
  const color = CLASS_COLORS[entry.class as ServantClass] ?? "#888";
  const imageUrl = getImageUrl(entry.name);
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="flex items-center gap-3 py-2 border-b border-white/5"
    >
      <span className="w-6 text-right text-sm font-mono text-gray-500 shrink-0">{rank}</span>
      <div
        className="w-10 h-10 rounded-full overflow-hidden shrink-0 border"
        style={{ borderColor: color }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={entry.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${color}20` }}>⚔</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 truncate">{entry.name}</p>
        <p className="text-xs" style={{ color }}>{entry.class}</p>
      </div>
      <span className="text-sm font-mono font-bold text-gold shrink-0">{entry.count}회</span>
    </motion.div>
  );
}

export default function RankingPage({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>("winner");
  const [data, setData] = useState<Record<Tab, RankEntry[]>>({ winner: [], summon: [], catalyst: [] });
  const [loading, setLoading] = useState(true);
  const [totalWars, setTotalWars] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      const [countRes, winnerRes, summonRes, catalystRes] = await Promise.all([
        supabase.from("war_results").select("id", { count: "exact", head: true }),
        supabase.from("war_results").select("winner_servant_name, winner_class").limit(2000),
        supabase.rpc("get_summon_ranking", { lim: 10 }),
        supabase
          .from("war_results")
          .select("catalyst_servant_name, catalyst_class")
          .eq("summon_type", "catalyst")
          .limit(2000),
      ]);

      setTotalWars(countRes.count ?? null);

      // 우승 랭킹: group client-side
      const winnerMap = new Map<string, RankEntry>();
      for (const row of winnerRes.data ?? []) {
        const key = row.winner_servant_name;
        const existing = winnerMap.get(key);
        if (existing) existing.count++;
        else winnerMap.set(key, { name: row.winner_servant_name, class: row.winner_class, count: 1 });
      }
      const winnerRanking = [...winnerMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

      // 소환 랭킹: from RPC
      const summonRanking: RankEntry[] = (summonRes.data ?? []).map((r: { servant_name: string; servant_class: string; count: number }) => ({
        name: r.servant_name,
        class: r.servant_class,
        count: Number(r.count),
      }));

      // 촉매 소환 랭킹: group client-side
      const catalystMap = new Map<string, RankEntry>();
      for (const row of catalystRes.data ?? []) {
        if (!row.catalyst_servant_name) continue;
        const key = row.catalyst_servant_name;
        const existing = catalystMap.get(key);
        if (existing) existing.count++;
        else catalystMap.set(key, { name: row.catalyst_servant_name, class: row.catalyst_class ?? "", count: 1 });
      }
      const catalystRanking = [...catalystMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

      setData({ winner: winnerRanking, summon: summonRanking, catalyst: catalystRanking });
      setLoading(false);
    }

    fetchAll();
  }, []);

  const entries = data[tab];

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
            ← 돌아가기
          </button>
          <h2
            className="text-2xl font-bold text-gold flex-1 text-center"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            RANKINGS
          </h2>
          {totalWars !== null && (
            <span className="text-xs text-gray-500 shrink-0">{totalWars.toLocaleString()}전</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1">
          {(["winner", "summon", "catalyst"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                tab === t
                  ? "bg-gold/20 text-gold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-500 py-16 text-sm">불러오는 중...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-600 py-16 text-sm">아직 데이터가 없습니다</div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <RankRow key={entry.name} rank={i + 1} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
