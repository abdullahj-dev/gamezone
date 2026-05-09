import { useEffect, useRef } from "react";
import { W, H, TILE } from "@/utils/constants.js";
import { clamp, dist, rand, randInt } from "@/utils/math.js";
import { runCombat } from "@/systems/combat.js";
import { updateEnemyAI } from "@/systems/ai.js";
import { render } from "@/systems/renderer.js";
import { getSkillDef, SKILLS, pickLevelUpChoices } from "@/data/skills.js";

export function useGameLoop({
  canvasRef, gsRef, overlayRef, keysRef, mouseRef, screen,
  onNextRoom, onLevelUp, onDeath, onShrineReached, setUi,
  hooks // Passed in purely
}) {
  const rafRef = useRef(null);
  const uiTickRef = useRef(0);

  useEffect(() => {
    // Stop the loop and don't start a new one if not playing
    if (screen !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;

      // Safety check: If gameState or overlay isn't ready, just request next frame
      if (!gs || (overlayRef.current !== "playing" && overlayRef.current !== null)) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      gs.frame++;
      const p = gs.player;
      const k = keysRef.current;

      // ── Player movement ────────────────────────────────────────────────────
      let dx = 0, dy = 0;
      if (k["a"] || k["ArrowLeft"]) dx -= 1;
      if (k["d"] || k["ArrowRight"]) dx += 1;
      if (k["w"] || k["ArrowUp"]) dy -= 1;
      if (k["s"] || k["ArrowDown"]) dy += 1;

      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      if (dx || dy) p.facing = { x: dx, y: dy };

      p.vx = dx; p.vy = dy;
      p.x = clamp(p.x + dx * p.spd, p.r + TILE + 1, W - p.r - TILE - 1);
      p.y = clamp(p.y + dy * p.spd, p.r + TILE + 1, H - p.r - TILE - 1);

      // ── Obstacle collisions ────────────────────────────────────────────────
      for (const obs of gs.obstacles) {
        if (p.x + p.r > obs.x && p.x - p.r < obs.x + obs.w &&
          p.y + p.r > obs.y && p.y - p.r < obs.y + obs.h) {
          const ol = p.x + p.r - obs.x, or_ = obs.x + obs.w - (p.x - p.r);
          const ot = p.y + p.r - obs.y, ob_ = obs.y + obs.h - (p.y - p.r);
          const mn = Math.min(ol, or_, ot, ob_);
          if (mn === ol) p.x -= ol;
          else if (mn === or_) p.x += or_;
          else if (mn === ot) p.y -= ot;
          else p.y += ob_;
        }
      }

      // ── Combat ─────────────────────────────────────────────────────────────
      // Hooks passed directly without any gameId wrapper nonsense
      runCombat(gs, k, mouseRef.current, hooks);

      // ── Enemy AI ──────────────────────────────────────────────────────────
      gs.enemies = gs.enemies.filter(e => e.hp > 0);
      for (const e of gs.enemies) {
        if (e.hurtFlash > 0) e.hurtFlash--;
        updateEnemyAI(e, gs);
      }

      // ── Particles / trails / texts ─────────────────────────────────────────
      gs.particles = gs.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.92; pt.vy *= 0.92; pt.life--; return pt.life > 0; });
      gs.trails = gs.trails.filter(t => { t.life--; return t.life > 0; });
      gs.floatingTexts = gs.floatingTexts.filter(ft => { ft.y -= 0.72; ft.life--; return ft.life > 0; });

      // ── Shrine proximity check ─────────────────────────────────────────────
      if (gs.shrines?.length && !gs.shrineActivated) {
        for (const shrine of gs.shrines) {
          if (!shrine.used && dist(p, shrine) < 42) {
            gs.shrineActivated = true;
            gs.shrines.forEach(s => s.used = true);
            const passives = SKILLS.filter(s => s.type !== "active" && !p.unlockedSkills.includes(s.id));
            const ch = passives.sort(() => Math.random() - 0.5).slice(0, 3);
            onShrineReached(ch.map(s => s.id));
            break;
          }
        }
      }

      // ── Door ──────────────────────────────────────────────────────────────
      const shrineBlocking = gs.roomEvent === "shrine" && !gs.shrineActivated;
      if (!gs.doorOpen && gs.enemies.length === 0 && !shrineBlocking) {
        gs.doorOpen = true;
        for (let i = 0; i < 28; i++) {
          const a = Math.random() * Math.PI * 2;
          gs.particles.push({ x: gs.door.x, y: gs.door.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, color: "#00e5ff", r: rand(2, 5), life: randInt(20, 38) });
        }
      }
      if (gs.doorOpen && dist(p, gs.door) < p.r + gs.door.r + 8) onNextRoom();

      // ── Screen shake / Earthquake ─────────────────────────────────────────
      if (gs.earthquakeTimer > 0) gs.earthquakeTimer--;
      gs.shake *= 0.8;
      if (gs.shake > 0.5) { gs.sx = (Math.random() - 0.5) * gs.shake; gs.sy = (Math.random() - 0.5) * gs.shake; }
      else { gs.sx = 0; gs.sy = 0; gs.shake = 0; }

      // ── Render ────────────────────────────────────────────────────────────
      render(ctx, gs);

      // ── UI sync (throttled) ───────────────────────────────────────────────
      if (++uiTickRef.current % 4 === 0) {
        setUi({
          hp: p.hp, maxHp: p.maxHp,
          xp: p.xp, xpNeeded: p.xpNeeded, level: p.level,
          room: gs.room, enemies: gs.enemies.length, kills: gs.totalKills,
          equippedSkills: [...p.equippedSkills],
          passives: p.unlockedSkills.filter(id => {
            const d = getSkillDef(id);
            return d && d.type !== "active" && !["vitality", "sharpen", "ironSkin", "swiftness"].includes(id);
          }),
          skillCds: { ...p.skillCds },
          revives: p.revivesAvailable,
          shards: p.shards || 0,
          mode: gs.mode,
        });
      }

      // ── Events ────────────────────────────────────────────────────────────
      if (gs._pendingLevelUp) {
        gs._pendingLevelUp = false;
        const ch = pickLevelUpChoices([...p.equippedSkills, ...p.unlockedSkills]);
        onLevelUp(ch.map(s => s.id));
      }
      if (gs._pendingDeath) {
        gs._pendingDeath = false;
        onDeath({ room: gs.room, level: p.level, kills: gs.totalKills, shards: p.shards || 0 });
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // Start the loop
    rafRef.current = requestAnimationFrame(loop);

    // Cleanup function to stop loop when component unmounts
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, hooks, canvasRef, gsRef, keysRef, mouseRef, onDeath, onLevelUp, onNextRoom, onShrineReached, overlayRef, setUi]);

  return null;
}