import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Servant } from "../data/types";
import { CLASS_COLORS } from "../data/types";
import type { RoundResult, Intent, WarSimulationResult } from "../simulation/warEngine";
import { simulateRound, simulateFullWar } from "../simulation/warEngine";

const INTENT_ICONS: Record<Intent, string> = {
  hunt: "⚔️",
  guard: "🛡",
  hide: "👤",
};

const INTENT_LABELS: Record<Intent, string> = {
  hunt: "사냥",
  guard: "경계",
  hide: "은신",
};

interface Props {
  participants: Servant[];
  playerServant: Servant;
  onClose: () => void;
}

function IntentBadge({ servant, intent }: { servant: Servant; intent: Intent }) {
  const color = CLASS_COLORS[servant.class];
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
      <div
        className="w-7 h-7 rounded-full overflow-hidden shrink-0 border"
        style={{ borderColor: color }}
      >
        {servant.imageUrl ? (
          <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: `${color}20` }}>⚔</div>
        )}
      </div>
      <span className="text-xs text-gray-300 truncate">{servant.name}</span>
      <span className="text-sm ml-auto shrink-0" title={INTENT_LABELS[intent]}>{INTENT_ICONS[intent]}</span>
    </div>
  );
}

export default function WarSimulation({ participants, playerServant, onClose }: Props) {
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [survivors, setSurvivors] = useState<Servant[]>(participants);
  const [isFinished, setIsFinished] = useState(false);
  const [playerEliminated, setPlayerEliminated] = useState(false);
  const [wish, setWish] = useState("");
  const [wishSubmitted, setWishSubmitted] = useState(false);

  const currentDay = rounds.length + 1;
  const winner = isFinished && survivors.length === 1 ? survivors[0] : null;
  const playerWon = winner?.id === playerServant.id;

  const advanceRound = useCallback(() => {
    if (isFinished) return;
    const round = simulateRound(survivors, currentDay);
    setRounds((prev) => [...prev, round]);
    setSurvivors(round.survivors);

    if (!round.survivors.some((s) => s.id === playerServant.id)) {
      setPlayerEliminated(true);
    }
    if (round.survivors.length <= 1) {
      setIsFinished(true);
    }
  }, [survivors, currentDay, isFinished, playerServant.id]);

  const autoComplete = useCallback(() => {
    const result = simulateFullWar(participants);
    setRounds(result.rounds);
    setSurvivors(result.winner ? [result.winner] : []);
    setIsFinished(true);
    if (result.winner?.id !== playerServant.id) {
      setPlayerEliminated(true);
    }
  }, [participants, playerServant.id]);

  const latestRound = rounds[rounds.length - 1] ?? null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4" style={{ paddingTop: "2rem" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1
          className="text-2xl md:text-3xl font-bold mb-1 text-gold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {isFinished ? "성배전쟁 종결" : `제${currentDay}일차 밤`}
        </h1>
        <p className="text-gray-500 text-xs">
          생존자: {survivors.length}기 / {participants.length}기
        </p>
      </motion.div>

      {/* Survivors */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {participants.map((s) => {
            const alive = survivors.some((sv) => sv.id === s.id);
            const isPlayer = s.id === playerServant.id;
            return (
              <div
                key={s.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                style={{
                  opacity: alive ? 1 : 0.3,
                  border: `1px solid ${isPlayer ? "#ffd700" : CLASS_COLORS[s.class]}44`,
                  background: alive ? `${CLASS_COLORS[s.class]}10` : "transparent",
                  textDecoration: alive ? "none" : "line-through",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full overflow-hidden shrink-0 border"
                  style={{ borderColor: CLASS_COLORS[s.class] }}
                >
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ background: `${CLASS_COLORS[s.class]}20` }}>⚔</div>
                  )}
                </div>
                <span className={alive ? "text-gray-300" : "text-gray-600"}>{s.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latest Round Detail */}
      <AnimatePresence mode="wait">
        {latestRound && (
          <motion.div
            key={latestRound.day}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl mb-6"
          >
            <div className="rounded-xl p-4 space-y-4" style={{ background: "#0d0d24", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-sm font-bold text-gold text-center">제{latestRound.day}일차 밤</h3>

              {/* Intents */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">행동 의도</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {latestRound.intents
                    .filter((i) => survivors.some((s) => s.id === i.servant.id) || latestRound.eliminated.some((e) => e.id === i.servant.id))
                    .map((i) => (
                      <IntentBadge key={i.servant.id} servant={i.servant} intent={i.intent} />
                    ))}
                </div>
              </div>

              {/* Battles */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">교전 결과</p>
                {latestRound.isQuiet ? (
                  <p className="text-xs text-gray-600 text-center py-2">이번 밤은 조용했다...</p>
                ) : (
                  <div className="space-y-2">
                    {latestRound.battles.map((b, i) => (
                      <div
                        key={i}
                        className="text-xs p-2.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span style={{ color: CLASS_COLORS[b.attacker.class] }}>{b.attacker.name}</span>
                          <span className="text-gray-600">{INTENT_ICONS[b.intentA]}</span>
                          <span className="text-magic-red font-bold mx-1">vs</span>
                          <span style={{ color: CLASS_COLORS[b.defender.class] }}>{b.defender.name}</span>
                          <span className="text-gray-600">{INTENT_ICONS[b.intentB]}</span>
                        </div>
                        <p className={`font-bold ${b.result.isDraw ? "text-gray-400" : "text-white"}`}>
                          {b.result.isDraw
                            ? "→ 무승부 (양쪽 생존)"
                            : `→ ${b.result.winner!.name} 승리 (${b.result.loser!.name} 탈락)`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Eliminated this round */}
              {latestRound.eliminated.length > 0 && (
                <div className="text-center">
                  <p className="text-[10px] text-magic-red uppercase tracking-wider">
                    탈락: {latestRound.eliminated.map((e) => e.name).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* War Log (all rounds) */}
      {rounds.length > 1 && (
        <div className="w-full max-w-xl mb-6">
          <details className="group">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 text-center">
              전쟁 기록 전체 보기 ({rounds.length}일차)
            </summary>
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
              {rounds.slice(0, -1).map((round) => (
                <div key={round.day} className="text-[11px] text-gray-500 p-2 rounded bg-white/3">
                  <span className="text-gray-400 font-bold">제{round.day}일차:</span>{" "}
                  {round.isQuiet
                    ? "소강 상태"
                    : round.battles.map((b) => b.result.description).join(" / ")}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Ending screens */}
      {isFinished && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl mb-8"
        >
          {playerWon && !wishSubmitted ? (
            <div className="rounded-xl p-6 text-center" style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}>
              <h2 className="text-2xl font-bold text-gold mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                성배 획득
              </h2>
              <p className="text-sm text-gray-400 mb-4">축하합니다! 성배에 빌 소원은?</p>
              <input
                type="text"
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="소원을 입력하세요..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-gold/30 text-sm text-white placeholder-gray-600 outline-none focus:border-gold/60 text-center mb-4"
                onKeyDown={(e) => { if (e.key === "Enter" && wish.trim()) setWishSubmitted(true); }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => wish.trim() && setWishSubmitted(true)}
                disabled={!wish.trim()}
                className="px-8 py-2 text-sm font-bold rounded-lg border border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-default"
              >
                소원을 빌다
              </motion.button>
            </div>
          ) : playerWon && wishSubmitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl p-6 text-center"
              style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}
            >
              <div className="text-4xl mb-3">🏆</div>
              <h2 className="text-2xl font-bold text-gold mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                성배전쟁 승리
              </h2>
              <p className="text-sm text-gray-400 mb-1">
                {playerServant.name}({playerServant.class})가 {rounds.length}일차에 성배를 획득했습니다
              </p>
              <div className="mt-4 p-3 rounded-lg bg-gold/5 border border-gold/20">
                <p className="text-[10px] text-gray-500 mb-1">성배에 새겨진 소원</p>
                <p className="text-gold text-sm font-bold">"{wish}"</p>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl p-6 text-center" style={{ background: "#0d0d24", border: "1px solid #ff4a4a44" }}>
              <div className="text-4xl mb-3">⚰️</div>
              <h2 className="text-2xl font-bold text-magic-red mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                {playerEliminated ? "패배" : "성배전쟁 종결"}
              </h2>
              {playerEliminated && (
                <p className="text-sm text-gray-400">
                  {playerServant.name}({playerServant.class})가 탈락했습니다
                </p>
              )}
              {winner && (
                <p className="text-sm text-gray-400 mt-1">
                  성배전쟁의 승자: <span className="text-gold font-bold">{winner.name}({winner.class})</span>
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex gap-3 pb-12" style={{ marginTop: "1rem" }}>
        {!isFinished && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={advanceRound}
              className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              다음 밤 →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={autoComplete}
              className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
            >
              자동 진행
            </motion.button>
          </>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
        >
          대시보드로
        </motion.button>
      </div>
    </div>
  );
}
