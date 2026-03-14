import { motion } from "framer-motion";

interface Props {
  onStart: () => void;
}

export default function StartScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background magic circle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="animate-spin-slow w-[600px] h-[600px] 2xl:w-[800px] 2xl:h-[800px] opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#4a9eff" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#4a9eff" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="#4a9eff" strokeWidth="0.5" />
            <polygon
              points="100,15 122,72 185,72 133,108 152,168 100,135 48,168 67,108 15,72 78,72"
              fill="none"
              stroke="#4a9eff"
              strokeWidth="0.5"
            />
            <polygon points="100,30 160,140 40,140" fill="none" stroke="#ff4a4a" strokeWidth="0.3" />
            <polygon points="100,170 40,60 160,60" fill="none" stroke="#ff4a4a" strokeWidth="0.3" />
          </svg>
        </div>
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-magic-blue rounded-full"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
            opacity: 0,
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center z-10"
      >
        <h1
          className="text-6xl md:text-7xl 2xl:text-8xl font-bold mb-4 tracking-wider"
          style={{ fontFamily: "var(--font-serif)", color: "#ffd700" }}
        >
          HOLY GRAIL WAR
        </h1>
        <p className="text-xl 2xl:text-2xl text-gray-400 mb-2">성배전쟁 시뮬레이터</p>
        <p className="text-sm 2xl:text-base text-gray-600 mb-12">
          7기의 서번트가 소환됩니다. 당신의 서번트는 누구일까요?
        </p>
      </motion.div>

      {/* Start button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255, 215, 0, 0.4)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="z-10 px-12 2xl:px-16 py-4 2xl:py-5 text-xl 2xl:text-2xl font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer transition-all hover:bg-gold/10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        성배전쟁 참전
      </motion.button>

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 1.5 }}
        className="absolute bottom-12 w-1/2 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      {/* GitHub credit */}
      <a
        href="https://github.com/minhyungk/Heaven-s-Feel-Simulator"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 text-gray-700 hover:text-gray-400 text-xs transition-colors z-10"
      >
        GitHub
      </a>
    </div>
  );
}
