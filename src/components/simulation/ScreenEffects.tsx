import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ScreenEffectsHandle {
  shake: () => void;
  flash: (color?: string) => void;
  dim: (duration?: number) => void;
}

const ScreenEffects = forwardRef<ScreenEffectsHandle>((_props, ref) => {
  const [shaking, setShaking] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [dimming, setDimming] = useState(false);

  const shake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  const flash = useCallback((color: string = "#ffd700") => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 300);
  }, []);

  const dim = useCallback((duration: number = 500) => {
    setDimming(true);
    setTimeout(() => setDimming(false), duration);
  }, []);

  useImperativeHandle(ref, () => ({ shake, flash, dim }));

  return (
    <>
      {/* Shake overlay - applies transform to parent via CSS */}
      {shaking && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9999]"
          animate={{
            x: [0, -3, 3, -2, 2, 0],
            y: [0, 2, -2, 1, -1, 0],
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ background: flashColor }}
          />
        )}
      </AnimatePresence>

      {/* Dim overlay */}
      <AnimatePresence>
        {dimming && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[9997]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: "#000" }}
          />
        )}
      </AnimatePresence>
    </>
  );
});

ScreenEffects.displayName = "ScreenEffects";

export default ScreenEffects;
