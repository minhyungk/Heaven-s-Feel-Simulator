import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GrailWarResult } from "../hooks/useGrailWar";
import type { Servant } from "../data/types";
import { getServantTotalScore, calcWinRate, CLASS_COLORS } from "../data/types";
import ServantCard from "./ServantCard";

interface Props {
  war: GrailWarResult;
  onReroll: () => void;
  onCatalyst: () => void;
  onHome: () => void;
  onStartSimulation: () => void;
}

function WinRateBar({ servant, enemyScore, winRate, index }: { servant: Servant; enemyScore: number; winRate: number; index: number }) {
  const pct = Math.round(winRate * 100);
  const classColor = CLASS_COLORS[servant.class];
  const isAdvantage = pct >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-3"
    >
      {/* Face */}
      <div
        className="w-10 h-10 rounded-full overflow-hidden shrink-0 border"
        style={{ borderColor: classColor }}
      >
        {servant.imageUrl ? (
          <img src={servant.imageUrl} alt={servant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: `${classColor}20` }}>⚔</div>
        )}
      </div>

      {/* Info + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-300 truncate">
            <span className="text-magic-red font-bold mr-1">vs</span>
            {servant.name}
            <span className="text-gray-600 font-mono ml-1">({enemyScore.toFixed(1)})</span>
          </span>
          <span
            className="text-xs font-bold font-mono ml-2 shrink-0"
            style={{ color: isAdvantage ? "#4ade80" : "#f87171" }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: "easeOut" }}
            style={{
              background: isAdvantage
                ? `linear-gradient(90deg, #4ade80, ${classColor})`
                : `linear-gradient(90deg, #f87171, ${classColor})`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function WarDashboard({ war, onReroll, onCatalyst, onHome, onStartSimulation }: Props) {
  useEffect(() => {                                                                                                                                                                                                                                                                         
  const handler = (e: KeyboardEvent) => {                                                                                                                                                                                                                                                 
    if (e.key === "Enter") onReroll();                                                                                                                                                                                                                                                    
    };                                                                                                                                                                                                                                                                                      
    window.addEventListener("keydown", handler);                                                                                                                                                                                                                                            
    return () => window.removeEventListener("keydown", handler);                                                                                                                                                                                                                            
  }, [onReroll]);
  const [showWinRate, setShowWinRate] = useState(false);
  const enemies = war.participants.filter((s) => s.id !== war.playerServant.id);

  const myScore = getServantTotalScore(war.playerServant);
  const enemyScores = enemies.map((e) => getServantTotalScore(e));
  const individualWinRates = enemyScores.map((es) => calcWinRate(myScore, es));
  const enemyWinRates = enemies.map((enemy, i) => ({
    servant: enemy,
    score: enemyScores[i],
    winRate: individualWinRates[i],
  }));

  // 최종 우승 확률: 지수 기반 공정 배분
  // K값이 높을수록 강자의 우승 확률이 지배적
  const K = 0.5;
  const allScores = [myScore, ...enemyScores];
  const powerScores = allScores.map((s) => Math.exp(K * s));
  const totalPower = powerScores.reduce((a, b) => a + b, 0);
  const overallWinRate = powerScores[0] / totalPower;

  return (
    <div className="min-h-screen flex flex-col items-center px-4" style={{ paddingTop: "2rem" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1
          className="text-3xl md:text-4xl 2xl:text-5xl font-bold mb-2 text-gold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          제6차 성배전쟁
        </h1>
        <p className="text-gray-500 text-sm 2xl:text-base">7기의 서번트가 소환되었습니다</p>
        {war.hasExtraInvasion && war.extraServant && (
          <p className="text-sm mt-2 font-bold" style={{ color: "#9333ea" }}>
            ⚠ 성배 오류 — {war.extraServant.name}({war.extraServant.class}) 난입
          </p>
        )}
      </motion.div>

      {/* My Servant */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xl 2xl:max-w-2xl mb-8 2xl:mb-10"
      >
        <h2 className="text-center text-sm 2xl:text-base text-gold/70 uppercase tracking-[0.2em] mb-3 font-bold">
          MY SERVANT
        </h2>
        <ServantCard servant={war.playerServant} isPlayer />
      </motion.div>

      {/* Divider */}
      <div className="w-full max-w-xl 2xl:max-w-2xl mb-6 2xl:mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-magic-red/30 to-transparent" />
        <p className="text-center text-xs 2xl:text-sm text-magic-red/50 mt-2 uppercase tracking-[0.3em]">
          Enemy Servants
        </p>
      </div>

      {/* Enemy list */}
      <div className="w-full max-w-xl 2xl:max-w-2xl enemy-list-container mb-8 2xl:mb-10">
        {enemies.map((servant, i) => (
          <ServantCard key={servant.id} servant={servant} index={i} />
        ))}
      </div>

      {/* Win Rate Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowWinRate(!showWinRate)}
        className="px-8 py-3 text-sm font-bold rounded-lg border border-magic-blue bg-transparent text-magic-blue cursor-pointer hover:bg-magic-blue/10 transition-colors"
        style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}
      >
        {showWinRate ? "승률 닫기" : "승률 계산"}
      </motion.button>

      {/* Win Rate Panel */}
      <AnimatePresence>
        {showWinRate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl 2xl:max-w-2xl mb-8 overflow-hidden"
          >
            <div className="rounded-xl p-5 space-y-4" style={{ background: "#0d0d24", border: "1px solid #4a9eff22" }}>
              {/* Header */}
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">예측 승률</p>
                <p className="text-[10px] text-gray-600">스탯 합산 기반 Elo 승률 (E=3 ~ EX=8, +=+0.5)</p>
                <p className="text-[10px] text-gray-600">EX는 측정불가를 의미하나 계산 편의상 8점으로 책정돼 오류가 있을 수 있음</p>
              </div>

              {/* My score */}
              <div className="text-center mb-4 p-3 rounded-lg bg-white/5">
                <span className="text-xs text-gray-500">내 서번트 스탯 합계: </span>
                <span className="text-sm font-bold text-gold font-mono">{myScore.toFixed(1)}</span>
              </div>

              {/* Per-enemy win rates */}
              <div className="space-y-3">
                {enemyWinRates.map(({ servant, score, winRate }, i) => (
                  <WinRateBar key={servant.id} servant={servant} enemyScore={score} winRate={winRate} index={i} />
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10 my-4" />

              {/* Overall */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">성배전쟁 우승 확률 (전원 격파)</p>
                <p
                  className="text-2xl font-bold font-mono"
                  style={{ color: overallWinRate > 0.1 ? "#4ade80" : overallWinRate > 0.03 ? "#facc15" : "#f87171" }}
                >
                  {(overallWinRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caster note */}
      {war.participants.some((s) => s.class === "Caster") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="w-full max-w-xl 2xl:max-w-2xl mb-8 p-3 rounded-lg bg-white/5 border border-white/10 text-center"
        >
          <p className="text-xs 2xl:text-sm text-gray-500">
            💡 <span className="text-gray-400">참고:</span> Caster 클래스는 Saber/Lancer/Archer의{" "}
            <span className="text-magic-blue">대마력</span> 클래스 스킬에 의해 마술 공격이 약화될 수 있습니다.
          </p>
        </motion.div>
      )}

      {/* Start Simulation */}
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 74, 74, 0.3)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartSimulation}
        className="px-10 py-3 text-sm font-bold rounded-lg border-2 border-magic-red bg-transparent text-magic-red cursor-pointer hover:bg-magic-red/10 transition-colors"
        style={{ fontFamily: "var(--font-serif)", marginTop: "1rem", marginBottom: "1.5rem" }}
      >
        전쟁 시작
      </motion.button>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 pb-24" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReroll}
            className="px-8 2xl:px-10 py-3 2xl:py-4 text-sm 2xl:text-base font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            다시 소환
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCatalyst}
            className="px-8 2xl:px-10 py-3 2xl:py-4 text-sm 2xl:text-base font-bold rounded-lg border border-magic-blue bg-transparent text-magic-blue cursor-pointer hover:bg-magic-blue/10 transition-colors"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            촉매소환
          </motion.button>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHome}
          className="px-8 2xl:px-10 py-3 2xl:py-4 text-sm 2xl:text-base font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
        >
          메인으로
        </motion.button>
      </div>

      {/* Version + GitHub credit */}
      <div className="fixed bottom-4 right-4 text-gray-700 text-xs flex items-center gap-2">
        <span>v0.2 beta</span>
        <span className="text-gray-800">|</span>
        <a
          href="https://github.com/minhyungk/Heaven-s-Feel-Simulator"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400 transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
