import { motion } from "framer-motion";
import type { GrailWarResult } from "../hooks/useGrailWar";
import ServantCard from "./ServantCard";

interface Props {
  war: GrailWarResult;
  onReroll: () => void;
  onHome: () => void;
}

export default function WarDashboard({ war, onReroll, onHome }: Props) {
  const enemies = war.participants.filter((s) => s.id !== war.playerServant.id);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1
          className="text-3xl md:text-4xl font-bold mb-2 text-gold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          제6차 성배전쟁
        </h1>
        <p className="text-gray-500 text-sm">7기의 서번트가 소환되었습니다</p>
      </motion.div>

      {/* My Servant */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-lg mb-8"
      >
        <h2 className="text-center text-sm text-gold/70 uppercase tracking-[0.2em] mb-3 font-bold">
          나의 서번트
        </h2>
        <ServantCard servant={war.playerServant} isPlayer />
      </motion.div>

      {/* Divider */}
      <div className="w-full max-w-lg mb-6">
        <div className="h-px bg-gradient-to-r from-transparent via-magic-red/30 to-transparent" />
        <p className="text-center text-xs text-magic-red/50 mt-2 uppercase tracking-[0.3em]">
          Enemy Servants
        </p>
      </div>

      {/* Enemy list */}
      <div className="w-full max-w-lg space-y-3 mb-8">
        {enemies.map((servant, i) => (
          <ServantCard key={servant.id} servant={servant} index={i} />
        ))}
      </div>

      {/* Caster note */}
      {war.participants.some((s) => s.class === "Caster") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="w-full max-w-lg mb-8 p-3 rounded-lg bg-white/5 border border-white/10 text-center"
        >
          <p className="text-xs text-gray-500">
            💡 <span className="text-gray-400">참고:</span> Caster 클래스는 Saber/Lancer/Archer의{" "}
            <span className="text-magic-blue">대마력</span> 클래스 스킬에 의해 마술 공격이 약화될 수 있습니다.
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pb-12">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReroll}
          className="px-8 py-3 text-sm font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer hover:bg-gold/10 transition-colors"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          다시 소환
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHome}
          className="px-8 py-3 text-sm font-bold rounded-lg border border-gray-700 bg-transparent text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
        >
          메인으로
        </motion.button>
      </div>
    </div>
  );
}
