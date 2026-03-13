import { motion } from "framer-motion";

export default function MagicCircle() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    >
      <div className="relative w-[500px] h-[500px] md:w-[600px] md:h-[600px]">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="95" fill="none" stroke="#4a9eff" strokeWidth="0.3" opacity="0.6" />
            <circle cx="100" cy="100" r="92" fill="none" stroke="#4a9eff" strokeWidth="0.5" opacity="0.4" />
            {/* Rune-like marks on outer ring */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x = 100 + 88 * Math.cos(angle);
              const y = 100 + 88 * Math.sin(angle);
              return (
                <circle key={i} cx={x} cy={y} r="1.5" fill="#4a9eff" opacity="0.6" />
              );
            })}
          </svg>
        </motion.div>

        {/* Inner pentagram */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <polygon
              points="100,15 122,72 185,72 133,108 152,168 100,135 48,168 67,108 15,72 78,72"
              fill="none"
              stroke="#ff4a4a"
              strokeWidth="0.6"
              opacity="0.5"
            />
          </svg>
        </motion.div>

        {/* Center glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="w-20 h-20 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(74,158,255,0.4) 0%, transparent 70%)",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
