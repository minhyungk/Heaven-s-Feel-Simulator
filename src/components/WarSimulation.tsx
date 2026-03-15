import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Servant } from "../data/types";
import { CLASS_COLORS } from "../data/types";
import type { RoundResult, Intent } from "../simulation/warEngine";
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

function ServantFace({ servant, size = 7 }: { servant: Servant; size?: number }) {
  const color = CLASS_COLORS[servant.class];
  const px = size * 4;
  return (
    <div
      className="rounded-full overflow-hidden shrink-0 border"
      style={{ borderColor: color, width: px, height: px }}
    >
      {servant.imageUrl ? (
        <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: `${color}20` }}>⚔</div>
      )}
    </div>
  );
}

async function captureElement(el: HTMLElement): Promise<Blob | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("html2canvas-pro") as any;
    const html2canvas = mod.default ?? mod;

    // Force a consistent desktop-like width for capture so mobile doesn't
    // produce a narrow, overly-tall image with giant profile pics.
    const CAPTURE_WIDTH = 600;
    const origStyle = el.style.cssText;
    el.style.width = `${CAPTURE_WIDTH}px`;
    el.style.maxWidth = `${CAPTURE_WIDTH}px`;
    el.style.minWidth = `${CAPTURE_WIDTH}px`;

    const canvas = await html2canvas(el, {
      backgroundColor: "#0a0a1a",
      scale: 2,
      useCORS: true,
      windowWidth: CAPTURE_WIDTH,
    });

    // Restore original styles
    el.style.cssText = origStyle;

    return new Promise((resolve) => canvas.toBlob((b: Blob | null) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}

export default function WarSimulation({ participants, playerServant, onClose }: Props) {
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [survivors, setSurvivors] = useState<Servant[]>(participants);
  const [isFinished, setIsFinished] = useState(false);
  const [wish, setWish] = useState("");
  const [wishSubmitted, setWishSubmitted] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const currentDay = rounds.length + 1;
  const winner = isFinished && survivors.length === 1 ? survivors[0] : null;
  const playerWon = winner?.id === playerServant.id;
  const playerLostDay = rounds.find((r) => r.eliminated.some((e) => e.id === playerServant.id))?.day;

  const advanceRound = useCallback(() => {
    if (isFinished) return;
    const round = simulateRound(survivors, currentDay);
    setRounds((prev) => [...prev, round]);
    setSurvivors(round.survivors);
    if (round.survivors.length <= 1) setIsFinished(true);
  }, [survivors, currentDay, isFinished]);

  const autoComplete = useCallback(() => {
    const result = simulateFullWar(participants);
    setRounds(result.rounds);
    setSurvivors(result.winner ? [result.winner] : []);
    setIsFinished(true);
  }, [participants]);

  const restart = useCallback(() => {
    setRounds([]);
    setSurvivors(participants);
    setIsFinished(false);
    setWish("");
    setWishSubmitted(false);
  }, [participants]);

  const downloadImage = useCallback(async () => {
    if (!captureRef.current) return;
    const blob = await captureElement(captureRef.current);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "grail-war-result.png";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert("이미지 생성에 실패했습니다.");
    }
  }, []);

  const shareImage = useCallback(async (platform: "x" | "instagram") => {
    if (!captureRef.current) return;
    const blob = await captureElement(captureRef.current);

    // Try Web Share API (works on mobile)
    if (blob && navigator.share) {
      try {
        const file = new File([blob], "grail-war-result.png", { type: "image/png" });
        await navigator.share({
          title: "성배전쟁 시뮬레이터",
          text: playerWon
            ? `🏆 성배전쟁 승리! ${playerServant.name}(${playerServant.class}) #성배전쟁시뮬레이터`
            : `⚰️ 성배전쟁 패배... ${playerServant.name}(${playerServant.class}) #성배전쟁시뮬레이터`,
          files: [file],
        });
        return;
      } catch {
        // User cancelled or API not supported for files
      }
    }

    // Fallback: download image + open platform
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "grail-war-result.png";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }

    const text = playerWon
      ? `🏆 성배전쟁 승리! ${playerServant.name}(${playerServant.class})가 ${rounds.length}일차에 성배를 획득했습니다.\n소원: "${wish}"\n\n#성배전쟁시뮬레이터 #FateGO`
      : `⚰️ 성배전쟁 패배... ${playerServant.name}(${playerServant.class})가 ${playerLostDay ?? "?"}일차에 탈락했습니다.\n\n#성배전쟁시뮬레이터 #FateGO`;

    if (platform === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      alert("이미지가 저장되었습니다. 인스타그램 앱에서 직접 업로드해주세요.");
    }
  }, [playerWon, playerServant, rounds.length, wish, playerLostDay]);

  const latestRound = rounds[rounds.length - 1] ?? null;

  // Should we show the share card area (capturable)
  const showShareArea = isFinished && (playerWon ? wishSubmitted : true);

  return (
    <div className="min-h-screen flex flex-col items-center px-4" style={{ paddingTop: "2rem" }}>
      {/* ─── Capturable area starts ─── */}
      <div ref={showShareArea ? captureRef : undefined} className="w-full flex flex-col items-center" style={showShareArea ? { paddingBottom: "1rem" } : undefined}>

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
                  <ServantFace servant={s} size={6} />
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
              <div className="rounded-xl p-5 space-y-4" style={{ background: "#0d0d24", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-base font-bold text-gold text-center">제{latestRound.day}일차 밤</h3>

                {/* Intents */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">행동 의도</p>
                  <div className="grid grid-cols-2 gap-2">
                    {latestRound.intents
                      .filter((i) => survivors.some((s) => s.id === i.servant.id) || latestRound.eliminated.some((e) => e.id === i.servant.id))
                      .map((i) => (
                        <div key={i.servant.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5">
                          <ServantFace servant={i.servant} size={7} />
                          <span className="text-xs text-gray-300 truncate">{i.servant.name}</span>
                          <span className="text-sm ml-auto shrink-0">{INTENT_ICONS[i.intent]}</span>
                          <span className="text-xs text-gray-400 shrink-0">{INTENT_LABELS[i.intent]}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Battles */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">교전 결과</p>
                  {latestRound.isQuiet ? (
                    <p className="text-sm text-gray-600 text-center py-3">아무 일도 일어나지 않았다...</p>
                  ) : (
                    <div className="space-y-3">
                      {latestRound.battles.map((b, i) => {
                        const aPct = Math.round(b.result.winProbabilityA * 100);
                        const bPct = 100 - aPct;
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex items-center justify-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <ServantFace servant={b.attacker} size={8} />
                                <div>
                                  <span className="text-sm font-bold" style={{ color: CLASS_COLORS[b.attacker.class] }}>{b.attacker.name}</span>
                                  <span className="text-xs text-gray-500 ml-1">{aPct}%</span>
                                </div>
                              </div>
                              <span className="text-magic-red font-bold text-sm">VS</span>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-sm font-bold" style={{ color: CLASS_COLORS[b.defender.class] }}>{b.defender.name}</span>
                                  <span className="text-xs text-gray-500 ml-1">{bPct}%</span>
                                </div>
                                <ServantFace servant={b.defender} size={8} />
                              </div>
                            </div>

                            {b.result.skillEffects.length > 0 && (
                              <div className="mb-2 space-y-0.5">
                                {b.result.skillEffects.map((effect, j) => (
                                  <p key={j} className="text-xs text-magic-blue text-center">{effect.description}</p>
                                ))}
                              </div>
                            )}

                            <p className={`text-sm font-bold text-center ${b.result.isDraw ? "text-gray-400" : "text-white"}`}>
                              {b.result.isDraw
                                ? "→ 무승부 (양쪽 생존)"
                                : `→ ${b.result.winner!.name} 승리`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {latestRound.eliminated.length > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-magic-red uppercase tracking-wider">
                      탈락: {latestRound.eliminated.map((e) => e.name).join(", ")}
                    </p>
                  </div>
                )}

                {/* Tips */}
                <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5">참고</p>
                  <ul className="text-[10px] text-gray-400 space-y-0.5 list-none pl-0">
                    <li>⚔️ <span className="text-gray-400">사냥</span> vs 🛡 <span className="text-gray-500">경계</span>: 경계 측 승률 +10%</li>
                    <li>🗡 <span className="text-gray-400">기척 차단</span>: 어새신이 사냥 시 기척 차단 랭크에 비례해 기습 판정 (성공 시 승률 +20%)</li>
                    <li>🛡 <span className="text-gray-400">대 마력</span>: 3기사(세이버/랜서/아쳐) 캐스터 상대 시 랭크에 비례해 승률 보정</li>
                    <li>📖 <span className="text-gray-400">도구작성/진지작성</span>: 캐스터의 대 마력 방어 — 랭크 차이로 보정량 결정</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* War Log - expanded by default, with profile pics */}
        {rounds.length > 1 && (
          <div className="w-full max-w-xl mb-6">
            <p className="text-sm text-gray-400 font-bold mb-3 text-center">전쟁 기록 ({rounds.length}일차)</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rounds.map((round) => (
                <div key={round.day} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-sm text-gold font-bold mb-1.5">제{round.day}일차</p>
                  {round.isQuiet ? (
                    <p className="text-sm text-gray-600">아무 일도 일어나지 않았다...</p>
                  ) : (
                    <div className="space-y-2">
                      {round.battles.map((b, i) => {
                        const aPct = Math.round(b.result.winProbabilityA * 100);
                        const bPct = 100 - aPct;
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                            <ServantFace servant={b.attacker} size={5} />
                            <span style={{ color: CLASS_COLORS[b.attacker.class] }}>{b.attacker.name}</span>
                            <span className="text-gray-600 text-xs">{aPct}%</span>
                            <span className="text-magic-red text-xs font-bold">vs</span>
                            <span style={{ color: CLASS_COLORS[b.defender.class] }}>{b.defender.name}</span>
                            <span className="text-gray-600 text-xs">{bPct}%</span>
                            <ServantFace servant={b.defender} size={5} />
                            <span className="text-white font-bold ml-1">
                              → {b.result.isDraw ? "무승부" : `${b.result.winner!.name} 승리`}
                            </span>
                          </div>
                        );
                      })}
                      {round.battles.some((b) => b.result.skillEffects.length > 0) && (
                        <div className="text-xs text-magic-blue">
                          {round.battles.flatMap((b) => b.result.skillEffects).map((e, j) => (
                            <span key={j}>{j > 0 && " / "}{e.description}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
              <div className="rounded-xl p-6 text-center relative overflow-hidden" style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}>
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,215,0,0.3) 0%, transparent 60%)" }}
                />
                <img src="/7999.png" alt="Holy Grail" style={{ display: "block", width: 80, height: 80, margin: "0 auto 0.75rem auto", objectFit: "contain" }} className="animate-pulse-glow relative z-10" />
                <h2 className="text-2xl font-bold text-gold mb-2 relative z-10" style={{ fontFamily: "var(--font-serif)" }}>
                  성배 획득
                </h2>
                <p className="text-sm text-gray-400 mb-4 relative z-10">축하합니다! 성배에 빌 소원은?</p>
                <input
                  type="text"
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder="소원을 입력하세요..."
                  className="relative z-10 w-full px-4 py-3 rounded-lg bg-white/5 border border-gold/30 text-sm text-white placeholder-gray-600 outline-none focus:border-gold/60 text-center mb-4"
                  onKeyDown={(e) => { if (e.key === "Enter" && wish.trim()) setWishSubmitted(true); }}
                  autoFocus
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => wish.trim() && setWishSubmitted(true)}
                  disabled={!wish.trim()}
                  className="relative z-10 px-8 py-2 text-sm font-bold rounded-lg border border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-default"
                >
                  소원 빌기
                </motion.button>
              </div>
            ) : playerWon && wishSubmitted ? (
              <div className="rounded-xl p-6 text-center relative overflow-hidden" style={{ background: "#0d0d24", border: "1px solid #ffd70044" }}>
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.1, 0.25, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,215,0,0.4) 0%, transparent 60%)" }}
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{ background: "conic-gradient(from 0deg, transparent 0%, rgba(255,215,0,0.05) 25%, transparent 50%)" }}
                />
                <div className="relative z-10">
                  <div className="text-4xl mb-3">🏆</div>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <ServantFace servant={playerServant} size={12} />
                  </div>
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
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center" style={{ background: "#0d0d24", border: "1px solid #ff4a4a44" }}>
                <div className="text-4xl mb-3">⚰️</div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <ServantFace servant={playerServant} size={12} />
                </div>
                <h2 className="text-2xl font-bold text-magic-red mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                  패배
                </h2>
                <p className="text-sm text-gray-400">
                  {playerServant.name}({playerServant.class})가 {playerLostDay ?? "?"}일차에 탈락했습니다
                </p>
                {winner && (
                  <p className="text-sm text-gray-400 mt-1">
                    성배전쟁의 승자: <span className="text-gold font-bold">{winner.name}({winner.class})</span>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Watermark for captured image */}
        {showShareArea && (
          <p className="text-[10px] text-gray-700 text-center mb-2">성배전쟁 시뮬레이터 | Holy Grail War Simulator</p>
        )}

      {/* ─── Capturable area ends ─── */}
      </div>

      {/* Share buttons (outside capture) */}
      {showShareArea && (
        <div className="flex gap-3 justify-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadImage}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
          >
            이미지 저장
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shareImage("x")}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
          >
            X(Twitter) 공유
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shareImage("instagram")}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
          >
            Instagram 공유
          </motion.button>
        </div>
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
        {isFinished && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={restart}
            className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            다시 시뮬레이션
          </motion.button>
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
