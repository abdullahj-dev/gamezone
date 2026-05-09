'use client';
import React, { useState, useEffect, useRef, useReducer } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  ARTBOARD PRO  ·  World-Class Browser Painting Application
//  Brushes, Shapes, Layers UI, History, Import/Export, Text, Fill, Mirror
// ═══════════════════════════════════════════════════════════════════════════

const CW = 1400, CH = 820, MAX_HIST = 60;

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:'#07070f', panel:'#0c0c1a', surface:'#121225', surfaceHover:'#181830',
  border:'#1e1e38', accent:'#6d28d9', bright:'#a78bfa', text:'#dde0f5',
  muted:'#5a5a80', danger:'#ef4444', success:'#22c55e', warn:'#f59e0b',
};

// ── Palettes ─────────────────────────────────────────────────────────────────
const PALETTE = [
  '#ffffff','#e2e2e2','#b4b4b4','#808080','#404040','#000000',
  '#ef4444','#f97316','#eab308','#84cc16','#22c55e','#10b981',
  '#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899',
  '#fca5a5','#fdba74','#fde68a','#86efac','#67e8f9','#93c5fd',
  '#c4b5fd','#f5d0fe','#8b4513','#d2691e','#1e3a5f','#14532d',
];

// ── Brushes & Shapes ─────────────────────────────────────────────────────────
const BRUSHES = [
  {id:'pencil',    icon:'✎',  name:'Pencil'},
  {id:'pen',       icon:'🖊', name:'Ink Pen'},
  {id:'marker',    icon:'▮',  name:'Marker'},
  {id:'spray',     icon:'∴',  name:'Spray'},
  {id:'airbrush',  icon:'◌',  name:'Airbrush'},
  {id:'chalk',     icon:'∼',  name:'Chalk'},
  {id:'charcoal',  icon:'▓',  name:'Charcoal'},
  {id:'watercolor',icon:'≋',  name:'Watercolor'},
  {id:'pixel',     icon:'▪',  name:'Pixel'},
  {id:'calligraphy',icon:'✒', name:'Calligraphy'},
  {id:'glitter',   icon:'✦',  name:'Glitter'},
  {id:'eraser',    icon:'◻',  name:'Eraser'},
];

const SHAPES = [
  {id:'line',      icon:'╱',  name:'Line'},
  {id:'rect',      icon:'▭',  name:'Rectangle'},
  {id:'oval',      icon:'⬭',  name:'Oval'},
  {id:'triangle',  icon:'△',  name:'Triangle'},
  {id:'rtriangle', icon:'◺',  name:'Right △'},
  {id:'star5',     icon:'★',  name:'Star 5pt'},
  {id:'star6',     icon:'✡',  name:'Star 6pt'},
  {id:'star8',     icon:'✴',  name:'Star 8pt'},
  {id:'arrow',     icon:'→',  name:'Arrow'},
  {id:'dbarrow',   icon:'↔',  name:'Dbl Arrow'},
  {id:'heart',     icon:'♥',  name:'Heart'},
  {id:'diamond',   icon:'◇',  name:'Diamond'},
  {id:'pentagon',  icon:'⬠',  name:'Pentagon'},
  {id:'hexagon',   icon:'⬡',  name:'Hexagon'},
  {id:'octagon',   icon:'⏣',  name:'Octagon'},
  {id:'speech',    icon:'💬', name:'Speech'},
];

// ── Geometry Helpers ──────────────────────────────────────────────────────────
function starPath(ctx, cx, cy, R, r, n) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI / n) - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function polyPath(ctx, cx, cy, R, n) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function heartPath(ctx, x1, y1, x2, y2) {
  const lx=Math.min(x1,x2), rx=Math.max(x1,x2), ty=Math.min(y1,y2), by=Math.max(y1,y2);
  const mx=(lx+rx)/2, w=rx-lx, h=by-ty;
  ctx.beginPath();
  ctx.moveTo(mx, by);
  ctx.bezierCurveTo(lx+w*0.1, ty+h*0.7, lx, ty+h*0.38, lx, ty+h*0.22);
  ctx.bezierCurveTo(lx, ty, lx+w*0.22, ty, mx, ty+h*0.16);
  ctx.bezierCurveTo(rx-w*0.22, ty, rx, ty, rx, ty+h*0.22);
  ctx.bezierCurveTo(rx, ty+h*0.38, rx-w*0.1, ty+h*0.7, mx, by);
  ctx.closePath();
}

function speechPath(ctx, x1, y1, x2, y2) {
  if (x2 < x1) [x1,x2]=[x2,x1]; if (y2 < y1) [y1,y2]=[y2,y1];
  const w=x2-x1, h=y2-y1, r=Math.min(14,w*0.08,h*0.1), th=h*0.3, tw=w*0.1;
  const bh = h - th;
  ctx.beginPath();
  ctx.moveTo(x1+r, y1);
  ctx.lineTo(x2-r, y1); ctx.arcTo(x2,y1,x2,y1+r,r);
  ctx.lineTo(x2, y1+bh-r); ctx.arcTo(x2,y1+bh,x2-r,y1+bh,r);
  ctx.lineTo(x1+tw*2.5, y1+bh);
  ctx.lineTo(x1+tw*1.5, y2);
  ctx.lineTo(x1+tw*0.8, y1+bh);
  ctx.lineTo(x1+r, y1+bh); ctx.arcTo(x1,y1+bh,x1,y1+bh-r,r);
  ctx.lineTo(x1, y1+r); ctx.arcTo(x1,y1,x1+r,y1,r);
  ctx.closePath();
}

function hex2rgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function rgba(hex, a) {
  const [r,g,b]=hex2rgb(hex); return `rgba(${r},${g},${b},${a})`;
}
function rgb2hex(r,g,b) {
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ArtboardPro() {
  const canvasRef  = useRef(null);
  const [, tick]   = useReducer(n=>n+1, 0);

  // ── Tool State ─────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState('brush');
  const [brushType,  setBrushType]  = useState('pencil');
  const [shapeType,  setShapeType]  = useState('rect');
  const [fillShapes, setFillShapes] = useState(false);
  const [strokeShape,setStrokeShape]= useState(true);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [stabilize,  setStabilize]  = useState(false);

  // ── Style State ────────────────────────────────────────────────────────────
  const [color,    setColor]    = useState('#e2e8f0');
  const [brushSz,  setBrushSz]  = useState(8);
  const [opacity,  setOpacity]  = useState(1);
  const [recentClr,setRecentClr]= useState(['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899']);

  // ── Text State ─────────────────────────────────────────────────────────────
  const [textVal,   setTextVal]   = useState('');
  const [textSize,  setTextSize]  = useState(28);
  const [textBold,  setTextBold]  = useState(false);
  const [textItalic,setTextItalic]= useState(false);

  // ── Canvas/View State ──────────────────────────────────────────────────────
  const [zoom,       setZoom]       = useState(1);
  const [bgColor,    setBgColor]    = useState('#18181b');
  const [gridVisible,setGridVisible]= useState(false);
  const [clientPos,  setClientPos]  = useState({x:0,y:0});
  const [canvasPos,  setCanvasPos]  = useState({x:0,y:0});

  // ── Layer UI (cosmetic — all drawing is on main canvas) ───────────────────
  const [layers, setLayers]       = useState([{id:1,name:'Background',visible:true,locked:false}]);
  const [activeLayer, setActiveLayer] = useState(1);
  const layerCtr = useRef(2);

  // ── Drawing Refs ───────────────────────────────────────────────────────────
  const drawing   = useRef(false);
  const lastPt    = useRef({x:0,y:0});
  const startPt   = useRef({x:0,y:0});
  const snapRef   = useRef(null);
  const sprayTmr  = useRef(null);
  const ptBuf     = useRef([]);  // stabilizer buffer

  // ── History Refs ───────────────────────────────────────────────────────────
  const histArr   = useRef([]);
  const histIdx   = useRef(-1);

  // ── Live refs for drawing functions (avoid stale closures) ────────────────
  const brushTypeR = useRef(brushType);
  const colorR     = useRef(color);
  const brushSzR   = useRef(brushSz);
  const opacityR   = useRef(opacity);
  const mirrorR    = useRef(mirrorMode);
  const stabilizeR = useRef(stabilize);

  useEffect(()=>{ brushTypeR.current=brushType; },[brushType]);
  useEffect(()=>{ colorR.current=color; },[color]);
  useEffect(()=>{ brushSzR.current=brushSz; },[brushSz]);
  useEffect(()=>{ opacityR.current=opacity; },[opacity]);
  useEffect(()=>{ mirrorR.current=mirrorMode; },[mirrorMode]);
  useEffect(()=>{ stabilizeR.current=stabilize; },[stabilize]);

  // ── INIT ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const c = canvasRef.current;
    c.width = CW; c.height = CH;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,CW,CH);
    pushHistory();
    // Prevent right-click context menu on canvas
    c.addEventListener('contextmenu', e=>e.preventDefault());
  }, []);

  // ── HISTORY ────────────────────────────────────────────────────────────────
  const pushHistory = () => {
    const ctx = canvasRef.current.getContext('2d');
    const data = ctx.getImageData(0,0,CW,CH);
    histArr.current = histArr.current.slice(0, histIdx.current+1);
    histArr.current.push(data);
    if (histArr.current.length > MAX_HIST) histArr.current.shift();
    else histIdx.current++;
    tick();
  };
  const undo = () => {
    if (histIdx.current <= 0) return;
    histIdx.current--;
    canvasRef.current.getContext('2d').putImageData(histArr.current[histIdx.current],0,0);
    tick();
  };
  const redo = () => {
    if (histIdx.current >= histArr.current.length-1) return;
    histIdx.current++;
    canvasRef.current.getContext('2d').putImageData(histArr.current[histIdx.current],0,0);
    tick();
  };

  // ── COORDINATE MAPPING ─────────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx-rect.left) * (CW/rect.width),
      y: (cy-rect.top)  * (CH/rect.height),
    };
  };
  const getStabilizedPos = (pos) => {
    if (!stabilizeR.current) return pos;
    ptBuf.current.push(pos);
    if (ptBuf.current.length > 8) ptBuf.current.shift();
    const avg = {x:0,y:0};
    ptBuf.current.forEach(p=>{avg.x+=p.x;avg.y+=p.y;});
    return {x:avg.x/ptBuf.current.length, y:avg.y/ptBuf.current.length};
  };

  // ── BRUSH STROKE ENGINE ───────────────────────────────────────────────────
  const strokeBrush = (ctx, from, to, bt, clr, sz, op) => {
    ctx.save();

    if (bt === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = sz * 1.8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
      ctx.restore(); return;
    }

    switch (bt) {
      case 'pencil':
        ctx.globalAlpha = op;
        ctx.strokeStyle = clr;
        ctx.lineWidth = sz * 0.55;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
        break;

      case 'pen':
        ctx.globalAlpha = Math.min(1, op * 1.15);
        ctx.strokeStyle = clr;
        ctx.lineWidth = sz * 0.65;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = clr; ctx.shadowBlur = 1.5;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
        break;

      case 'marker': {
        ctx.globalAlpha = op * 0.55;
        ctx.strokeStyle = clr;
        ctx.lineWidth = sz * 2.2;
        ctx.lineCap = 'square'; ctx.lineJoin = 'bevel';
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
        break;
      }

      case 'spray': {
        const n = Math.ceil(sz * 2.5), r = sz * 2;
        for (let i=0;i<n;i++){
          const a = Math.random()*Math.PI*2, d = Math.random()*r;
          ctx.globalAlpha = Math.random()*op*0.5;
          ctx.fillStyle = clr;
          ctx.beginPath();
          ctx.arc(to.x+Math.cos(a)*d, to.y+Math.sin(a)*d, Math.random()*1.3+0.2, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      }

      case 'airbrush': {
        const g = ctx.createRadialGradient(to.x,to.y,0,to.x,to.y,sz*3);
        g.addColorStop(0, rgba(clr, op*0.4));
        g.addColorStop(0.4, rgba(clr, op*0.1));
        g.addColorStop(1, rgba(clr, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(to.x,to.y,sz*3,0,Math.PI*2); ctx.fill();
        break;
      }

      case 'chalk': {
        for (let i=0;i<12;i++){
          const jx=to.x+(Math.random()-.5)*sz, jy=to.y+(Math.random()-.5)*sz;
          ctx.globalAlpha = Math.random()*op*0.55+0.04;
          ctx.strokeStyle = clr;
          ctx.lineWidth = Math.random()*sz*0.28+0.3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(from.x+(Math.random()-.5)*2, from.y+(Math.random()-.5)*2);
          ctx.lineTo(jx,jy); ctx.stroke();
        }
        break;
      }

      case 'charcoal': {
        for (let i=0;i<18;i++){
          const jx=to.x+(Math.random()-.5)*sz*2.2, jy=to.y+(Math.random()-.5)*sz*0.38;
          ctx.globalAlpha = Math.random()*op*0.32+0.04;
          ctx.fillStyle = clr;
          ctx.beginPath();
          ctx.ellipse(jx,jy, sz*0.7+Math.random()*sz*0.3, sz*0.1+Math.random()*sz*0.05, Math.random()*Math.PI, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      }

      case 'watercolor': {
        ctx.globalAlpha = op*0.035;
        ctx.strokeStyle = clr;
        ctx.lineWidth = sz*2.8;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
        for (let i=0;i<6;i++){
          ctx.globalAlpha = op*0.015;
          ctx.fillStyle = clr;
          ctx.beginPath();
          ctx.arc(to.x+(Math.random()-.5)*sz*2.5, to.y+(Math.random()-.5)*sz*2.5, sz*(0.4+Math.random()), 0, Math.PI*2);
          ctx.fill();
        }
        break;
      }

      case 'pixel': {
        const ps = Math.max(2, Math.round(sz*0.55));
        ctx.globalAlpha = op; ctx.fillStyle = clr;
        let x0=Math.round(from.x/ps), y0=Math.round(from.y/ps);
        let x1=Math.round(to.x/ps), y1=Math.round(to.y/ps);
        let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy;
        for(;;){
          ctx.fillRect(x0*ps,y0*ps,ps,ps);
          if(x0===x1&&y0===y1) break;
          const e2=2*err;
          if(e2>-dy){err-=dy;x0+=sx;}
          if(e2<dx){err+=dx;y0+=sy;}
        }
        break;
      }

      case 'calligraphy': {
        ctx.globalAlpha = op; ctx.fillStyle = clr;
        const dx=to.x-from.x, dy=to.y-from.y, len=Math.sqrt(dx*dx+dy*dy)||1;
        const nx=dy/len, ny=-dx/len, w=sz*0.9, t=sz*0.08;
        ctx.beginPath();
        ctx.moveTo(from.x+nx*w, from.y+ny*w);
        ctx.lineTo(to.x+nx*w,   to.y+ny*w);
        ctx.lineTo(to.x-nx*t,   to.y-ny*t);
        ctx.lineTo(from.x-nx*t, from.y-ny*t);
        ctx.closePath(); ctx.fill();
        break;
      }

      case 'glitter': {
        const n = Math.ceil(sz*3);
        for (let i=0;i<n;i++){
          const a=Math.random()*Math.PI*2, d=Math.random()*sz*2.5;
          const px=to.x+Math.cos(a)*d, py=to.y+Math.sin(a)*d;
          ctx.globalAlpha = Math.random()*op;
          // Randomize hue slightly
          const [r,g,b] = hex2rgb(clr);
          const tint = (v)=>Math.min(255,Math.max(0,v+(Math.random()-.5)*80));
          ctx.fillStyle = rgb2hex(tint(r),tint(g),tint(b));
          ctx.beginPath();
          ctx.arc(px,py, Math.random()*2+0.3, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  };

  // Mirror stroke helper
  const strokeWithMirror = (ctx, from, to) => {
    const bt=brushTypeR.current, clr=colorR.current, sz=brushSzR.current, op=opacityR.current;
    strokeBrush(ctx, from, to, bt, clr, sz, op);
    if (mirrorR.current) {
      const mFrom = {x: CW-from.x, y: from.y};
      const mTo   = {x: CW-to.x,   y: to.y};
      strokeBrush(ctx, mFrom, mTo, bt, clr, sz, op);
    }
  };

  // ── SHAPE DRAWING ──────────────────────────────────────────────────────────
  const drawShape = (ctx, x1, y1, x2, y2) => {
    const cx=(x1+x2)/2, cy=(y1+y2)/2;
    const w=x2-x1, h=y2-y1, aw=Math.abs(w), ah=Math.abs(h);
    const R=Math.sqrt(w*w+h*h)/2;
    ctx.save();
    ctx.globalAlpha = opacityR.current;
    ctx.strokeStyle = colorR.current;
    ctx.fillStyle = rgba(colorR.current, opacityR.current*0.4);
    ctx.lineWidth = brushSzR.current*0.45+1.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const sh = shapeType;
    const fill = () => { if(fillShapes) ctx.fill(); };
    const stroke = () => { if(strokeShape) ctx.stroke(); };

    switch(sh){
      case 'line':
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); stroke(); break;
      case 'rect':
        ctx.beginPath(); ctx.rect(Math.min(x1,x2),Math.min(y1,y2),aw,ah); fill(); stroke(); break;
      case 'oval':
        ctx.beginPath(); ctx.ellipse(cx,cy,aw/2,ah/2,0,0,Math.PI*2); fill(); stroke(); break;
      case 'triangle':
        ctx.beginPath(); ctx.moveTo(cx,Math.min(y1,y2)); ctx.lineTo(Math.min(x1,x2),Math.max(y1,y2)); ctx.lineTo(Math.max(x1,x2),Math.max(y1,y2)); ctx.closePath(); fill(); stroke(); break;
      case 'rtriangle':
        ctx.beginPath(); ctx.moveTo(Math.min(x1,x2),Math.min(y1,y2)); ctx.lineTo(Math.min(x1,x2),Math.max(y1,y2)); ctx.lineTo(Math.max(x1,x2),Math.max(y1,y2)); ctx.closePath(); fill(); stroke(); break;
      case 'star5': starPath(ctx,cx,cy,R,R*0.38,5); fill(); stroke(); break;
      case 'star6': starPath(ctx,cx,cy,R,R*0.5,6); fill(); stroke(); break;
      case 'star8': starPath(ctx,cx,cy,R,R*0.42,8); fill(); stroke(); break;
      case 'arrow': {
        const a=Math.atan2(y2-y1,x2-x1), hl=Math.min(40,R*0.45);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
        ctx.moveTo(x2,y2); ctx.lineTo(x2-hl*Math.cos(a-Math.PI/5),y2-hl*Math.sin(a-Math.PI/5));
        ctx.moveTo(x2,y2); ctx.lineTo(x2-hl*Math.cos(a+Math.PI/5),y2-hl*Math.sin(a+Math.PI/5));
        stroke(); break;
      }
      case 'dbarrow': {
        const a=Math.atan2(y2-y1,x2-x1), hl=Math.min(32,R*0.38);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
        [[x2,y2,a],[x1,y1,a+Math.PI]].forEach(([px,py,ang])=>{
          ctx.moveTo(px,py); ctx.lineTo(px-hl*Math.cos(ang-Math.PI/5),py-hl*Math.sin(ang-Math.PI/5));
          ctx.moveTo(px,py); ctx.lineTo(px-hl*Math.cos(ang+Math.PI/5),py-hl*Math.sin(ang+Math.PI/5));
        });
        stroke(); break;
      }
      case 'heart':   heartPath(ctx,x1,y1,x2,y2); fill(); stroke(); break;
      case 'diamond':
        ctx.beginPath(); ctx.moveTo(cx,Math.min(y1,y2)); ctx.lineTo(Math.max(x1,x2),cy);
        ctx.lineTo(cx,Math.max(y1,y2)); ctx.lineTo(Math.min(x1,x2),cy); ctx.closePath(); fill(); stroke(); break;
      case 'pentagon': polyPath(ctx,cx,cy,R,5); fill(); stroke(); break;
      case 'hexagon':  polyPath(ctx,cx,cy,R,6); fill(); stroke(); break;
      case 'octagon':  polyPath(ctx,cx,cy,R,8); fill(); stroke(); break;
      case 'speech':   speechPath(ctx,x1,y1,x2,y2); fill(); stroke(); break;
    }
    ctx.restore();
  };

  // ── FLOOD FILL ─────────────────────────────────────────────────────────────
  const floodFill = (px, py) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0,0,CW,CH), d = img.data;
    const sx=Math.floor(px), sy=Math.floor(py), si=(sy*CW+sx)*4;
    const [sr,sg,sb,sa]=[d[si],d[si+1],d[si+2],d[si+3]];
    const [fr,fg,fb]=hex2rgb(color), fa=Math.round(opacity*255);
    if(sr===fr&&sg===fg&&sb===fb) return;
    const tol=38;
    const match=i=>Math.abs(d[i]-sr)<=tol&&Math.abs(d[i+1]-sg)<=tol&&Math.abs(d[i+2]-sb)<=tol&&Math.abs(d[i+3]-sa)<=tol;
    const stack=[[sx,sy]], vis=new Uint8Array(CW*CH);
    while(stack.length){
      const[x,y]=stack.pop();
      if(x<0||x>=CW||y<0||y>=CH) continue;
      const ki=y*CW+x; if(vis[ki]) continue; vis[ki]=1;
      const i=ki*4; if(!match(i)) continue;
      d[i]=fr;d[i+1]=fg;d[i+2]=fb;d[i+3]=fa;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    ctx.putImageData(img,0,0);
    pushHistory();
  };

  // ── EYEDROPPER ─────────────────────────────────────────────────────────────
  const pickColor = (px, py) => {
    const p = canvasRef.current.getContext('2d').getImageData(Math.floor(px),Math.floor(py),1,1).data;
    const h = rgb2hex(p[0],p[1],p[2]);
    setColor(h);
    setRecentClr(prev=>[h,...prev.filter(c=>c!==h)].slice(0,16));
  };

  // ── POINTER EVENTS ─────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    ptBuf.current = [];

    if (activeTool==='fill')     { floodFill(pos.x,pos.y); return; }
    if (activeTool==='eyedropper'){ pickColor(pos.x,pos.y); return; }
    if (activeTool==='text') {
      if (!textVal.trim()) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      const style = `${textItalic?'italic ':''} ${textBold?'bold ':''} ${textSize}px Georgia, 'Times New Roman', serif`;
      ctx.font = style.trim();
      ctx.fillText(textVal, pos.x, pos.y);
      ctx.restore();
      pushHistory();
      return;
    }

    drawing.current = true;
    startPt.current = pos;
    lastPt.current  = pos;
    const ctx = canvasRef.current.getContext('2d');
    snapRef.current = ctx.getImageData(0,0,CW,CH);

    if (activeTool==='brush') {
      strokeWithMirror(ctx, pos, pos);
      if (brushType==='spray'||brushType==='airbrush'||brushType==='glitter') {
        sprayTmr.current = setInterval(()=>{
          if (drawing.current) strokeWithMirror(ctx, lastPt.current, lastPt.current);
        }, 20);
      }
    }
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    const raw  = getPos(e);
    const pos  = getStabilizedPos(raw);
    setCanvasPos({x:Math.round(raw.x), y:Math.round(raw.y)});
    setClientPos({x:e.clientX, y:e.clientY});
    if (!drawing.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (activeTool==='brush') {
      strokeWithMirror(ctx, lastPt.current, pos);
      lastPt.current = pos;
    } else if (activeTool==='shape') {
      ctx.putImageData(snapRef.current,0,0);
      drawShape(ctx, startPt.current.x, startPt.current.y, raw.x, raw.y);
    }
  };

  const onPointerUp = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    clearInterval(sprayTmr.current);
    ptBuf.current = [];

    if (activeTool==='shape') {
      const pos = getPos(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(snapRef.current,0,0);
      drawShape(ctx, startPt.current.x, startPt.current.y, pos.x, pos.y);
    }
    setRecentClr(prev=>[color,...prev.filter(c=>c!==color)].slice(0,16));
    pushHistory();
  };

  // ── WHEEL ZOOM ─────────────────────────────────────────────────────────────
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z=>Math.min(12,Math.max(0.08, z*(e.deltaY>0?0.88:1.14))));
  };

  // ── CANVAS OPS ─────────────────────────────────────────────────────────────
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,CW,CH);
    pushHistory();
  };

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const exportAs = (fmt) => {
    const mime={png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[fmt];
    const a=document.createElement('a');
    a.download=`artwork_${Date.now()}.${fmt}`;
    a.href=canvasRef.current.toDataURL(mime,0.96);
    a.click();
  };

  const exportSVG = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}"><image href="${dataURL}" width="${CW}" height="${CH}"/></svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml'});
    const a = document.createElement('a');
    a.download=`artwork_${Date.now()}.svg`; a.href=URL.createObjectURL(blob); a.click();
  };

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  const importImage = () => {
    const inp=document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange=ev=>{
      const file=ev.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=re=>{
        const img=new Image();
        img.onload=()=>{
          const ctx=canvasRef.current.getContext('2d');
          const sc=Math.min(CW/img.width,CH/img.height);
          const iw=img.width*sc,ih=img.height*sc;
          ctx.drawImage(img,(CW-iw)/2,(CH-ih)/2,iw,ih);
          pushHistory();
        };
        img.src=re.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const pasteImage = async()=>{
    try {
      const items=await navigator.clipboard.read();
      for(const item of items) {
        for(const type of item.types){
          if(type.startsWith('image/')){
            const blob=await item.getType(type);
            const url=URL.createObjectURL(blob);
            const img=new Image();
            img.onload=()=>{
              const ctx=canvasRef.current.getContext('2d');
              const sc=Math.min(CW/img.width,CH/img.height);
              ctx.drawImage(img,0,0,img.width*sc,img.height*sc);
              URL.revokeObjectURL(url); pushHistory();
            };
            img.src=url; return;
          }
        }
      }
    } catch {}
  };

  // ── KEYBOARD ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    const kd=(e)=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      const ctrl=e.ctrlKey||e.metaKey;
      if(ctrl){
        if(e.key==='z'){e.preventDefault(); e.shiftKey?redo():undo();}
        if(e.key==='y'){e.preventDefault(); redo();}
        if(e.key==='s'){e.preventDefault(); exportAs('png');}
        if(e.key==='v'){e.preventDefault(); pasteImage();}
        return;
      }
      const toolMap={b:'brush',s:'shape',f:'fill',i:'eyedropper',t:'text'};
      if(toolMap[e.key]){setActiveTool(toolMap[e.key]);return;}
      if(e.key==='e'){setBrushType('eraser'); setActiveTool('brush');}
      if(e.key==='['){setBrushSz(s=>Math.max(1,s-2));}
      if(e.key===']'){setBrushSz(s=>Math.min(150,s+2));}
      if(e.key==='g'){setGridVisible(v=>!v);}
      if(e.key==='m'){setMirrorMode(v=>!v);}
      if(e.key==='+'||e.key==='='){setZoom(z=>Math.min(12,z*1.3));}
      if(e.key==='-'){setZoom(z=>Math.max(0.08,z/1.3));}
      if(e.key==='0'){setZoom(1);}
      if(e.key==='Delete'){clearCanvas();}
    };
    window.addEventListener('keydown',kd);
    return()=>window.removeEventListener('keydown',kd);
  },[undo,redo,color,brushType,opacity]);

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const canUndo = histIdx.current > 0;
  const canRedo = histIdx.current < histArr.current.length-1;
  const cursorStyle = {
    brush:'crosshair', shape:'crosshair', fill:'cell',
    eyedropper:'zoom-in', text:'text',
  }[activeTool]||'crosshair';

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return(
    <div style={{background:T.bg,height:'100vh',display:'flex',flexDirection:'column',
      fontFamily:"'JetBrains Mono','Fira Code','Consolas',monospace",overflow:'hidden',color:T.text,userSelect:'none'}}>

      {/* ─── TOPBAR ─── */}
      <header style={{background:T.panel,borderBottom:`1px solid ${T.border}`,
        padding:'0 10px',height:42,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>

        <span style={{color:T.bright,fontWeight:900,fontSize:'0.88rem',letterSpacing:4,marginRight:14,flexShrink:0}}>
          ART<span style={{color:T.accent}}>BOARD</span>
        </span>

        <GrpDivider/>
        <TopBtn onClick={importImage}>📂 Import</TopBtn>
        <TopBtn onClick={pasteImage}>📋 Paste</TopBtn>
        <GrpDivider/>
        <TopBtn onClick={undo} disabled={!canUndo} title="Ctrl+Z">↶ Undo</TopBtn>
        <TopBtn onClick={redo} disabled={!canRedo} title="Ctrl+Y">↷ Redo</TopBtn>
        <GrpDivider/>
        <TopBtn onClick={()=>exportAs('png')}>↓ PNG</TopBtn>
        <TopBtn onClick={()=>exportAs('jpg')}>↓ JPG</TopBtn>
        <TopBtn onClick={()=>exportAs('webp')}>↓ WebP</TopBtn>
        <TopBtn onClick={exportSVG}>↓ SVG</TopBtn>
        <GrpDivider/>
        <TopBtn onClick={()=>setGridVisible(v=>!v)} active={gridVisible}>▦ Grid</TopBtn>
        <TopBtn onClick={()=>setMirrorMode(v=>!v)} active={mirrorMode} title="M">⇆ Mirror</TopBtn>
        <TopBtn onClick={()=>setStabilize(v=>!v)}  active={stabilize}>〜 Stabilize</TopBtn>
        <GrpDivider/>
        <TopBtn onClick={()=>setZoom(1)}>⊡ 1:1</TopBtn>
        <TopBtn onClick={()=>setZoom(z=>Math.min(12,z*1.4))}>⊕</TopBtn>
        <TopBtn onClick={()=>setZoom(z=>Math.max(0.08,z/1.4))}>⊖</TopBtn>
        <TopBtn onClick={clearCanvas} col={T.danger}>🗑 Clear</TopBtn>

        <div style={{marginLeft:'auto',fontSize:'0.6rem',color:T.muted,display:'flex',gap:16,flexShrink:0}}>
          <span style={{color:T.muted}}>{canvasPos.x}, {canvasPos.y}</span>
          <span>{Math.round(zoom*100)}%</span>
          <span style={{color:T.border}}>|</span>
          <span>{CW}×{CH}</span>
          <span style={{color:T.border}}>|</span>
          <span>H: {histIdx.current+1}/{histArr.current.length}</span>
        </div>
      </header>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ─── LEFT ICON TOOLBAR ─── */}
        <nav style={{width:50,background:T.panel,borderRight:`1px solid ${T.border}`,
          display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 0',gap:3,flexShrink:0}}>
          {[
            {id:'brush',    icon:'✎',  title:'Brush (B)'},
            {id:'shape',    icon:'◭',  title:'Shapes (S)'},
            {id:'fill',     icon:'▩',  title:'Fill (F)'},
            {id:'eyedropper',icon:'◉', title:'Eyedropper (I)'},
            {id:'text',     icon:'Ⓣ',  title:'Text (T)'},
          ].map(t=>(
            <button key={t.id} title={t.title} onClick={()=>setActiveTool(t.id)} style={{
              width:36,height:36,background:activeTool===t.id?T.accent:'transparent',
              color:activeTool===t.id?'#fff':T.muted,
              border:`1px solid ${activeTool===t.id?T.accent:'transparent'}`,
              borderRadius:8,cursor:'pointer',fontSize:'1.1rem',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'0.15s',
            }}>{t.icon}</button>
          ))}
          <div style={{width:28,height:1,background:T.border,margin:'4px 0'}}/>
          {/* Active color swatch */}
          <div onClick={()=>document.getElementById('mainClrPkr').click()}
            style={{width:30,height:30,borderRadius:6,background:color,
            border:`2px solid ${T.border}`,cursor:'pointer',
            boxShadow:`0 0 14px ${color}70`,transition:'box-shadow 0.2s'}}/>
          <input id="mainClrPkr" type="color" value={color} onChange={e=>setColor(e.target.value)} style={{display:'none'}}/>
        </nav>

        {/* ─── CANVAS ─── */}
        <div style={{flex:1,overflow:'auto',background:'#040409',position:'relative'}}
          onWheel={onWheel}>
          <div style={{padding:48,minWidth:CW*zoom+96,minHeight:CH*zoom+96,
            display:'flex',alignItems:'flex-start',justifyContent:'flex-start',boxSizing:'border-box'}}>
            <div style={{position:'relative',display:'inline-block',
              transformOrigin:'top left',transform:`scale(${zoom})`,
              boxShadow:'0 0 100px rgba(109,40,217,0.18), 0 40px 120px rgba(0,0,0,0.95)',
              borderRadius:2}}>
              <canvas ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{display:'block',cursor:cursorStyle,touchAction:'none'}}/>
              {gridVisible&&(
                <div style={{position:'absolute',inset:0,pointerEvents:'none',
                  backgroundImage:'linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)',
                  backgroundSize:'24px 24px'}}/>
              )}
              {mirrorMode&&(
                <div style={{position:'absolute',top:0,left:'50%',bottom:0,
                  width:1,background:'rgba(167,139,250,0.35)',pointerEvents:'none',
                  boxShadow:'0 0 8px rgba(167,139,250,0.5)'}}/>
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <aside style={{width:226,background:T.panel,borderLeft:`1px solid ${T.border}`,
          display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:10}}>

            {/* BRUSHES */}
            {activeTool==='brush'&&(
              <PBox label="BRUSHES">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
                  {BRUSHES.map(b=>(
                    <ChoiceBtn key={b.id} active={brushType===b.id} onClick={()=>setBrushType(b.id)}>
                      <span style={{fontSize:'0.9rem',marginRight:3}}>{b.icon}</span>{b.name}
                    </ChoiceBtn>
                  ))}
                </div>
              </PBox>
            )}

            {/* SHAPES */}
            {activeTool==='shape'&&(
              <PBox label="SHAPES">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3,marginBottom:8}}>
                  {SHAPES.map(s=>(
                    <ChoiceBtn key={s.id} active={shapeType===s.id} onClick={()=>setShapeType(s.id)}>
                      <span style={{marginRight:3}}>{s.icon}</span>{s.name}
                    </ChoiceBtn>
                  ))}
                </div>
                <div style={{display:'flex',gap:12}}>
                  <Chk label="Fill"   checked={fillShapes}  onChange={setFillShapes}/>
                  <Chk label="Stroke" checked={strokeShape} onChange={setStrokeShape}/>
                </div>
              </PBox>
            )}

            {/* TEXT */}
            {activeTool==='text'&&(
              <PBox label="TEXT TOOL">
                <textarea value={textVal} onChange={e=>setTextVal(e.target.value)} rows={3}
                  placeholder="Type here, click canvas to place..."
                  style={{width:'100%',background:T.surface,border:`1px solid ${T.border}`,
                  color:T.text,padding:'6px 8px',borderRadius:6,fontSize:'0.72rem',
                  resize:'vertical',fontFamily:'Georgia,serif',boxSizing:'border-box'}}/>
                <SRow label="SIZE" value={textSize} min={6} max={220} onChange={setTextSize} unit="px"/>
                <div style={{display:'flex',gap:5,marginTop:4}}>
                  <Chk label="Bold"   checked={textBold}   onChange={setTextBold}/>
                  <Chk label="Italic" checked={textItalic} onChange={setTextItalic}/>
                </div>
                <div style={{marginTop:6,fontSize:'0.6rem',color:T.muted,lineHeight:1.5,
                  background:T.surface,padding:'5px 7px',borderRadius:5,border:`1px solid ${T.border}`}}>
                  💡 Click canvas to place text at cursor
                </div>
              </PBox>
            )}

            {/* STROKE CONTROLS */}
            <PBox label="STROKE">
              <SRow label="SIZE"    value={brushSz}              min={1}   max={150} onChange={setBrushSz}  unit="px"/>
              <SRow label="OPACITY" value={Math.round(opacity*100)} min={1}   max={100} onChange={v=>setOpacity(v/100)} unit="%"/>
              {/* Live preview */}
              <div style={{background:'#000',borderRadius:6,height:46,display:'flex',
                alignItems:'center',justifyContent:'center',border:`1px solid ${T.border}`,marginTop:4}}>
                <div style={{
                  width: Math.min(brushSz*(brushType==='marker'?2.2:1.1),90),
                  height: brushType==='calligraphy'?Math.max(3,brushSz*0.12):Math.min(brushSz*(brushType==='marker'?2.2:1.1),90),
                  borderRadius:(brushType==='pixel'||brushType==='marker'||brushType==='calligraphy')?2:'50%',
                  background:color,opacity,transition:'all 0.18s',
                  boxShadow:brushType==='pen'?`0 0 6px ${color}`:brushType==='glitter'?`0 0 14px ${color}`:'none',
                }}/>
              </div>
            </PBox>

            {/* COLOR */}
            <PBox label="COLOR">
              <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                style={{width:'100%',height:38,border:'none',borderRadius:6,cursor:'pointer',
                background:'none',padding:0,display:'block'}}/>
              <input value={color}
                onChange={e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))setColor(e.target.value);}}
                style={{width:'100%',background:T.surface,border:`1px solid ${T.border}`,
                color:T.text,padding:'4px 8px',borderRadius:5,fontSize:'0.72rem',
                fontFamily:'monospace',marginTop:4,boxSizing:'border-box'}}/>
              {/* Palette */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:3,marginTop:8}}>
                {PALETTE.map(pc=>(
                  <div key={pc} onClick={()=>setColor(pc)} style={{
                    aspectRatio:'1',background:pc,borderRadius:3,cursor:'pointer',
                    border:color===pc?'2px solid #fff':'1px solid rgba(255,255,255,0.06)',
                    boxShadow:color===pc?`0 0 7px ${pc}`:'none',
                    transform:color===pc?'scale(1.2)':'scale(1)',transition:'all 0.12s',
                  }}/>
                ))}
              </div>
              {/* Recent */}
              {recentClr.length>0&&<>
                <div style={{fontSize:'0.57rem',color:T.muted,marginTop:8,marginBottom:3,letterSpacing:2}}>RECENT</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {recentClr.map((rc,i)=>(
                    <div key={i} onClick={()=>setColor(rc)} style={{
                      width:17,height:17,background:rc,borderRadius:3,cursor:'pointer',
                      border:`1px solid ${color===rc?'#fff':'transparent'}`,
                    }}/>
                  ))}
                </div>
              </>}
              {/* Background color */}
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:7}}>
                <span style={{fontSize:'0.6rem',color:T.muted}}>BG:</span>
                <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                  style={{width:26,height:20,border:'none',borderRadius:3,cursor:'pointer'}}/>
                <span style={{fontSize:'0.6rem',color:T.muted,fontFamily:'monospace'}}>{bgColor}</span>
              </div>
            </PBox>

            {/* LAYERS */}
            <PBox label="LAYERS">
              <div style={{display:'flex',gap:4,marginBottom:7}}>
                <button onClick={()=>{
                  const id=layerCtr.current++;
                  setLayers(prev=>[...prev,{id,name:`Layer ${id}`,visible:true,locked:false}]);
                  setActiveLayer(id);
                }} style={miniBtn()}>+ Add</button>
                <button onClick={()=>{
                  if(layers.length<=1) return;
                  setLayers(prev=>prev.filter(l=>l.id!==activeLayer));
                  setActiveLayer(layers[0].id);
                }} style={miniBtn(true)}>✕ Del</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                {[...layers].reverse().map(layer=>(
                  <div key={layer.id} onClick={()=>setActiveLayer(layer.id)}
                    style={{background:activeLayer===layer.id?`${T.accent}22`:T.surface,
                    border:`1px solid ${activeLayer===layer.id?T.accent:T.border}`,
                    borderRadius:6,padding:'5px 7px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <button onClick={e=>{e.stopPropagation();setLayers(prev=>prev.map(l=>l.id===layer.id?{...l,visible:!l.visible}:l));}}
                        style={{background:'none',border:'none',cursor:'pointer',padding:0,
                        color:layer.visible?T.text:T.muted,fontSize:'0.8rem'}}>
                        {layer.visible?'👁':'○'}
                      </button>
                      <span style={{flex:1,fontSize:'0.63rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                        color:activeLayer===layer.id?T.bright:T.muted}}>{layer.name}</span>
                      <button onClick={e=>{e.stopPropagation();setLayers(prev=>prev.map(l=>l.id===layer.id?{...l,locked:!l.locked}:l));}}
                        style={{background:'none',border:'none',cursor:'pointer',padding:0,
                        color:layer.locked?T.warn:T.muted,fontSize:'0.75rem'}}>
                        {layer.locked?'🔒':'○'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PBox>

          </div>

          {/* Keyboard hints */}
          <div style={{borderTop:`1px solid ${T.border}`,padding:'6px 10px',fontSize:'0.53rem',
            color:T.muted,lineHeight:2,flexShrink:0}}>
            <div>B/S/F/I/T · E=eraser · G=grid</div>
            <div>[/]=size · M=mirror · +/-=zoom</div>
            <div>0=fit · Del=clear · Ctrl+Z/Y</div>
          </div>
        </aside>

      </div>

      {/* ─── STATUS BAR ─── */}
      <footer style={{background:T.panel,borderTop:`1px solid ${T.border}`,
        padding:'3px 14px',display:'flex',gap:16,fontSize:'0.6rem',color:T.muted,flexShrink:0,alignItems:'center'}}>
        <span style={{color:T.bright,fontWeight:700}}>{activeTool.toUpperCase()}</span>
        {activeTool==='brush'&&<span style={{color:T.muted}}>{brushType}</span>}
        {activeTool==='shape'&&<span style={{color:T.muted}}>{shapeType}</span>}
        {mirrorMode&&<span style={{color:T.bright}}>⇆ MIRROR</span>}
        {stabilize&&<span style={{color:T.warn}}>〜 STAB</span>}
        <span>sz:{brushSz}</span>
        <span>α:{Math.round(opacity*100)}%</span>
        <div style={{width:10,height:10,borderRadius:'50%',background:color,border:`1px solid ${T.border}`,flexShrink:0}}/>
        <span style={{fontFamily:'monospace'}}>{color}</span>
        <span style={{marginLeft:'auto',color:T.surface}}>ARTBOARD PRO · {CW}×{CH}px</span>
      </footer>

      <style>{`
        * { box-sizing:border-box; }
        input[type=range] { accent-color:${T.accent}; cursor:pointer; }
        textarea { outline:none; }
        button:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${T.bg}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
        ::-webkit-scrollbar-thumb:hover { background:${T.muted}; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function PBox({label,children}){
  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:10}}>
      <div style={{fontSize:'0.57rem',color:T.accent,fontWeight:900,letterSpacing:2,marginBottom:8}}>{label}</div>
      {children}
    </div>
  );
}
function SRow({label,value,min,max,onChange,unit=''}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
      <span style={{fontSize:'0.57rem',color:T.muted,width:52,flexShrink:0}}>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)} style={{flex:1,height:3}}/>
      <span style={{fontSize:'0.62rem',color:T.text,width:32,textAlign:'right',fontFamily:'monospace'}}>{value}{unit}</span>
    </div>
  );
}
function ChoiceBtn({active,onClick,children}){
  return(
    <button onClick={onClick} style={{
      background:active?`${T.accent}28`:T.panel,color:active?T.bright:T.muted,
      border:`1px solid ${active?T.accent:T.border}`,
      padding:'5px 4px',borderRadius:6,cursor:'pointer',
      fontSize:'0.6rem',fontWeight:700,display:'flex',alignItems:'center',
      fontFamily:'inherit',transition:'0.12s',
    }}>{children}</button>
  );
}
function Chk({label,checked,onChange}){
  return(
    <label style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.63rem',color:T.muted,cursor:'pointer'}}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
        style={{accentColor:T.accent}}/>
      {label}
    </label>
  );
}
function TopBtn({onClick,children,disabled,active,col,title}){
  const c=col||T.accent;
  return(
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background:active?c:'transparent',
      color:disabled?T.border:active?'#fff':col?col:T.muted,
      border:`1px solid ${disabled?T.border:active?c:col?col:T.border}`,
      padding:'3px 9px',borderRadius:4,cursor:disabled?'not-allowed':'pointer',
      fontSize:'0.65rem',fontWeight:700,fontFamily:'inherit',transition:'0.12s',flexShrink:0,
    }}
    onMouseOver={e=>{if(!disabled)e.currentTarget.style.opacity='0.72';}}
    onMouseOut={e=>{e.currentTarget.style.opacity='1';}}
    >{children}</button>
  );
}
function GrpDivider(){return <div style={{width:1,height:22,background:T.border,flexShrink:0}}/>;}
function miniBtn(danger=false){
  return{
    flex:1,background:'transparent',
    border:`1px solid ${danger?T.danger:T.border}`,
    color:danger?T.danger:T.muted,
    padding:'4px 0',borderRadius:5,cursor:'pointer',
    fontSize:'0.62rem',fontWeight:700,fontFamily:'inherit',
  };
}