import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Servant } from "../data/types";
import { CLASS_COLORS, APP_VERSION } from "../data/types";
import type { RoundResult, Intent, SkillEffect } from "../simulation/warEngine";
import { simulateRound, simulateFullWar } from "../simulation/warEngine";
import { supabase } from "../lib/supabase";
import { useServantResolver, useServantData } from "../contexts/ServantDataContext";

const INTENT_ICONS: Record<Intent, string> = {
  hunt: "⚔️",
  guard: "🛡",
  hide: "👤",
};

interface Props {
  participants: Servant[];
  playerServant: Servant;
  summonType: "random" | "catalyst";
  catalyst: Servant | null;
  onClose: () => void;
  onRankings: () => void;
}

function ServantFace({ servant: rawServant, size = 7 }: { servant: Servant; size?: number }) {
  const resolve = useServantResolver();
  const servant = resolve(rawServant);
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

    el.style.cssText = origStyle;

    return new Promise((resolve) => canvas.toBlob((b: Blob | null) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}

export default function WarSimulation({ participants, playerServant: rawPlayerServant, summonType, catalyst, onClose, onRankings }: Props) {
  const { t } = useTranslation(["common", "simulation", "trpg"]);
  const resolve = useServantResolver();
  const { byId } = useServantData();
  const playerServant = resolve(rawPlayerServant);

  /** Keys with a colon already include a namespace; others belong to simulation */
  function effectKey(key: string): string {
    return key.includes(":") ? key : `simulation:${key}`;
  }

  /** Resolve servant names and nested i18n keys in skill effect params */
  function resolveEffectParams(effect: SkillEffect): Record<string, string> {
    const params = { ...effect.params };
    if (effect.servantRefs) {
      for (const [key, id] of Object.entries(effect.servantRefs)) {
        const s = byId.get(id);
        if (s) params[key] = s.name;
      }
    }
    // Resolve nested i18n keys (e.g. skillName: "territoryCreation" → "진지작성")
    if (params.skillName) {
      params.skillName = t(`simulation:${params.skillName}`);
    }
    return params;
  }
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [survivors, setSurvivors] = useState<Servant[]>(participants);
  const [isFinished, setIsFinished] = useState(false);
  const [wish, setWish] = useState("");
  const [wishSubmitted, setWishSubmitted] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const hasRecorded = useRef(false);

  const currentDay = rounds.length + 1;
  const winner = isFinished && survivors.length === 1 ? survivors[0] : null;
  const playerWon = winner?.id === playerServant.id;
  const playerLostDay = rounds.find((r) => r.eliminated.some((e) => e.id === playerServant.id))?.day;

  useEffect(() => {
    if (!isFinished || !winner || hasRecorded.current) return;
    hasRecorded.current = true;
    supabase.from("war_results").insert({
      total_days: rounds.length,
      player_won: playerWon,
      summon_type: summonType,
      winner_servant_id: winner.id,
      winner_servant_name: winner.name,
      winner_class: winner.class,
      catalyst_servant_id: catalyst?.id ?? null,
      catalyst_servant_name: catalyst?.name ?? null,
      catalyst_class: catalyst?.class ?? null,
      participants: participants.map((p) => ({ id: p.id, name: p.name, class: p.class })),
      app_version: APP_VERSION,
    }).then(({ error }) => {
      if (error) console.error("[supabase] insert failed:", error.message);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, winner]);

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
      alert(t("simulation.imageFailed"));
    }
  }, [t]);

  const shareImage = useCallback(async (platform: "x" | "instagram") => {
    if (!captureRef.current) return;
    const blob = await captureElement(captureRef.current);

    if (blob && navigator.share) {
      try {
        const file = new File([blob], "grail-war-result.png", { type: "image/png" });
        await navigator.share({
          title: t("simulation.shareTitle"),
          text: playerWon
            ? t("simulation.shareWin", { name: playerServant.name, class: playerServant.class })
            : t("simulation.shareLose", { name: playerServant.name, class: playerServant.class }),
          files: [file],
        });
        return;
      } catch {
        // User cancelled or API not supported for files
      }
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "grail-war-result.png";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }

    const text = playerWon
      ? t("simulation.shareWinFull", { name: playerServant.name, class: playerServant.class, days: rounds.length, wish })
      : t("simulation.shareLoseFull", { name: playerServant.name, class: playerServant.class, day: playerLostDay ?? "?" });

    if (platform === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      alert(t("simulation.imageDownloaded"));
    }
  }, [playerWon, playerServant, rounds.length, wish, playerLostDay, t]);

  const latestRound = rounds[rounds.length - 1] ?? null;

  const showShareArea = isFinished && (playerWon ? wishSubmitted : true);

  return (
    <div className="min-h-screen flex flex-col items-center px-4" style={{ paddingTop: "2rem" }}>
      {/* Capturable area starts */}
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
            {isFinished ? t("simulation.warEnd") : t("simulation.nightDay", { day: currentDay })}
          </h1>
          <p className="text-gray-500 text-xs">
            {t("simulation.survivors", { alive: survivors.length, total: participants.length })}
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
                  <span className={alive ? "text-gray-300" : "text-gray-600"}>{resolve(s).name}</span>
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
                <h3 className="text-base font-bold text-gold text-center">{t("simulation.nightDay", { day: latestRound.day })}</h3>

                {/* Intents */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t("simulation.intent")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {latestRound.intents
                      .filter((i) => survivors.some((s) => s.id === i.servant.id) || latestRound.eliminated.some((e) => e.id === i.servant.id))
                      .map((i) => (
                        <div key={i.servant.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5">
                          <ServantFace servant={i.servant} size={7} />
                          <span className="text-xs text-gray-300 truncate">{resolve(i.servant).name}</span>
                          <span className="text-sm ml-auto shrink-0">{INTENT_ICONS[i.intent]}</span>
                          <span className="text-xs text-gray-400 shrink-0">{t(`intent.${i.intent}`)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Battles */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t("simulation.battleResult")}</p>
                  {latestRound.isQuiet ? (
                    <p className="text-sm text-gray-600 text-center py-3">{t("simulation.nothingHappened")}</p>
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
                                  <span className="text-sm font-bold" style={{ color: CLASS_COLORS[b.attacker.class] }}>{resolve(b.attacker).name}</span>
                                  <span className="text-xs text-gray-500 ml-1">{aPct}%</span>
                                </div>
                              </div>
                              <span className="text-magic-red font-bold text-sm">VS</span>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-sm font-bold" style={{ color: CLASS_COLORS[b.defender.class] }}>{resolve(b.defender).name}</span>
                                  <span className="text-xs text-gray-500 ml-1">{bPct}%</span>
                                </div>
                                <ServantFace servant={b.defender} size={8} />
                              </div>
                            </div>

                            {b.result.skillEffects.length > 0 && (
                              <div className="mb-2 space-y-0.5">
                                {b.result.skillEffects.map((effect, j) => (
                                  <p key={j} className="text-xs text-magic-blue text-center">{t(effectKey(effect.key), resolveEffectParams(effect))}</p>
                                ))}
                              </div>
                            )}

                            <p className={`text-sm font-bold text-center ${b.result.isDraw ? "text-gray-400" : "text-white"}`}>
                              {b.result.isDraw
                                ? t("simulation.drawBothSurvive")
                                : t("simulation.victory", { name: resolve(b.result.winner!).name })}
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
                      {t("simulation.eliminated", { names: latestRound.eliminated.map((e) => resolve(e).name).join(", ") })}
                    </p>
                  </div>
                )}

                {/* Tips */}
                <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5">{t("simulation.tips")}</p>
                  <ul className="text-[10px] text-gray-400 space-y-0.5 list-none pl-0">
                    <li>{t("simulation.tipHuntGuard").split(/<gray>|<\/gray>|<gray2>|<\/gray2>/).map((part, idx) => {
                      if (idx === 1) return <span key={idx} className="text-gray-400">{part}</span>;
                      if (idx === 3) return <span key={idx} className="text-gray-500">{part}</span>;
                      return <span key={idx}>{part}</span>;
                    })}</li>
                    <li>{t("simulation.tipPresenceConcealment").split(/<gray>|<\/gray>/).map((part, idx) => {
                      if (idx === 1) return <span key={idx} className="text-gray-400">{part}</span>;
                      return <span key={idx}>{part}</span>;
                    })}</li>
                    <li>{t("simulation.tipAntiMagic").split(/<gray>|<\/gray>/).map((part, idx) => {
                      if (idx === 1) return <span key={idx} className="text-gray-400">{part}</span>;
                      return <span key={idx}>{part}</span>;
                    })}</li>
                    <li>{t("simulation.tipToolMaking").split(/<gray>|<\/gray>/).map((part, idx) => {
                      if (idx === 1) return <span key={idx} className="text-gray-400">{part}</span>;
                      return <span key={idx}>{part}</span>;
                    })}</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* War Log */}
        {rounds.length > 1 && (
          <div className="w-full max-w-xl mb-6">
            <p className="text-sm text-gray-400 font-bold mb-3 text-center">{t("simulation.warLog", { days: rounds.length })}</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rounds.map((round) => (
                <div key={round.day} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-sm text-gold font-bold mb-1.5">{t("simulation.nightDay", { day: round.day })}</p>
                  {round.isQuiet ? (
                    <p className="text-sm text-gray-600">{t("simulation.nothingHappened")}</p>
                  ) : (
                    <div className="space-y-2">
                      {round.battles.map((b, i) => {
                        const aPct = Math.round(b.result.winProbabilityA * 100);
                        const bPct = 100 - aPct;
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                            <ServantFace servant={b.attacker} size={5} />
                            <span style={{ color: CLASS_COLORS[b.attacker.class] }}>{resolve(b.attacker).name}</span>
                            <span className="text-gray-600 text-xs">{aPct}%</span>
                            <span className="text-magic-red text-xs font-bold">vs</span>
                            <span style={{ color: CLASS_COLORS[b.defender.class] }}>{resolve(b.defender).name}</span>
                            <span className="text-gray-600 text-xs">{bPct}%</span>
                            <ServantFace servant={b.defender} size={5} />
                            <span className="text-white font-bold ml-1">
                              {b.result.isDraw
                                ? `→ ${t("simulation.draw")}`
                                : t("simulation.victory", { name: resolve(b.result.winner!).name })}
                            </span>
                          </div>
                        );
                      })}
                      {round.battles.some((b) => b.result.skillEffects.length > 0) && (
                        <div className="text-xs text-magic-blue">
                          {round.battles.flatMap((b) => b.result.skillEffects).map((e, j) => (
                            <span key={j}>{j > 0 && " / "}{t(effectKey(e.key), resolveEffectParams(e))}</span>
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
                  {t("simulation.grailObtained")}
                </h2>
                <p className="text-sm text-gray-400 mb-4 relative z-10">{t("simulation.congratsWish")}</p>
                <input
                  type="text"
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder={t("simulation.wishPlaceholder")}
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
                  {t("simulation.makeWish")}
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
                    {t("simulation.warVictory")}
                  </h2>
                  <p className="text-sm text-gray-400 mb-1">
                    {t("simulation.victoryMessage", { name: playerServant.name, class: playerServant.class, days: rounds.length })}
                  </p>
                  <div className="mt-4 p-3 rounded-lg bg-gold/5 border border-gold/20">
                    <p className="text-[10px] text-gray-500 mb-1">{t("simulation.wishInscribed")}</p>
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
                  {t("simulation.defeat")}
                </h2>
                <p className="text-sm text-gray-400">
                  {t("simulation.defeatMessage", { name: playerServant.name, class: playerServant.class, day: playerLostDay ?? "?" })}
                </p>
                {winner && (
                  <p className="text-sm text-gray-400 mt-1">
                    {t("simulation.warWinner")} <span className="text-gold font-bold">{resolve(winner).name}({winner.class})</span>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Watermark for captured image */}
        {showShareArea && (
          <p className="text-[10px] text-gray-700 text-center mb-2">{t("simulation.watermark")}</p>
        )}

      {/* Capturable area ends */}
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
            {t("simulation.saveImage")}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shareImage("x")}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
          >
            {t("simulation.shareTwitter")}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => shareImage("instagram")}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-600 bg-transparent text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
          >
            {t("simulation.shareInstagram")}
          </motion.button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 pb-12" style={{ marginTop: "1rem" }}>
        {!isFinished && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={advanceRound}
              className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("simulation.nextNight")}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={autoComplete}
              className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
            >
              {t("simulation.autoProgress")}
            </motion.button>
          </div>
        )}
        {isFinished && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={restart}
            className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {t("simulation.restart")}
          </motion.button>
        )}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
          >
            {t("simulation.backToDashboard")}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRankings}
            className="px-6 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
          >
            {t("simulation.rankings")}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
