import { useEffect, useRef } from "react";
import { W, H } from "@/utils/constants.js";

export function useInputs(canvasRef) {
  const keysRef  = useRef({});
  const mouseRef = useRef({ x: W / 2, y: H / 2 });

  // Keyboard
  useEffect(() => {
    const PREVENT = [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const dn = (e) => {
      if (!keysRef.current[e.key]) keysRef.current[e.key] = 1; // 1 = just pressed
      if (PREVENT.includes(e.key)) e.preventDefault();
    };
    const up = (e) => { delete keysRef.current[e.key]; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // Promote "just pressed" keys to "held" each frame tick
  useEffect(() => {
    const id = setInterval(() => {
      for (const k in keysRef.current) {
        if (keysRef.current[k] === 1) keysRef.current[k] = true;
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  // Mouse position relative to canvas
  useEffect(() => {
    const mm = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", mm);
    return () => window.removeEventListener("mousemove", mm);
  }, []);

  return { keysRef, mouseRef };
}