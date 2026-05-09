import { W, H, TILE, COLORS } from "@/utils/constants.js";
import { dist, lighten, darken, hexAlpha, rand } from "../utils/math.js";
import { getSkillDef } from "../data/skills.js";

const ROOM_BG_COLORS = [
  ["#03020c", "#0d001a"], // Void Purple/Black
  ["#050014", "#12001f"], // Deep Amethyst
  ["#020c0a", "#051f15"], // Cyber Green
  ["#0a0202", "#220505"], // Crimson Boss Tier
  ["#020814", "#051329"], // Deep Ocean Abyss
];

export function render(ctx, gs) {
  const p  = gs.player;
  const f  = gs.frame;

  ctx.save();
  ctx.translate(gs.sx || 0, gs.sy || 0);

  const roomTier = Math.floor((gs.room - 1) / 10);
  const [bg1, bg2] = ROOM_BG_COLORS[roomTier % ROOM_BG_COLORS.length];

  // ── Background & Grid ───────────────────────────────────────────────────
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  bgGrd.addColorStop(0, bg1); bgGrd.addColorStop(1, bg2);
  ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(40, 30, 90, 0.15)"; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── Walls & Arena Bounds ────────────────────────────────────────────────
  const wallGrd = ctx.createLinearGradient(0, 0, TILE, 0);
  wallGrd.addColorStop(0, "#050010"); wallGrd.addColorStop(1, "#0d0a21");
  ctx.fillStyle = wallGrd;
  ctx.fillRect(0, 0, W, TILE); ctx.fillRect(0, H - TILE, W, TILE);
  ctx.fillRect(0, 0, TILE, H); ctx.fillRect(W - TILE, 0, TILE, H);
  
  ctx.strokeStyle = "#4a148c"; ctx.lineWidth = 2;
  ctx.strokeRect(TILE, TILE, W - TILE * 2, H - TILE * 2);

  // Corner runes
  ctx.fillStyle = "#a1a1c1"; ctx.font = "12px monospace"; ctx.textAlign = "center";
  [[TILE / 2, TILE / 2], [W - TILE / 2, TILE / 2], [TILE / 2, H - TILE / 2], [W - TILE / 2, H - TILE / 2]].forEach(([rx, ry]) => ctx.fillText("✦", rx, ry + 5));
  ctx.textAlign = "left";

  // ── Obstacles ─────────────────────────────────────────────────────────
  for (const obs of gs.obstacles) {
    const og = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.h);
    og.addColorStop(0, "#12002b"); og.addColorStop(1, "#070014");
    ctx.fillStyle = og; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = "#ab47bc"; ctx.lineWidth = 1.5; ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
  }

  // ── Earthquake overlay ─────────────────────────────────────────────────
  if (gs.earthquakeTimer > 0) {
    const pct = gs.earthquakeTimer / 60;
    ctx.fillStyle = `rgba(255, 40, 0, ${pct * 0.15})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255, 100, 0, ${pct * 0.6})`; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const cx = W * 0.5 + Math.sin(f * 0.3 + i) * 40, cy = H * 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + rand(-80, 80), cy + rand(-60, 60)); ctx.stroke();
    }
  }

  // ── Portals / Doors ──────────────────────────────────────────────────────
  const door = gs.door;
  if (gs.doorOpen) {
    const pulse = Math.sin(f * 0.08) * 4;
    const dg = ctx.createRadialGradient(door.x, door.y, 0, door.x, door.y, door.r * 3 + pulse);
    dg.addColorStop(0, "rgba(0, 229, 255, 0.8)"); dg.addColorStop(1, "transparent");
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(door.x, door.y, door.r * 3 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(door.x, door.y, door.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  // ── Trails & Particles ──────────────────────────────────────────────────
  for (const t of gs.trails) {
    ctx.globalAlpha = t.life / 14 * 0.45; ctx.fillStyle = t.col;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const pt of gs.particles) {
    ctx.globalAlpha = Math.min(1, pt.life / 20); ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Shrines ────────────────────────────────────────────────────────────
  if (gs.shrines && gs.shrines.length > 0 && !gs.shrineActivated) {
    for (const sh of gs.shrines) {
      if (sh.used) continue;
      const pulse = Math.sin(f * 0.09) * 6;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.1 + Math.abs(pulse) * 0.02})`;
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 50 + pulse, 0, Math.PI * 2); ctx.fill();
      
      ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 15;
      ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(sh.x, sh.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ── Enemies (Geometric Evolution) ──────────────────────────────────────
  for (const e of gs.enemies) {
    if (e.invisible && e.invisTimer > 20) {
      ctx.globalAlpha = 0.15; ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; continue;
    }

    const flash = e.hurtFlash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(p.y - e.y, p.x - e.x)); // Aim shapes at player

    if (e.elite) { ctx.shadowColor = "#ff6f00"; ctx.shadowBlur = 20; }
    if (e.boss) { ctx.shadowColor = e.col; ctx.shadowBlur = 30; }

    ctx.fillStyle = flash ? "#fff" : e.col;
    ctx.strokeStyle = flash ? "#ffbbbb" : darken(e.col, 30);
    ctx.lineWidth = 2;

    // Distinct shapes per AI type
    ctx.beginPath();
    if (e.aiType === "archer") {
      ctx.moveTo(e.r * 1.3, 0); ctx.lineTo(0, e.r); ctx.lineTo(-e.r, 0); ctx.lineTo(0, -e.r);
    } else if (e.aiType === "berserker") {
      ctx.moveTo(e.r * 1.5, 0); ctx.lineTo(-e.r, e.r * 0.8); ctx.lineTo(-e.r * 0.4, 0); ctx.lineTo(-e.r, -e.r * 0.8);
    } else if (e.aiType === "charger") {
      ctx.moveTo(e.r * 1.4, 0); ctx.lineTo(-e.r, e.r * 0.5); ctx.lineTo(-e.r, -e.r * 0.5);
    } else if (e.boss) {
      // Octagram for Bosses
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
        const a2 = ((i + 0.5) / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a2) * (e.r * 0.6), Math.sin(a2) * (e.r * 0.6));
      }
    } else {
      ctx.arc(0, 0, e.r, 0, Math.PI * 2); // Fallback standard circle
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // HP Bar
    const bw = e.r * 2.5, bx = e.x - bw / 2, by = e.y - e.r - 12;
    const hpPct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#050010"; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = hpPct > 0.5 ? "#00e676" : "#ff1744";
    ctx.fillRect(bx, by, bw * hpPct, 5);
  }

  // ── Player ─────────────────────────────────────────────────────────────
  if (p.invuln === 0 || f % 5 < 3) {
    ctx.save();
    ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 15;
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    pg.addColorStop(0, "#fff"); pg.addColorStop(1, "#00b0ff");
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Direction dot
    const fx = p.facing.x || 1, fy = p.facing.y || 0, m = Math.hypot(fx, fy) || 1;
    ctx.fillStyle = "#03020c"; ctx.beginPath(); ctx.arc(p.x + (fx / m) * p.r * 0.6, p.y + (fy / m) * p.r * 0.6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Projectiles ─────────────────────────────────────────────────────────
  for (const pr of gs.projectiles) {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}