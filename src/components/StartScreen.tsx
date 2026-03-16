import { useEffect } from "react";
import { motion } from "framer-motion";
import { APP_VERSION } from "../data/types";

interface Props {
  onStart: () => void;
  onCatalyst: () => void;
  onRankings: () => void;
}

export default function StartScreen({ onStart, onCatalyst, onRankings }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStart]);

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
        <p className="text-sm 2xl:text-base mb-12">고한다 </p>
        <p className="text-sm 2xl:text-base mb-12">그대의 몸은 나에게, 나의 운명은 그대의 검에</p>
        <p className="text-sm 2xl:text-base mb-12">성배의 인도에 따라 이 뜻, 이 이치에 따른다면 대답하라.</p>
        <p className="text-sm 2xl:text-base mb-12">맹세를 여기에 </p>
        <p className="text-sm 2xl:text-base mb-12">나는 온 세상 모든 선을 이루는 자,</p>
        <p className="text-sm 2xl:text-base mb-12">나는 온 세상 모든 악을 베푸는 자</p>
        <p className="text-sm 2xl:text-base mb-12">그대 삼대 언령을 두른 일곱 하늘</p>
        <p className="text-sm 2xl:text-base mb-12">억지의 윤회로부터 오라, 천칭의 수호자여</p>
      </motion.div> 

      {/* Buttons */}
      <div className="z-10 flex flex-col items-center gap-3" style={{ marginTop: "1rem" }}>
        <div className="flex gap-4">
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255, 215, 0, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="px-12 2xl:px-16 py-4 2xl:py-5 text-lg 2xl:text-2xl font-bold rounded-lg border-2 border-gold bg-transparent text-gold cursor-pointer transition-all hover:bg-gold/10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            성배전쟁 참전
          </motion.button>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(74, 158, 255, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onCatalyst}
            className="px-8 2xl:px-12 py-4 2xl:py-5 text-lg 2xl:text-xl font-bold rounded-lg border border-magic-blue bg-transparent text-magic-blue cursor-pointer transition-all hover:bg-magic-blue/10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            촉매소환
          </motion.button>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRankings}
          className="px-12 py-3 text-lg font-bold rounded-lg border border-gray-600 bg-transparent text-gray-400 cursor-pointer transition-all hover:border-gray-400 hover:text-gray-200"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          랭킹
        </motion.button>
      </div>

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 1.5 }}
        className="absolute bottom-12 w-1/2 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      {/* Copyright disclaimer */}
      <div className="absolute bottom-5 left-0 right-0 text-center text-[15px] text-gray-700 z-10 px-4">
        This is a non-profit fan project. All rights to 'Fate' series and related assets belong to TYPE-MOON / FGO PROJECT.
      </div>

      {/* Version + GitHub credit */}
      <div className="absolute bottom-4 right-4 text-gray-700 text-xs z-10 flex items-center gap-2">
        <span>{APP_VERSION}</span>
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
