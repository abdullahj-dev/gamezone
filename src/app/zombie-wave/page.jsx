'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIQUE STORAGE KEY — will never clash
const SK = "DEAD_SIGNAL_COOP_V2_h8k2m9x4q";
const CW = 800, CH = 540, TILE = 40;
const TOTAL_LEVELS = 10;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIO
let _AC = null;
const getAC = () => {
  if (typeof window === "undefined") return null;
  try {
    if (!_AC) _AC = new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === "suspended") _AC.resume();
    return _AC;
  } catch (_) { return null; }
};
const boop = (f, d, type = "sawtooth", vol = 0.07, delay = 0) => {
  try {
    const ctx = getAC(); if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.setValueAtTime(Math.max(20, f), t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, d));
    o.start(t); o.stop(t + Math.max(0.01, d) + 0.01);
  } catch (_) {}
};
const SFX = {
  shoot:    () => { boop(200,0.04,"sawtooth",0.07); boop(160,0.05,"square",0.03,0.01); },
  shotgun:  () => { boop(90,0.08,"sawtooth",0.10); boop(130,0.06,"sawtooth",0.06,0.02); },
  reload:   () => { boop(380,0.04,"triangle",0.04); boop(480,0.03,"triangle",0.03,0.06); },
  hit:      () => boop(150,0.09,"sawtooth",0.05),
  kill:     () => { boop(100,0.12,"sawtooth",0.08); boop(70,0.15,"sawtooth",0.05,0.06); },
  hurt:     () => { boop(170,0.10,"sawtooth",0.10); boop(120,0.14,"sawtooth",0.07,0.04); },
  reviving: () => boop(440,0.08,"triangle",0.05),
  revived:  () => [330,440,554,660].forEach((f,i)=>boop(f,0.10,"triangle",0.05,i*0.07)),
  grenade:  () => { boop(75,0.22,"sawtooth",0.12); boop(55,0.28,"sawtooth",0.08,0.07); boop(38,0.34,"sawtooth",0.05,0.14); },
  medkit:   () => { boop(660,0.06,"triangle",0.05); boop(880,0.08,"triangle",0.04,0.07); },
  objective:() => [550,660,880,1100].forEach((f,i)=>boop(f,0.12,"triangle",0.05,i*0.06)),
  boss:     () => [80,70,60,50].forEach((f,i)=>boop(f,0.28,"sawtooth",0.10,i*0.16)),
  gameover: () => [300,220,160,110,80].forEach((f,i)=>boop(f,0.25,"sawtooth",0.07,i*0.18)),
  wave:     () => [220,277,330].forEach((f,i)=>boop(f,0.14,"square",0.05,i*0.08)),
  buy:      () => { boop(880,0.07,"triangle",0.05); boop(1100,0.10,"triangle",0.04,0.08); },
  deny:     () => boop(110,0.15,"sawtooth",0.07),
  menu:     () => boop(660,0.06,"triangle",0.04),
  dash:     () => boop(440,0.07,"triangle",0.04),
  door:     () => { boop(200,0.08,"square",0.05); boop(160,0.10,"square",0.04,0.05); },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORY / LEVELS
const LEVELS = [
  { id:1, name:"BLACKSITE HOTEL", boss:false,
    setting:"Harkov Grand Hotel — 11:47 PM, Day 1",
    lines:[
      "The last evacuation chopper left six minutes ago.",
      "CDC analysis: 340+ infected in a three-block radius.",
      "Mission: reach the rooftop broadcast tower. Transmit the containment frequency.",
      "It buys the city another 12 hours. Maybe enough time to find the cure.",
      "Don't get separated. Down here, separated means dead."
    ],
    charLines:["Kane: \"Six minutes. They couldn't wait six goddamn minutes.\"","Leila: \"Focus. We still have a job. Get to the tower.\""],
    objective:"Reach rooftop broadcast tower",
    enemies:["walker","runner"], counts:[12,18], waves:2, reward:180 },
  { id:2, name:"CITY SUBWAY", boss:false,
    setting:"Harkov Metro Line 4 — 1:22 AM, Day 2",
    lines:[
      "The overground route is completely overrun — 800 meters of open kill-zone.",
      "Metro Line 4 cuts directly under Mercy General. It's our fastest path.",
      "Problem: the infected nest underground. They've been using the tunnels to spread.",
      "They hear everything in there. Sound carries 400 meters in those tunnels.",
      "We keep moving. We do not stop. We do not separate."
    ],
    charLines:["Kane: \"Tunnels. Of course it's tunnels.\"","Leila: \"I've got the pathogen scanner active. Any spike, we run.\""],
    objective:"Reach Metro Station Omega — Hospital platform",
    enemies:["walker","runner","armored"], counts:[16,20,12], waves:3, reward:220 },
  { id:3, name:"MERCY GENERAL HOSPITAL", boss:false,
    setting:"Mercy General, Floors 3–6 — 3:05 AM, Day 2",
    lines:[
      "This hospital is where the outbreak was first reported 72 hours ago.",
      "Patient Zero was brought here. Dr. Chen ran the initial pathology.",
      "Her mobile lab is on Floor 6, Room C. Her research is our only lead.",
      "Medical staff turned within two hours of exposure. They're still in scrubs.",
      "Do what you have to do. They'd understand."
    ],
    charLines:["Leila: \"These people were saving lives yesterday morning.\"","Kane: \"They're not people anymore, Leila. Stay focused. Move.\""],
    objective:"Retrieve Dr. Chen's research drives from Lab 6-C",
    enemies:["walker","runner","armored"], counts:[14,22,18], waves:3, reward:260 },
  { id:4, name:"HARKOV POLICE HQ", boss:false,
    setting:"HPD Central Command — 5:30 AM, Day 2",
    lines:[
      "HPD headquarters holds M99 disruptor charges left by the National Guard.",
      "We need them to breach the biolab's blast doors later. No other way through.",
      "Be advised: over 200 HPD officers reported contaminated inside the building.",
      "They still respond to alarm systems. Do NOT trigger the sirens.",
      "Intel also puts a survivor group barricaded in the evidence lockup. Get them out."
    ],
    charLines:["Kane: \"I knew people here. Good people.\"","Leila: \"Kane. I know. We keep moving.\""],
    objective:"Secure M99 charges + extract survivors from Evidence Block C",
    enemies:["walker","armored","runner","heavy"], counts:[18,16,20,6], waves:4, reward:300 },
  { id:5, name:"SUBJECT ALPHA", boss:true, bossName:"SUBJECT ALPHA — Marcus Webb",
    setting:"Harkov Central Park Containment Zone — 7:15 AM, Day 2",
    lines:[
      "Alpha was Patient Zero's closest contact. First secondary infection. First mutation.",
      "Military containment failed here three days ago. Alpha has been mutating ever since.",
      "It was a firefighter. Marcus Webb, Station 14. He has a daughter.",
      "At 72 hours of exposure, it now coordinates other infected within 400 meters.",
      "Neutralize it. The horde loses its tactical mind. And we get a clear path forward."
    ],
    charLines:["Kane: \"Jesus. It's enormous.\"","Leila: \"Cranium shots. The pathogen amplified muscle mass 600%. Only the head matters.\""],
    objective:"ELIMINATE SUBJECT ALPHA",
    enemies:["walker","runner","armored"], counts:[28,22,18], waves:2, reward:480 },
  { id:6, name:"HARKOV UNIVERSITY", boss:false,
    setting:"Faculty of Sciences, Harkov Uni — 9:40 AM, Day 2",
    lines:[
      "Professor Hartmann was Voss's academic mentor — and the man who reported him.",
      "Every pathogen like the Voss strain has a failsafe. A kill frequency. A weakness.",
      "Hartmann knew what Voss was building. He would have found it.",
      "He went off-grid when the outbreak started. His notes are in Office 204-B.",
      "The university was used as a triage center. Then a containment zone. Neither worked."
    ],
    charLines:["Leila: \"Hartmann filed the Ethics Board complaint three years ago. Voss had him fired.\"","Kane: \"And now Hartmann's the only one who can stop what Voss started. Move.\""],
    objective:"Retrieve Hartmann's encoded research notes from Office 204-B",
    enemies:["runner","armored","heavy"], counts:[20,26,14], waves:3, reward:320 },
  { id:7, name:"WATER TREATMENT PLANT", boss:false,
    setting:"Harkov Municipal Water, Sector 3 — 11:55 AM, Day 2",
    lines:[
      "Someone is actively dispersing the Voss pathogen through the water supply.",
      "At current pump rates, two million people will be infected by 6 PM today.",
      "Dr. Chen's notes confirm the pathogen survives chlorination at standard levels.",
      "We need to physically destroy the four primary pump manifolds. The M99 charges will do it.",
      "There will be infected workers throughout. They were just doing their jobs."
    ],
    charLines:["Kane: \"This isn't random spread. Someone is running this actively.\"","Leila: \"It has to be Voss. He's alive, he's coordinating, and he's still working.\""],
    objective:"Plant M99 charges on 4 pump manifolds — evacuate before detonation",
    enemies:["walker","armored","heavy","runner"], counts:[22,18,10,26], waves:4, reward:360 },
  { id:8, name:"MILITARY CHECKPOINT DELTA", boss:false,
    setting:"Harkov Northern Perimeter — 2:10 PM, Day 2",
    lines:[
      "The military's containment perimeter collapsed six hours ago.",
      "Contaminated soldiers. Armed. In body armor. Still operating in fire teams.",
      "They retain muscle memory — cover, flanking, suppression fire. Be ready for it.",
      "The command vehicle has the airstrike targeting system. We need it.",
      "We redirect the strike to the biolab's coordinates. Not the city center. Not civilians."
    ],
    charLines:["Leila: \"These are soldiers, Kane. They had orders, families—\"","Kane: \"And if we don't get to that vehicle, everyone else loses theirs too. Go.\""],
    objective:"Reach command vehicle + reprogram airstrike coordinates",
    enemies:["armored","heavy","runner"], counts:[18,16,28], waves:3, reward:400 },
  { id:9, name:"BIOWEAPON LAB ZERO", boss:false,
    setting:"Voss Research Facility, Sublevel 4 — 4:45 PM, Day 2",
    lines:[
      "Forty meters underground. No GPS. No backup. No way to call for help.",
      "This is where the Voss pathogen was synthesized. This is where it has to end.",
      "The synthesis chamber holds the neutralizer formula — if Voss ever completed it.",
      "Four blast-door sections. The M99 charges handle two. Find alternatives for the others.",
      "The facility's been sealed since the outbreak. Three days. Think about what's been growing."
    ],
    charLines:["Kane: \"Emergency lights still on. Someone's been here recently.\"","Leila: \"The formula exists. It has to. Voss wouldn't build all this without an exit plan.\""],
    objective:"Reach Synthesis Chamber — extract neutralizer formula",
    enemies:["walker","armored","heavy","runner"], counts:[24,22,16,30], waves:4, reward:440 },
  { id:10, name:"DR. VOSS — FINAL STAND", boss:true, bossName:"DR. ANDERS VOSS",
    setting:"Facility Core — Reactor Level — 6:02 PM, Day 2 (Airstrike: T-58 minutes)",
    lines:[
      "Dr. Anders Voss. 54. Virologist. Weapons contractor. Architect of everything.",
      "He believed human population needed to be 'managed.' Harkov was his proof of concept.",
      "He injected himself with an enhanced strain four days ago. He is the formula now.",
      "The only way to get it is from him. There is no other way.",
      "The airstrike hits in 58 minutes. Harkov. Everyone left in it. This ends now."
    ],
    charLines:["Voss (intercom): \"You made it. I wondered if you would. Come see what I've become.\"","Kane: \"58 minutes. Let's finish this.\""],
    objective:"ELIMINATE DR. ANDERS VOSS — RETRIEVE FORMULA FROM LAB TERMINAL",
    enemies:["armored","heavy"], counts:[32,28], waves:2, reward:1000 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEAPONS
const WEAPONS = {
  m9:     { name:"M9 Pistol",       cat:"pistol",  dmg:22, rps:2.8,reload:1.4,mag:15,range:240,spread:0.05,pellets:1,cost:0,    rarity:"STANDARD",  desc:"Standard-issue. Reliable across all ranges." },
  glock:  { name:"Glock 17",        cat:"pistol",  dmg:20, rps:3.5,reload:1.3,mag:17,range:230,spread:0.04,pellets:1,cost:280,  rarity:"STANDARD",  desc:"High-cap semi-auto. Faster cycle than M9." },
  deagle: { name:"Desert Eagle",    cat:"pistol",  dmg:55, rps:1.8,reload:1.8,mag:7, range:250,spread:0.07,pellets:1,cost:1100, rarity:"TACTICAL",  desc:"Each round stops a man cold. Heavy." },
  mp5:    { name:"MP5 SMG",         cat:"smg",     dmg:14, rps:7.0,reload:2.0,mag:30,range:210,spread:0.10,pellets:1,cost:600,  rarity:"STANDARD",  desc:"9mm submachine gun. Close-range dominance." },
  mp7:    { name:"MP7 PDW",         cat:"smg",     dmg:18, rps:8.0,reload:1.8,mag:40,range:220,spread:0.09,pellets:1,cost:1600, rarity:"TACTICAL",  desc:"High-velocity. Armor-piercing at short range." },
  m4:     { name:"M4A1 Carbine",    cat:"rifle",   dmg:30, rps:5.0,reload:2.2,mag:30,range:320,spread:0.07,pellets:1,cost:1200, rarity:"TACTICAL",  desc:"Versatile combat rifle. Backbone of any team." },
  ak47:   { name:"AK-47",           cat:"rifle",   dmg:36, rps:4.2,reload:2.5,mag:30,range:300,spread:0.09,pellets:1,cost:1000, rarity:"TACTICAL",  desc:"Heavier hit, wider spread. Brutal up close." },
  rem870: { name:"Remington 870",   cat:"shotgun", dmg:18, rps:1.2,reload:3.0,mag:6, range:140,spread:0.30,pellets:8,cost:900,  rarity:"TACTICAL",  desc:"8 pellets per shot. Nothing survives 5 meters." },
  spas12: { name:"SPAS-12 Auto",    cat:"shotgun", dmg:22, rps:1.6,reload:2.8,mag:8, range:155,spread:0.28,pellets:8,cost:1800, rarity:"TACTICAL",  desc:"Semi-auto combat shotgun. Fast follow-up." },
  barrett:{ name:"Barrett M82",     cat:"sniper",  dmg:130,rps:0.5,reload:4.0,mag:5, range:600,spread:0.01,pellets:1,cost:2800, rarity:"SPECIALIST",desc:"Anti-materiel. One shot, one kill. Always." },
  m249:   { name:"M249 SAW",        cat:"lmg",     dmg:25, rps:8.5,reload:5.0,mag:100,range:280,spread:0.14,pellets:1,cost:3200,rarity:"SPECIALIST",desc:"Belt-fed LMG. Sustained suppression. Hold the line." },
  m1014:  { name:"M1014 Full-Auto", cat:"shotgun", dmg:20, rps:2.2,reload:2.5,mag:8, range:155,spread:0.26,pellets:7,cost:2200, rarity:"SPECIALIST",desc:"Full-auto shotgun. Absolute room clearance." },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPGRADES
const UPGRADES = {
  k_dmg:    { name:"Stopping Power",   char:1,stat:"dmgMult",   inc:0.18,max:5,cost:350, rarity:"TACTICAL",  desc:"Kane: +18% weapon damage per rank" },
  k_rof:    { name:"Hair Trigger",     char:1,stat:"rofMult",   inc:0.15,max:4,cost:400, rarity:"TACTICAL",  desc:"Kane: +15% fire rate per rank" },
  k_armor:  { name:"Tactical Vest",    char:1,stat:"armor",     inc:8,   max:5,cost:450, rarity:"TACTICAL",  desc:"Kane: +8 damage resistance per rank" },
  k_hp:     { name:"Combat Endurance", char:1,stat:"maxHp",     inc:30,  max:6,cost:380, rarity:"STANDARD",  desc:"Kane: +30 max HP per rank" },
  k_reload: { name:"Speed Loader",     char:1,stat:"reloadMult",inc:0.20,max:4,cost:320, rarity:"STANDARD",  desc:"Kane: +20% reload speed per rank" },
  k_mag:    { name:"Extended Mag",     char:1,stat:"magMult",   inc:0.25,max:4,cost:350, rarity:"STANDARD",  desc:"Kane: +25% magazine size per rank" },
  k_dash:   { name:"Combat Roll",      char:1,stat:"dash",      inc:1,   max:1,cost:700, rarity:"SPECIALIST",desc:"Kane: SHIFT to dodge-roll" },
  k_range:  { name:"Rifleman",         char:1,stat:"rangeMult", inc:0.20,max:3,cost:500, rarity:"TACTICAL",  desc:"Kane: +20% bullet range per rank" },
  l_heal:   { name:"Field Medicine",   char:2,stat:"healPow",   inc:0.25,max:5,cost:380, rarity:"TACTICAL",  desc:"Leila: +25% medkit healing per rank" },
  l_revive: { name:"Combat Medic",     char:2,stat:"reviveTime",inc:0.20,max:4,cost:500, rarity:"SPECIALIST",desc:"Leila: -20% revive time per rank" },
  l_regen:  { name:"Stims",            char:2,stat:"regen",     inc:3,   max:5,cost:450, rarity:"TACTICAL",  desc:"Leila: +3 HP regen per 5s per rank" },
  l_hp:     { name:"Reinforced Armor", char:2,stat:"maxHp",     inc:30,  max:6,cost:380, rarity:"STANDARD",  desc:"Leila: +30 max HP per rank" },
  l_armor:  { name:"Ceramic Plating",  char:2,stat:"armor",     inc:8,   max:5,cost:450, rarity:"TACTICAL",  desc:"Leila: +8 damage resistance per rank" },
  l_speed:  { name:"Light Rig",        char:2,stat:"speedMult", inc:0.15,max:4,cost:350, rarity:"STANDARD",  desc:"Leila: +15% movement speed per rank" },
  l_scan:   { name:"Bio-Scanner",      char:2,stat:"scanner",   inc:1,   max:1,cost:600, rarity:"SPECIALIST",desc:"Leila: Shows all enemy HP bars" },
  l_dash:   { name:"Evasive Action",   char:2,stat:"dash",      inc:1,   max:1,cost:700, rarity:"SPECIALIST",desc:"Leila: CTRL to dodge-roll" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POWERUPS
const POWERUPS = {
  medkit:    { name:"Med Kit (Large)",  icon:"⚕", cost:200, uses:2,rarity:"STANDARD",  desc:"Restore 80 HP to one player",     key:"E",key2:"O" },
  smmedkit:  { name:"Field Dressing",  icon:"💊", cost:100, uses:3,rarity:"STANDARD",  desc:"Restore 35 HP to one player",     key:"",key2:"" },
  grenade:   { name:"Frag Grenade",    icon:"💣", cost:180, uses:3,rarity:"TACTICAL",  desc:"Large AoE. ~180 damage radius",   key:"Q",key2:"U" },
  flashbang: { name:"Flashbang",       icon:"⚡", cost:130, uses:3,rarity:"TACTICAL",  desc:"Stuns all enemies for 3 seconds", key:"",key2:"" },
  ammobox:   { name:"Ammo Box",        icon:"📦", cost:90,  uses:3,rarity:"STANDARD",  desc:"Full mag refill — both players",  key:"",key2:"" },
  shield:    { name:"Riot Shield",     icon:"🛡", cost:360, uses:2,rarity:"SPECIALIST",desc:"4 seconds full invincibility",     key:"",key2:"" },
  airstrike: { name:"Close Air Strike",icon:"✈", cost:900, uses:1,rarity:"SPECIALIST",desc:"Wipe every enemy on screen",       key:"G",key2:"" },
  slowfield: { name:"EMP Grenade",     icon:"🌀", cost:250, uses:2,rarity:"TACTICAL",  desc:"Slow all enemies 65% for 5s",     key:"F",key2:"" },
  turret:    { name:"Sentry Gun",      icon:"🔫", cost:550, uses:2,rarity:"SPECIALIST",desc:"Auto-targeting turret 20s",        key:"T",key2:"" },
  revive_k:  { name:"Auto-Injector",   icon:"💉", cost:500, uses:1,rarity:"SPECIALIST",desc:"Instantly revive partner",         key:"",key2:"" },
};

const RARITY_C = { STANDARD:"#8a9a80", TACTICAL:"#4a9a4a", SPECIALIST:"#4a88cc", RARE:"#8844ff", LEGENDARY:"#cc8800" };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENEMY TYPES
const ENEMY_DEF = {
  walker:  { name:"Infected",     hp:65,  spd:50,  dmg:12,size:11,xp:8, coins:4, col:"#5a3020",eyes:"#ff4400" },
  runner:  { name:"Runner",       hp:38,  spd:108, dmg:8, size:9, xp:10,coins:5, col:"#3a2010",eyes:"#ffcc00" },
  armored: { name:"Armored Corps",hp:190, spd:40,  dmg:18,size:13,xp:20,coins:10,col:"#2a3040",eyes:"#ff6600" },
  heavy:   { name:"Heavy Mutant", hp:340, spd:28,  dmg:38,size:18,xp:35,coins:18,col:"#3a2030",eyes:"#ff0066" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TILE MAPS
const TILE_MAPS = {
  1:[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],[1,0,2,0,1,0,1,1,0,0,2,0,1,0,1,0,2,0,0,1],[1,0,0,0,4,0,0,0,0,0,0,0,0,0,4,0,0,0,0,1],[1,1,1,4,1,1,0,1,1,2,0,2,1,0,1,1,4,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,2,0,2,0,0,0,0,0,0,2,0,2,0,2,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,4,1,1,0,1,1,2,0,2,1,0,1,1,4,1,1,1],[1,0,0,0,4,0,0,0,0,0,0,0,0,0,4,0,0,0,0,1],[1,0,2,0,1,0,1,1,0,0,2,0,1,0,1,0,2,0,0,1],[1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  2:[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,0,0,1,0,2,0,0,1,0,0,2,0,0,1,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,2,0,0,2,0,2,0,2,0,2,0,0,2,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,0,0,1,0,2,0,0,1,0,0,2,0,0,1,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  3:[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],[1,0,0,4,0,2,0,0,2,4,1,2,0,0,2,0,4,0,0,1],[1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],[1,1,4,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,4,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,2,0,0,0,0,0,0,0,0,0,0,2,0,2,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,4,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,4,1],[1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],[1,0,0,4,0,2,0,0,2,4,1,2,0,0,2,0,4,0,0,1],[1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  4:[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1],[1,0,2,2,0,0,0,0,1,0,0,0,0,1,0,0,2,2,0,1],[1,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,1],[1,0,0,0,2,0,0,0,1,0,0,0,0,1,0,0,0,2,0,1],[1,1,1,4,1,1,1,1,1,0,0,0,0,1,1,1,1,4,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,2,0,2,0,2,0,2,0,2,0,2,0,2,0,0,1],[1,1,1,4,1,1,1,1,1,0,0,0,0,1,1,1,1,4,1,1],[1,0,0,0,2,0,0,0,1,0,0,0,0,1,0,0,0,2,0,1],[1,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,1],[1,0,2,2,0,0,0,0,1,0,0,0,0,1,0,0,2,2,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
};

// Reuse and vary maps for levels 5-10
const getMap = (lvlId) => {
  const base = TILE_MAPS[((lvlId - 1) % 4) + 1];
  return base.map(row => [...row]);
};

const wallAt = (map, wx, wy) => {
  if (!map) return true;
  const c = Math.floor(wx / TILE), r = Math.floor(wy / TILE);
  if (r < 0 || r >= map.length || c < 0 || c >= (map[0]?.length || 0)) return true;
  return map[r][c] === 1;
};

const slideMove = (map, ox, oy, nx, ny, radius) => {
  const check = (x, y) => {
    const offsets = [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,-radius],[radius,-radius],[-radius,radius]];
    return offsets.some(([dx,dy]) => wallAt(map, x+dx, y+dy));
  };
  if (!check(nx, ny)) return { x:nx, y:ny };
  if (!check(nx, oy)) return { x:nx, y:oy };
  if (!check(ox, ny)) return { x:ox, y:ny };
  return { x:ox, y:oy };
};

const getFloorSpots = (map) => {
  const pts = [];
  if (!map) return pts;
  for (let r = 1; r < map.length-1; r++)
    for (let c = 1; c < (map[0]?.length||0)-1; c++)
      if (map[r][c] === 0) pts.push({ x:c*TILE+TILE/2, y:r*TILE+TILE/2 });
  return pts;
};

const getEdgeSpots = (map) => {
  const rows = map?.length || 0, cols = map?.[0]?.length || 0;
  const pts = [];
  for (let r = 1; r < rows-1; r++)
    for (let c = 1; c < cols-1; c++)
      if (map[r][c] === 0 && (r<=2||r>=rows-3||c<=2||c>=cols-3)) pts.push({ x:c*TILE+TILE/2, y:r*TILE+TILE/2 });
  return pts.length > 0 ? pts : getFloorSpots(map).slice(0, 8);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT SAVE
const DEFAULT_SAVE = {
  coins:0, p1Weapon:"m9", p1Unlocked:["m9"], p2Weapon:"m9", p2Unlocked:["m9"],
  upgrades:{}, powerups:{}, campaignProgress:0,
  stats:{ totalKills:0,totalDeaths:0,bestLevel:0,totalCoins:0,gamesPlayed:0,totalRevives:0 },
  sfxOn:true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARTICLES
const addBlood   = (P, x, y, n=6) => { for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=30+Math.random()*90;P.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.45+Math.random()*0.35,maxLife:0.7,col:"#8a1a00",r:2+Math.random()*3,g:40});} };
const addMuzzle  = (P, x, y, ang) => { for(let i=0;i<5;i++){const a=ang+(Math.random()-.5)*.5,sp=80+Math.random()*120;P.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.12,maxLife:.12,col:"#ffcc44",r:1.5+Math.random()*2,g:0});} };
const addExplode = (P, x, y) => { const cs=["#ff8800","#ff4400","#ffcc00","#ff2200","#ffffff"];for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,sp=80+Math.random()*220;P.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.5+Math.random()*.6,maxLife:1,col:cs[i%5],r:3+Math.random()*7,g:20});} };
const addRevive  = (P, x, y) => { for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2,sp=40+Math.random()*40;P.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.7,maxLife:.7,col:"#44ff88",r:2+Math.random()*3,g:-15});} };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
export default function DeadSignal() {
  const [mounted,   setMounted]   = useState(false);
  const [save,      setSave]      = useState(DEFAULT_SAVE);
  const [screen,    setScreen]    = useState("menu");
  const [shopTab,   setShopTab]   = useState("weapons");
  const [selLevel,  setSelLevel]  = useState(1);
  const [briefLevel,setBriefLevel]= useState(null);   // level data being briefed
  const [briefPage, setBriefPage] = useState(0);
  const [gameLevel, setGameLevel] = useState(null);   // active level data
  const [gameResult,setGameResult]= useState(null);
  const [notif,     setNotif]     = useState(null);

  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  // Persist
  useEffect(() => {
    try { const r = localStorage.getItem(SK); if (r) { const p = JSON.parse(r); setSave({...DEFAULT_SAVE,...p,stats:{...DEFAULT_SAVE.stats,...(p.stats||{})}}); } } catch(_){}
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => { try { localStorage.setItem(SK, JSON.stringify(save)); } catch(_){} }, 400);
    return () => clearTimeout(t);
  }, [save, mounted]);
  useEffect(() => {
    const flush = () => { try { localStorage.setItem(SK, JSON.stringify(saveRef.current)); } catch(_){} };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const notify = (msg, col="#88ff44") => { setNotif({msg,col}); setTimeout(()=>setNotif(null),2500); };

  // Compute player stats from upgrades
  const getStats = useCallback((charNum) => {
    const ups = save.upgrades || {};
    const prefix = charNum === 1 ? "k_" : "l_";
    const lvl = (k) => ups[prefix + k] || 0;
    const wpnKey = charNum === 1 ? save.p1Weapon : save.p2Weapon;
    const wpn = WEAPONS[wpnKey] || WEAPONS.m9;
    return {
      maxHp:      100 + lvl("hp")*30,
      armor:      lvl("armor")*8,
      regen:      charNum === 2 ? lvl("regen")*3 : 0,
      speedMult:  1 + (charNum===2 ? lvl("speed")*0.15 : 0),
      healPow:    1 + (charNum===2 ? lvl("heal")*0.25 : 0),
      revTimeMult:1 - (charNum===2 ? lvl("revive")*0.20 : 0),
      hasDash:    lvl("dash") >= 1,
      scanner:    charNum===2 && lvl("scan") >= 1,
      weapon: {
        ...wpn,
        dmg:    Math.round(wpn.dmg    * (1 + (charNum===1 ? lvl("dmg")*0.18 : 0))),
        rps:    wpn.rps    * (1 + (charNum===1 ? lvl("rof")*0.15 : 0)),
        reload: wpn.reload * (1 - (charNum===1 ? lvl("reload")*0.20 : 0)),
        mag:    Math.round(wpn.mag    * (1 + (charNum===1 ? lvl("mag")*0.25 : 0))),
        range:  Math.round(wpn.range  * (1 + (charNum===1 ? lvl("range")*0.20 : 0))),
      },
    };
  }, [save]);

  const purchase = useCallback((cat, key) => {
    getAC();
    if (cat === "p1weapon" || cat === "p2weapon") {
      const w = WEAPONS[key]; if (!w) return;
      const field  = cat === "p1weapon" ? "p1Weapon" : "p2Weapon";
      const uField = cat === "p1weapon" ? "p1Unlocked" : "p2Unlocked";
      if ((save[uField]||[]).includes(key)) {
        if (save.sfxOn) SFX.menu();
        setSave(p => ({ ...p, [field]: key }));
        notify(`Equipped: ${w.name}`);
        return;
      }
      if (save.coins < w.cost) { if(save.sfxOn)SFX.deny(); notify("Insufficient funds","#ff4444"); return; }
      if (save.sfxOn) SFX.buy();
      setSave(p => ({ ...p, coins:p.coins-w.cost, [uField]:[...(p[uField]||[]),key], [field]:key }));
      notify(`Unlocked: ${w.name}!`);
      return;
    }
    if (cat === "upgrade") {
      const up = UPGRADES[key]; if (!up) return;
      const lvl = (save.upgrades||{})[key] || 0;
      if (lvl >= up.max) { notify("Already maxed","#ffaa00"); return; }
      const cost = up.cost * (lvl + 1);
      if (save.coins < cost) { if(save.sfxOn)SFX.deny(); notify("Insufficient funds","#ff4444"); return; }
      if (save.sfxOn) SFX.buy();
      setSave(p => ({ ...p, coins:p.coins-cost, upgrades:{...(p.upgrades||{}),[key]:lvl+1} }));
      notify(`${up.name} → Rank ${lvl+1}`);
      return;
    }
    if (cat === "powerup") {
      const pw = POWERUPS[key]; if (!pw) return;
      if (save.coins < pw.cost) { if(save.sfxOn)SFX.deny(); notify("Insufficient funds","#ff4444"); return; }
      if (save.sfxOn) SFX.buy();
      const cur = (save.powerups||{})[key] || 0;
      setSave(p => ({ ...p, coins:p.coins-pw.cost, powerups:{...(p.powerups||{}),[key]:cur+pw.uses} }));
      notify(`+${pw.uses}× ${pw.name}`);
      return;
    }
  }, [save]);

  const startBriefing = (lvlId) => {
    getAC();
    const lvl = LEVELS[lvlId - 1]; if (!lvl) return;
    setBriefLevel(lvl);
    setBriefPage(0);
    setScreen("briefing");
  };

  const onGameEnd = useCallback((result) => {
    setSave(prev => ({
      ...prev,
      coins: prev.coins + (result.coinsEarned || 0),
      campaignProgress: result.won ? Math.max(prev.campaignProgress, result.levelId || 0) : prev.campaignProgress,
      stats: {
        ...prev.stats,
        totalKills:   prev.stats.totalKills   + (result.kills||0),
        totalDeaths:  prev.stats.totalDeaths  + (result.deaths||0),
        totalRevives: prev.stats.totalRevives + (result.revives||0),
        bestLevel:    Math.max(prev.stats.bestLevel, result.levelId||0),
        totalCoins:   prev.stats.totalCoins   + (result.coinsEarned||0),
        gamesPlayed:  prev.stats.gamesPlayed  + 1,
      },
    }));
    setGameResult(result);
    setScreen(result.won ? "victory" : "gameover");
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ width:"100vw",minHeight:"100vh",background:"#060706",
      fontFamily:"'Barlow Condensed','Oswald',sans-serif",color:"#c8e8b0",
      display:"flex",flexDirection:"column",alignItems:"center",overflowX:"hidden",position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;user-select:none;-webkit-tap-highlight-color:transparent;}
        body{margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#1e2e14;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
        @keyframes scanline{0%{background-position:0 0}100%{background-position:0 40px}}
        @keyframes slideIn{from{opacity:0;transform:scale(.92) translateY(5px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes flicker{0%,100%{opacity:1}92%{opacity:1}94%{opacity:.7}96%{opacity:1}98%{opacity:.85}}
        @keyframes typewriter{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0% 0 0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes waveIn{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes bloodDrip{from{transform:scaleY(0);transform-origin:top}to{transform:scaleY(1);transform-origin:top}}
      `}</style>

      {/* Scanlines */}
      <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:100,
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)",
        animation:"scanline 10s linear infinite",opacity:.4}} />

      {/* Notification */}
      {notif && (
        <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,
          padding:"9px 22px",borderRadius:4,background:"rgba(0,0,0,0.95)",
          border:`1px solid ${notif.col}`,color:notif.col,fontWeight:700,letterSpacing:2,
          fontSize:13,fontFamily:"'IBM Plex Mono'",animation:"slideIn .22s ease both",
          boxShadow:`0 0 18px ${notif.col}55`,whiteSpace:"nowrap"}}>
          {notif.msg}
        </div>
      )}

      <div style={{position:"relative",zIndex:2,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 12px 32px"}}>
        {screen==="menu"     && <MenuScreen     save={save} onSelectLevel={()=>setScreen("levelsel")} onShop={()=>{getAC();if(save.sfxOn)SFX.menu();setScreen("shop");}} onStats={()=>setScreen("stats")} onSettings={()=>setScreen("settings")} />}
        {screen==="levelsel" && <LevelSelect    save={save} selLevel={selLevel} setSelLevel={setSelLevel} onBrief={startBriefing} onBack={()=>setScreen("menu")} />}
        {screen==="briefing" && <BriefingScreen level={briefLevel} page={briefPage} setPage={setBriefPage}
          onStart={()=>{ setGameLevel(briefLevel); setScreen("game"); }}
          onBack={()=>setScreen("levelsel")} save={save} />}
        {screen==="game"     && gameLevel && <GameScreen level={gameLevel} save={save} getStats={getStats} onEnd={onGameEnd} onBack={()=>setScreen("menu")} />}
        {screen==="gameover" && <GameOverScreen result={gameResult} save={save} onRetry={()=>{ if(gameLevel){setScreen("briefing");setBriefPage(0);} }} onMenu={()=>setScreen("menu")} />}
        {screen==="victory"  && <VictoryScreen  result={gameResult} save={save} onNext={()=>{ const nxt=(gameLevel?.id||1)+1; if(nxt<=TOTAL_LEVELS){ setSelLevel(nxt); startBriefing(nxt); }else setScreen("menu"); }} onMenu={()=>setScreen("menu")} />}
        {screen==="shop"     && <ShopScreen     save={save} shopTab={shopTab} setShopTab={setShopTab} purchase={purchase} onBack={()=>setScreen("menu")} getStats={getStats} />}
        {screen==="settings" && <SettingsScreen save={save} setSave={setSave} onBack={()=>setScreen("menu")} />}
        {screen==="stats"    && <StatsScreen    save={save} onBack={()=>setScreen("menu")} />}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MENU
function MenuScreen({ save, onSelectLevel, onShop, onStats, onSettings }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:540,paddingTop:24,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",width:"100%",marginBottom:22}}>
        <div style={{fontSize:11,color:"#3a4a30",letterSpacing:2,padding:"4px 10px",border:"1px solid #1a2a12",borderRadius:3,fontFamily:"'IBM Plex Mono'"}}>DEAD SIGNAL  //  COOP REQUIRED</div>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:"rgba(136,255,68,.06)",border:"1px solid rgba(136,255,68,.18)",color:"#88ff44",fontWeight:700,fontSize:14,fontFamily:"'IBM Plex Mono'"}}>
          {save.coins.toLocaleString()} <span style={{fontSize:11,opacity:.6}}>¢</span>
        </div>
      </div>

      {/* Title */}
      <div style={{textAlign:"center",marginBottom:8,animation:"flicker 12s infinite"}}>
        <div style={{fontFamily:"'Barlow Condensed'",fontSize:"clamp(56px,15vw,96px)",fontWeight:900,letterSpacing:6,lineHeight:1,
          color:"#c8e000",textShadow:"0 0 24px rgba(200,224,0,.5),0 0 48px rgba(200,224,0,.2),3px 3px 0 rgba(0,0,0,.9)"}}>
          DEAD
        </div>
        <div style={{fontFamily:"'Barlow Condensed'",fontSize:"clamp(56px,15vw,96px)",fontWeight:900,letterSpacing:6,lineHeight:1,
          color:"#ff2200",textShadow:"0 0 24px rgba(255,34,0,.5),0 0 48px rgba(255,34,0,.2),3px 3px 0 rgba(0,0,0,.9)",marginTop:-8}}>
          SIGNAL
        </div>
        <div style={{fontFamily:"'IBM Plex Mono'",fontSize:11,letterSpacing:5,color:"#2a3a20",marginTop:4}}>CO-OP  SURVIVAL  ·  HARKOV  INCIDENT  2031</div>
      </div>

      {/* Characters */}
      <div style={{display:"flex",gap:12,marginBottom:22,width:"100%",justifyContent:"center"}}>
        <CharCard name="SGT. KANE MORROW" role="Heavy Assault" desc="P1 — WASD + Mouse" col="#88ff44" />
        <CharCard name="DR. LEILA VASQUEZ" role="Combat Medic" desc="P2 — IJKL + Auto-aim" col="#44ccff" />
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",justifyContent:"center"}}>
        {[["LEVELS",`${save.campaignProgress}/${TOTAL_LEVELS}`],["KILLS",save.stats.totalKills],["REVIVES",save.stats.totalRevives]].map(([l,v])=>(
          <div key={l} style={{padding:"4px 12px",borderRadius:3,background:"rgba(136,255,68,.04)",border:"1px solid #1a2a10",fontSize:11}}>
            <span style={{color:"#3a4a20",marginRight:4,fontFamily:"'IBM Plex Mono'"}}>{l}</span>
            <span style={{fontWeight:700,color:"#88ff44"}}>{v}</span>
          </div>
        ))}
      </div>

      <GBtn label="DEPLOY — TWO PLAYERS REQUIRED" col="#88ff44" onClick={onSelectLevel} big />

      <div style={{display:"flex",gap:9,marginTop:12,flexWrap:"wrap",justifyContent:"center"}}>
        {[[onShop,"⚙ ARMORY"],[onStats,"☠ DEBRIEF"],[onSettings,"◈ SETTINGS"]].map(([fn,lbl])=>(
          <button key={lbl} onClick={fn} style={{padding:"9px 16px",background:"transparent",border:"1px solid #1a2a10",color:"#3a4a28",cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:2,borderRadius:3,transition:"all .18s",fontFamily:"'Barlow Condensed'"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#88ff4466";e.currentTarget.style.color="#88ff44";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a2a10";e.currentTarget.style.color="#3a4a28";}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{marginTop:14,fontSize:9,color:"#1a2a10",letterSpacing:2,textAlign:"center",lineHeight:2,fontFamily:"'IBM Plex Mono'"}}>
        P1: WASD MOVE · MOUSE AIM+SHOOT · Q GRENADE · E MEDKIT · F EMP · SHIFT DASH · R RELOAD<br/>
        P2: IJKL MOVE · AUTO-AIMS · U GRENADE · O MEDKIT · CTRL DASH · P RELOAD<br/>
        BOTH PLAYERS MUST SURVIVE — FORCED CO-OP
      </div>
    </div>
  );
}

function CharCard({ name, role, desc, col }) {
  return (
    <div style={{flex:1,minWidth:180,maxWidth:240,padding:"12px 14px",border:`1px solid ${col}22`,borderRadius:4,background:`${col}06`}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:14,fontWeight:700,letterSpacing:2,color:col,marginBottom:2}}>{name}</div>
      <div style={{fontSize:11,color:"#446633",fontWeight:700,letterSpacing:1,marginBottom:6,fontFamily:"'Barlow Condensed'"}}>{role}</div>
      <div style={{fontSize:10,color:"#2a3a20",fontFamily:"'IBM Plex Mono'",letterSpacing:1}}>{desc}</div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEVEL SELECT
function LevelSelect({ save, selLevel, setSelLevel, onBrief, onBack }) {
  return (
    <div style={{width:"100%",maxWidth:720,animation:"fadeUp .35s ease"}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:20,fontWeight:800,color:"#88ff44",letterSpacing:4,marginBottom:16}}>CAMPAIGN SELECT</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(215px,1fr))",gap:8,maxHeight:"62vh",overflowY:"auto",paddingRight:4}}>
        {LEVELS.map(lvl => {
          const unlocked = lvl.id===1 || lvl.id<=save.campaignProgress+1;
          const completed = lvl.id<=save.campaignProgress;
          const selected = selLevel===lvl.id;
          return (
            <div key={lvl.id} onClick={()=>unlocked&&setSelLevel(lvl.id)}
              style={{padding:14,borderRadius:4,cursor:unlocked?"pointer":"not-allowed",position:"relative",transition:"all .18s",
                border:`2px solid ${selected?"#88ff44":completed?"#2a4a18":unlocked?"#1a2a10":"#0e160a"}`,
                background:selected?"rgba(136,255,68,.07)":completed?"rgba(40,70,24,.12)":"rgba(0,0,0,.35)",
                opacity:unlocked?1:.38,
                boxShadow:selected?"0 0 16px rgba(136,255,68,.18)":"none"}}
              onMouseEnter={e=>{if(unlocked&&!selected)e.currentTarget.style.borderColor="#88ff4455";}}
              onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor=completed?"#2a4a18":unlocked?"#1a2a10":"#0e160a";}}>
              {completed && <div style={{position:"absolute",top:8,right:10,color:"#88ff44",fontSize:12}}>✓</div>}
              {lvl.boss && <div style={{position:"absolute",top:8,right:completed?26:10,fontSize:9,color:"#ff4400",fontFamily:"'IBM Plex Mono'",letterSpacing:1}}>BOSS</div>}
              <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:13,letterSpacing:1,color:unlocked?"#88ff44":"#1e2e14",marginBottom:2}}>
                {String(lvl.id).padStart(2,"0")} — {lvl.name}
              </div>
              <div style={{fontSize:9,color:"#2a3a20",marginBottom:6,fontFamily:"'IBM Plex Mono'",lineHeight:1.5}}>
                {lvl.setting}
              </div>
              <div style={{fontSize:10,color:"#3a4a28",lineHeight:1.5,fontFamily:"'IBM Plex Mono'"}}>{lvl.lines[0]?.slice(0,55)}...</div>
              <div style={{display:"flex",gap:8,marginTop:8,fontSize:9,color:"#2a3a20",fontFamily:"'IBM Plex Mono'"}}>
                <span>🌊 {lvl.waves} WAVES</span>
                <span>¢ +{lvl.reward}</span>
                {lvl.boss && <span style={{color:"#ff4400"}}>⚠ BOSS</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <GBtn label={`BRIEF — LEVEL ${selLevel}`} col="#88ff44" onClick={()=>onBrief(selLevel)} />
        <GBtn label="← BACK" col="#336622" onClick={onBack} small />
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRIEFING SCREEN
function BriefingScreen({ level, page, setPage, onStart, onBack, save }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charDone, setCharDone] = useState(false);
  const totalLines = (level?.lines||[]).length;
  const totalPages = Math.ceil(totalLines / 2) + 1; // +1 for char dialogue

  useEffect(() => { setLineIdx(0); setCharDone(false); }, [page]);

  if (!level) return null;
  const isCharPage = page >= Math.ceil(totalLines / 2);
  const pageLines = isCharPage
    ? level.charLines || []
    : (level.lines||[]).slice(page*2, page*2+2);

  return (
    <div style={{width:"100%",maxWidth:700,animation:"fadeUp .35s ease"}}>
      {/* Header bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"10px 16px",background:"rgba(0,0,0,.6)",border:"1px solid #1a2a10",borderRadius:4}}>
        <div>
          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:9,color:"#2a3a20",letterSpacing:3,marginBottom:2}}>MISSION BRIEFING  ·  LEVEL {String(level.id).padStart(2,"0")}</div>
          <div style={{fontFamily:"'Barlow Condensed'",fontSize:22,fontWeight:800,letterSpacing:3,color:"#88ff44"}}>{level.name}</div>
          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:"#3a4a28",letterSpacing:1,marginTop:2}}>{level.setting}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#2a3a20",fontFamily:"'IBM Plex Mono'",letterSpacing:2,marginBottom:6}}>OBJECTIVE</div>
          <div style={{fontSize:13,color:"#ffcc44",fontFamily:"'IBM Plex Mono'",letterSpacing:1,maxWidth:240,lineHeight:1.4}}>{level.objective}</div>
        </div>
      </div>

      {/* Briefing content */}
      <div style={{minHeight:200,padding:"20px 24px",background:"rgba(0,0,0,.5)",border:"1px solid #1a2a10",borderRadius:4,marginBottom:14}}>
        {isCharPage ? (
          <div>
            <div style={{fontSize:9,color:"#2a3a20",fontFamily:"'IBM Plex Mono'",letterSpacing:3,marginBottom:16}}>FIELD COMMUNICATION — ENCRYPTED</div>
            {pageLines.map((line, i) => (
              <div key={i} style={{marginBottom:14,padding:"10px 14px",background:"rgba(0,0,0,.4)",border:`1px solid ${i===0?"rgba(136,255,68,.15)":"rgba(68,204,255,.15)"}`,borderRadius:3,animation:`waveIn .3s ease ${i*.12}s both`}}>
                <div style={{fontFamily:"'Barlow Condensed'",fontStyle:"italic",fontSize:15,fontWeight:700,lineHeight:1.5,color:i===0?"#a0cc80":"#80b8d0",letterSpacing:.5}}>{line}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{fontSize:9,color:"#2a3a20",fontFamily:"'IBM Plex Mono'",letterSpacing:3,marginBottom:16}}>MISSION INTELLIGENCE  ·  CDC CLASSIFICATION ALPHA</div>
            {pageLines.map((line, i) => (
              <div key={i} style={{display:"flex",gap:12,marginBottom:14,animation:`waveIn .3s ease ${i*.1}s both`}}>
                <div style={{color:"#88ff44",fontSize:14,marginTop:2,flexShrink:0}}>▸</div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:13,color:"#a0b890",lineHeight:1.7,letterSpacing:.3}}>{line}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center"}}>
        <GBtn label="← BACK" col="#2a3a20" onClick={()=>{ if(page===0) onBack(); else setPage(p=>p-1); }} small />
        <div style={{fontSize:9,color:"#2a3a20",fontFamily:"'IBM Plex Mono'",letterSpacing:2}}>PAGE {page+1} / {totalPages}</div>
        {page < totalPages - 1
          ? <GBtn label="CONTINUE →" col="#88ff44" onClick={()=>setPage(p=>p+1)} />
          : <GBtn label="DEPLOY ▶" col="#88ff44" onClick={onStart} />
        }
      </div>
      <button onClick={onStart} style={{marginTop:10,width:"100%",padding:"6px",background:"transparent",border:"none",color:"#1e2e14",cursor:"pointer",fontSize:10,fontFamily:"'IBM Plex Mono'",letterSpacing:2}}
        onMouseEnter={e=>e.currentTarget.style.color="#336622"}
        onMouseLeave={e=>e.currentTarget.style.color="#1e2e14"}>
        [SKIP BRIEFING — DEPLOY IMMEDIATELY]
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME CANVAS — The actual game engine
function GameScreen({ level, save, getStats, onEnd, onBack }) {
  const canvasRef = useRef(null);
  const GS = useRef(null);           // mutable game state
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const mouseRef = useRef({ x:CW/2, y:CH/2, down:false });
  const rectRef = useRef(null);
  const pauseRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [uiSnap, setUiSnap] = useState(null);

  // Build player from stats
  const buildPlayer = useCallback((charNum, startX, startY) => {
    const st = getStats(charNum);
    const w = { ...st.weapon, key: charNum===1 ? save.p1Weapon : save.p2Weapon };
    const isP2 = charNum === 2;
    return {
      id: charNum, x: startX, y: startY,
      hp: st.maxHp, maxHp: st.maxHp, armor: st.armor,
      regen: st.regen, regenTimer: 0,
      speed: (isP2 ? 148 : 145) * (st.speedMult || 1),
      hasDash: st.hasDash, dashCD: 0, dashDur: 0, dvx: 0, dvy: 0,
      healPow: st.healPow || 1,
      revTimeBonus: st.revTimeMult || 1,
      scanner: st.scanner || false,
      weapon: w, curAmmo: w.mag, reloading: 0,
      shootCD: 0, angle: 0,
      alive: true, downed: false, reviveTimer: 0,
      shield: 0, stunTimer: 0,
      kills: 0, col: isP2 ? "#44ccff" : "#88ff44",
      name: isP2 ? "VASQUEZ" : "MORROW",
      isP2,
      // Controls
      ctrl: isP2
        ? { up:"KeyI",down:"KeyK",left:"KeyJ",right:"KeyL",dash:"ControlLeft",reload:"KeyP" }
        : { up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",dash:"ShiftLeft",reload:"KeyR" },
      powerups: { ...(save.powerups || {}) },
    };
  }, [getStats, save]);

  const initGame = useCallback(() => {
    const map = getMap(level.id);
    const floor = getFloorSpots(map);
    const cx = Math.floor(CW/2), cy = Math.floor(CH/2);
    // Pick two floor spots near center for players
    const centerFloor = floor.filter(p => Math.hypot(p.x-cx, p.y-cy) < 120);
    const p1pos = centerFloor[0] || { x:cx-30, y:cy };
    const p2pos = centerFloor[1] || { x:cx+30, y:cy };

    GS.current = {
      map, floor,
      edgeSpots: getEdgeSpots(map),
      players: [buildPlayer(1, p1pos.x, p1pos.y), buildPlayer(2, p2pos.x, p2pos.y)],
      enemies: [], bullets: [], particles: [], pickups: [], turrets: [],
      phase: "spawning",    // spawning | wave | intermission | gameover | victory
      wave: 1, totalWaves: level.waves,
      enemyDefs: level.enemies || ["walker"],
      enemyCounts: level.counts || [15],
      spawnQueue: 0, spawnTimer: 2.0, waveTimer: 0, interTimer: 0,
      isBoss: level.boss || false,
      bossName: level.bossName || "BOSS",
      bossSpawned: false, bossKilled: false,
      totalKills: 0, coinsEarned: 0, revives: 0,
      deaths: 0, levelId: level.id,
      time: 0, screenShake: 0,
      slowTimer: 0, flashbangTimer: 0,
      objReached: false,
    };
  }, [level, buildPlayer]);

  // ── Spawn enemy ──────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((isBoss = false) => {
    const gs = GS.current; if (!gs) return;
    const edges = gs.edgeSpots;
    if (!edges.length) return;
    const pos = edges[Math.floor(Math.random() * edges.length)];
    const waveScale = 1 + (gs.wave - 1) * 0.1;

    let typeKey;
    if (isBoss) {
      typeKey = gs.wave >= 3 ? "heavy" : "armored";
    } else {
      const pool = gs.enemyDefs;
      typeKey = pool[Math.floor(Math.random() * pool.length)];
    }
    const def = ENEMY_DEF[typeKey] || ENEMY_DEF.walker;

    gs.enemies.push({
      id: Math.random(),
      x: pos.x, y: pos.y,
      hp: isBoss ? def.hp * 8 * waveScale : Math.round(def.hp * waveScale),
      maxHp: 0,
      spd: isBoss ? def.spd * 0.55 : def.spd * (0.9 + Math.random() * 0.2) * (gs.slowTimer > 0 ? 0.35 : 1),
      dmg: isBoss ? def.dmg * 2.5 : def.dmg,
      size: isBoss ? def.size * 2.2 : def.size,
      col: isBoss ? "#cc2200" : def.col,
      eyes: def.eyes,
      type: typeKey, isBoss,
      attackCD: 0, bleedTimer: 0,
      coins: isBoss ? 80 : def.coins,
      xp: isBoss ? 200 : def.xp,
    });
    const e = gs.enemies[gs.enemies.length - 1];
    e.maxHp = e.hp;
  }, []);

  // ── Main loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((ts) => {
    if (pauseRef.current) { rafRef.current = requestAnimationFrame(loop); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gs = GS.current; if (!gs) return;

    if (!loop._lt) loop._lt = ts;
    const dt = Math.min((ts - loop._lt) / 1000, 0.05);
    loop._lt = ts;
    gs.time += dt;
    if (gs.screenShake > 0) gs.screenShake = Math.max(0, gs.screenShake - dt * 9);

    if (gs.phase !== "gameover" && gs.phase !== "victory") {
      tick(gs, dt);
    }
    draw(ctx, gs);

    // HUD throttle
    if (Math.round(gs.time * 15) % 3 === 0) {
      setUiSnap({
        phase: gs.phase, wave: gs.wave, totalWaves: gs.totalWaves,
        players: gs.players.map(p => ({
          id:p.id, hp:p.hp, maxHp:p.maxHp, col:p.col, name:p.name,
          curAmmo:p.curAmmo, mag:p.weapon.mag, reloading:p.reloading,
          alive:p.alive, downed:p.downed, reviveTimer:p.reviveTimer,
          shield:p.shield, kills:p.kills, powerups:p.powerups,
        })),
        enemies: gs.enemies.length, kills: gs.totalKills,
        coins: gs.coinsEarned, slow: gs.slowTimer > 0,
        interTimer: gs.interTimer,
      });
    }

    if (gs.phase === "gameover") {
      onEnd({ won:false, kills:gs.totalKills, deaths:gs.deaths, revives:gs.revives, coinsEarned:gs.coinsEarned, levelId:gs.levelId });
      return;
    }
    if (gs.phase === "victory") {
      onEnd({ won:true, kills:gs.totalKills, deaths:gs.deaths, revives:gs.revives, coinsEarned:gs.coinsEarned + level.reward, levelId:gs.levelId });
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [onEnd, level.reward, spawnEnemy]); // eslint-disable-line

  // ── Tick — all update logic in one non-hook function ──────────────────────
  const tick = (gs, dt) => {
    tickPlayers(gs, dt);
    tickBullets(gs, dt);
    tickEnemies(gs, dt);
    tickParticles(gs, dt);
    tickPickups(gs, dt);
    tickTurrets(gs, dt);
    tickWave(gs, dt);
    if (gs.slowTimer > 0) gs.slowTimer -= dt;
    if (gs.flashbangTimer > 0) gs.flashbangTimer -= dt;
  };

  const tickPlayers = (gs, dt) => {
    const allDead = gs.players.every(p => !p.alive && !p.downed);
    if (allDead) { gs.phase = "gameover"; return; }

    gs.players.forEach(p => {
      if (!p.alive) {
        if (p.downed) {
          p.reviveTimer -= dt;
          if (p.reviveTimer <= 0) { p.alive = false; p.downed = false; gs.deaths++; if (save.sfxOn) SFX.gameover(); }
          // Other player near → revive
          const other = gs.players.find(o => o.id !== p.id && o.alive);
          if (other && Math.hypot(other.x - p.x, other.y - p.y) < 32) {
            p.reviveTimer -= dt * 2; // faster when partner is close
            addRevive(gs.particles, p.x, p.y);
            if (p.reviveTimer <= 0) {
              p.alive = true; p.downed = false; p.hp = Math.round(p.maxHp * 0.35);
              gs.revives++; if (save.sfxOn) SFX.revived();
            } else { if (save.sfxOn && Math.random() < 0.05) SFX.reviving(); }
          }
        }
        return;
      }

      // Movement
      const C = p.ctrl;
      let vx = 0, vy = 0;
      if (keysRef.current[C.up])   vy -= 1;
      if (keysRef.current[C.down]) vy += 1;
      if (keysRef.current[C.left]) vx -= 1;
      if (keysRef.current[C.right])vx += 1;
      const ln = Math.hypot(vx, vy);
      if (ln > 0) { vx /= ln; vy /= ln; }

      // Dash
      if (p.hasDash) {
        p.dashCD = Math.max(0, p.dashCD - dt);
        if (p.dashDur > 0) {
          p.dashDur -= dt;
          const moved = slideMove(gs.map, p.x, p.y, p.x + p.dvx*380*dt, p.y + p.dvy*380*dt, 10);
          p.x = moved.x; p.y = moved.y;
        } else {
          const moved = slideMove(gs.map, p.x, p.y, p.x + vx*p.speed*dt, p.y + vy*p.speed*dt, 10);
          p.x = moved.x; p.y = moved.y;
          if (keysRef.current[C.dash] && p.dashCD <= 0 && ln > 0) {
            p.dashCD = 1.3; p.dashDur = 0.18; p.dvx = vx; p.dvy = vy;
            if (save.sfxOn) SFX.dash();
          }
        }
      } else {
        const moved = slideMove(gs.map, p.x, p.y, p.x + vx*p.speed*dt, p.y + vy*p.speed*dt, 10);
        p.x = moved.x; p.y = moved.y;
      }

      // Aim
      if (!p.isP2 && rectRef.current) {
        const scX = CW / rectRef.current.width, scY = CH / rectRef.current.height;
        p.angle = Math.atan2((mouseRef.current.y - p.y), (mouseRef.current.x - p.x));
        // Slight correction for canvas scale
        const absX = (mouseRef.current.clientX - rectRef.current.left) * scX;
        const absY = (mouseRef.current.clientY - rectRef.current.top) * scY;
        p.angle = Math.atan2(absY - p.y, absX - p.x);
      } else if (p.isP2) {
        // Auto-aim P2 at nearest enemy
        let near = null, nd = 99999;
        gs.enemies.forEach(e => { const d=Math.hypot(e.x-p.x,e.y-p.y); if(d<nd){nd=d;near=e;} });
        if (near) p.angle = Math.atan2(near.y - p.y, near.x - p.x);
        else if (ln > 0) p.angle = Math.atan2(vy, vx);
      }

      // Shield timer
      if (p.shield > 0) p.shield -= dt;

      // Regen
      if (p.regen > 0) {
        p.regenTimer = (p.regenTimer || 0) + dt;
        if (p.regenTimer >= 5) { p.hp = Math.min(p.maxHp, p.hp + p.regen); p.regenTimer = 0; }
      }

      // Shoot
      p.shootCD = Math.max(0, p.shootCD - dt);
      const wantShoot = p.isP2
        ? (keysRef.current["Numpad0"] || keysRef.current["KeyN"] || gs.enemies.length > 0)
        : (mouseRef.current.down || keysRef.current["Space"]);
      if (wantShoot && p.shootCD <= 0 && p.curAmmo > 0 && p.reloading <= 0) {
        const w = p.weapon;
        const nPellets = w.pellets || 1;
        for (let pel = 0; pel < nPellets; pel++) {
          const ang = p.angle + (nPellets > 1 ? (Math.random()-0.5)*w.spread*2 : (Math.random()-0.5)*w.spread);
          gs.bullets.push({
            x: p.x + Math.cos(p.angle)*16, y: p.y + Math.sin(p.angle)*16,
            vx: Math.cos(ang) * 540, vy: Math.sin(ang) * 540,
            dmg: Math.round(w.dmg / (nPellets > 1 ? nPellets * 0.7 : 1)),
            range: w.range, traveled: 0,
            owner: p.id, size: w.cat==="sniper"?4:3,
            pierce: w.cat==="sniper",
            tracer: w.cat==="rifle"||w.cat==="sniper"||w.cat==="lmg",
          });
        }
        addMuzzle(gs.particles, p.x + Math.cos(p.angle)*16, p.y + Math.sin(p.angle)*16, p.angle);
        p.shootCD = 1 / w.rps;
        p.curAmmo--;
        if (save.sfxOn) { if (w.cat==="shotgun") SFX.shotgun(); else SFX.shoot(); }
      }

      // Reload
      if (p.reloading > 0) {
        p.reloading -= dt;
        if (p.reloading <= 0) { p.curAmmo = p.weapon.mag; p.reloading = 0; }
      }
      if (p.curAmmo === 0 && p.reloading <= 0) { p.reloading = p.weapon.reload; if (save.sfxOn) SFX.reload(); }
      if (keysRef.current[C.reload] && p.curAmmo < p.weapon.mag && p.reloading <= 0) { p.reloading = p.weapon.reload; if (save.sfxOn) SFX.reload(); }
    });

    // Power-up inputs (P1 = Q,E,F,T,G)
    const p1 = gs.players[0];
    if (p1 && p1.alive) {
      usePU(gs, p1, "KeyQ", "grenade", () => { addExplode(gs.particles, mouseRef.current.absX||p1.x+100, mouseRef.current.absY||p1.y+100); blastEnemies(gs, mouseRef.current.absX||p1.x+100, mouseRef.current.absY||p1.y+100, 100, 200, p1); gs.screenShake = 1.5; });
      usePU(gs, p1, "KeyE", "medkit",  () => { p1.hp = Math.min(p1.maxHp, p1.hp + Math.round(80 * p1.healPow)); if (save.sfxOn) SFX.medkit(); });
      usePU(gs, p1, "KeyF", "slowfield",() => { gs.slowTimer = 5; gs.enemies.forEach(e=>e.spd=ENEMY_DEF[e.type]?.spd*0.35||e.spd); if (save.sfxOn) SFX.medkit(); });
      usePU(gs, p1, "KeyT", "turret",   () => { gs.turrets.push({x:p1.x,y:p1.y,life:20,shootCD:0,angle:0}); if (save.sfxOn) SFX.door(); });
      usePU(gs, p1, "KeyG", "airstrike",() => { gs.enemies.forEach(e=>{addBlood(gs.particles,e.x,e.y,8);gs.coinsEarned+=e.coins;gs.totalKills++;p1.kills++;}); gs.enemies=[]; gs.screenShake=2.5; if (save.sfxOn) SFX.grenade(); });
    }
    // P2 = U grenade, O medkit
    const p2 = gs.players[1];
    if (p2 && p2.alive) {
      usePU(gs, p2, "KeyU", "grenade", () => { const nearest=gs.enemies[0]; if(nearest){addExplode(gs.particles,nearest.x,nearest.y);blastEnemies(gs,nearest.x,nearest.y,100,200,p2);gs.screenShake=1.5;} });
      usePU(gs, p2, "KeyO", "medkit",  () => { p2.hp = Math.min(p2.maxHp, p2.hp + Math.round(80 * p2.healPow)); if (save.sfxOn) SFX.medkit(); });
    }
  };

  const usePU = (gs, player, keyCode, puKey, fn) => {
    if (keysRef.current[keyCode] && !keysRef.current["_"+keyCode]) {
      keysRef.current["_"+keyCode] = true;
      const count = (player.powerups || {})[puKey] || 0;
      if (count > 0) { player.powerups[puKey] = count - 1; fn(); }
    }
    if (!keysRef.current[keyCode]) keysRef.current["_"+keyCode] = false;
  };

  const blastEnemies = (gs, bx, by, radius, dmg, owner) => {
    gs.enemies = gs.enemies.filter(e => {
      const d = Math.hypot(e.x - bx, e.y - by);
      if (d < radius) {
        addBlood(gs.particles, e.x, e.y, 8);
        gs.totalKills++; if (owner) owner.kills++;
        gs.coinsEarned += e.coins;
        return false;
      }
      return true;
    });
  };

  const tickBullets = (gs, dt) => {
    gs.bullets = gs.bullets.filter(b => {
      const spd = Math.hypot(b.vx, b.vy);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.traveled += spd * dt;
      if (b.traveled > b.range || wallAt(gs.map, b.x, b.y)) return false;
      if (b.x < 0 || b.x > CW || b.y < 0 || b.y > CH) return false;

      let hitAny = false;
      for (let i = gs.enemies.length - 1; i >= 0; i--) {
        const e = gs.enemies[i];
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.size + b.size) {
          e.hp -= b.dmg; e.bleedTimer = 0.15;
          addBlood(gs.particles, e.x, e.y, 3);
          const owner = gs.players.find(p => p.id === b.owner);
          if (e.hp <= 0) {
            addBlood(gs.particles, e.x, e.y, 10);
            gs.coinsEarned += e.coins; gs.totalKills++;
            if (owner) owner.kills++;
            if (e.isBoss) { gs.bossKilled = true; if (save.sfxOn) SFX.boss(); }
            if (Math.random() < 0.07) gs.pickups.push({x:e.x,y:e.y,type:Math.random()<0.6?"medkit":"ammo",life:9});
            gs.enemies.splice(i, 1);
            if (save.sfxOn) SFX.kill();
            gs.screenShake = Math.min(gs.screenShake + (e.isBoss ? 1.8 : 0.25), 2.5);
          } else {
            if (save.sfxOn) SFX.hit();
          }
          hitAny = true;
          if (!b.pierce) return false;
        }
      }
      return true;
    });
  };

  const tickEnemies = (gs, dt) => {
    if (gs.flashbangTimer > 0) return; // stunned
    const slowMult = gs.slowTimer > 0 ? 0.35 : 1;
    gs.enemies.forEach(e => {
      let target = null; let td = 9999;
      gs.players.forEach(p => { if (!p.alive && !p.downed) return; const d = Math.hypot(p.x-e.x,p.y-e.y); if(d<td){td=d;target=p;} });
      if (!target) return;
      const dx = target.x - e.x, dy = target.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const moved = slideMove(gs.map, e.x, e.y, e.x + (dx/dist)*e.spd*slowMult*dt, e.y + (dy/dist)*e.spd*slowMult*dt, e.size * 0.7);
      e.x = moved.x; e.y = moved.y;
      if (e.bleedTimer > 0) e.bleedTimer -= dt;

      // Overlap push between enemies
      gs.enemies.forEach(o => { if(o===e)return; const sep=Math.hypot(o.x-e.x,o.y-e.y); if(sep<e.size+o.size&&sep>0.5){const px=(e.x-o.x)/sep,py=(e.y-o.y)/sep; e.x+=px*2;e.y+=py*2;} });

      // Attack
      e.attackCD = Math.max(0, e.attackCD - dt);
      if (td < e.size + 14 && e.attackCD <= 0) {
        e.attackCD = e.isBoss ? 0.75 : 1.3;
        if (target.shield > 0 || gs.flashbangTimer > 0) return;
        const dmgTaken = Math.max(1, e.dmg - target.armor);
        target.hp -= dmgTaken;
        gs.screenShake = Math.min(gs.screenShake + 0.5, 2);
        if (save.sfxOn) SFX.hurt();
        if (target.hp <= 0) {
          target.hp = 0;
          // Check auto-injector
          if ((target.powerups?.revive_k || 0) > 0) {
            target.powerups.revive_k = 0;
            target.hp = Math.round(target.maxHp * 0.4); target.shield = 2;
            addRevive(gs.particles, target.x, target.y);
            if (save.sfxOn) SFX.revived();
          } else if (!target.downed) {
            target.alive = false; target.downed = true;
            target.reviveTimer = 10 * (target.revTimeBonus || 1);
          }
        }
      }
    });
  };

  const tickParticles = (gs, dt) => {
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.86; p.vy = p.vy * 0.86 + (p.g || 0) * dt;
      p.life -= dt; return p.life > 0;
    });
  };

  const tickPickups = (gs, dt) => {
    gs.pickups = gs.pickups.filter(pk => {
      pk.life -= dt; if (pk.life <= 0) return false;
      gs.players.forEach(p => {
        if (!p.alive) return;
        if (Math.hypot(p.x-pk.x,p.y-pk.y) < 22) {
          if (pk.type==="medkit"){p.hp=Math.min(p.maxHp,p.hp+35);if(save.sfxOn)SFX.medkit();pk.life=0;}
          if (pk.type==="ammo"){p.curAmmo=p.weapon.mag;if(save.sfxOn)SFX.medkit();pk.life=0;}
        }
      });
      return pk.life > 0;
    });
  };

  const tickTurrets = (gs, dt) => {
    gs.turrets = gs.turrets.filter(t => {
      t.life -= dt; if (t.life <= 0) return false;
      t.shootCD -= dt;
      let near = null; let nd = 220;
      gs.enemies.forEach(e => { const d=Math.hypot(e.x-t.x,e.y-t.y); if(d<nd){nd=d;near=e;} });
      if (near && t.shootCD <= 0) {
        t.angle = Math.atan2(near.y-t.y, near.x-t.x);
        t.shootCD = 0.45;
        gs.bullets.push({x:t.x,y:t.y,vx:Math.cos(t.angle)*500,vy:Math.sin(t.angle)*500,dmg:22,range:240,traveled:0,owner:-1,size:3,pierce:false,tracer:false});
      }
      return true;
    });
  };

  const tickWave = (gs, dt) => {
    if (gs.phase === "spawning") {
      gs.spawnTimer -= dt;
      if (gs.spawnTimer <= 0) {
        gs.phase = "wave";
        const countIdx = Math.min(gs.wave - 1, gs.enemyCounts.length - 1);
        gs.spawnQueue = gs.enemyCounts[countIdx] || 15;
        if (save.sfxOn) SFX.wave();
      }
    }
    if (gs.phase === "wave") {
      gs.waveTimer -= dt;
      if (gs.waveTimer <= 0 && gs.spawnQueue > 0) {
        const isBossWave = gs.isBoss && gs.wave === gs.totalWaves && gs.spawnQueue <= 1 && !gs.bossSpawned;
        spawnEnemy(isBossWave);
        if (isBossWave) { gs.bossSpawned = true; if (save.sfxOn) SFX.boss(); }
        gs.spawnQueue--;
        gs.waveTimer = Math.max(0.4, 1.6 - gs.wave * 0.08);
      }
      if (gs.spawnQueue === 0 && gs.enemies.length === 0) {
        if (gs.isBoss && gs.wave === gs.totalWaves && !gs.bossKilled) return;
        gs.coinsEarned += 20 + gs.wave * 10;
        if (gs.wave >= gs.totalWaves) {
          gs.phase = "victory"; if (save.sfxOn) SFX.objective();
        } else {
          gs.wave++; gs.phase = "intermission"; gs.interTimer = 4.0;
          if (save.sfxOn) SFX.levelup();
        }
      }
    }
    if (gs.phase === "intermission") {
      gs.interTimer -= dt;
      if (gs.interTimer <= 0) { gs.phase = "spawning"; gs.spawnTimer = 1.5; }
    }
  };

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = (ctx, gs) => {
    // Screen shake
    ctx.save();
    if (gs.screenShake > 0.05) {
      ctx.translate((Math.random()-.5)*gs.screenShake*9, (Math.random()-.5)*gs.screenShake*9);
    }

    // Background
    ctx.fillStyle = "#090d09";
    ctx.fillRect(0, 0, CW, CH);

    // Draw tiles
    const map = gs.map;
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < (map[r]?.length || 0); c++) {
        const t = map[r][c];
        const x = c * TILE, y = r * TILE;
        if (t === 1) {
          // Wall
          ctx.fillStyle = "#1a1e14";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#222820";
          ctx.fillRect(x+1, y+1, TILE-2, 4);
          ctx.strokeStyle = "#0e1209";
          ctx.lineWidth = 1;
          ctx.strokeRect(x+0.5, y+0.5, TILE-1, TILE-1);
        } else if (t === 0) {
          // Floor
          ctx.fillStyle = c % 2 === r % 2 ? "#0d110a" : "#0b0f08";
          ctx.fillRect(x, y, TILE, TILE);
          // Subtle floor grime
          if ((r * 7 + c * 3) % 11 === 0) { ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(x+8,y+8,4,4); }
        } else if (t === 2) {
          // Cover / debris
          ctx.fillStyle = "#0d110a";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#2a3020";
          ctx.fillRect(x+4, y+4, TILE-8, TILE-8);
          ctx.strokeStyle = "#3a4028";
          ctx.lineWidth = 1;
          ctx.strokeRect(x+4.5,y+4.5,TILE-9,TILE-9);
        } else if (t === 4) {
          // Door
          ctx.fillStyle = "#0d110a";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#3a3010";
          ctx.fillRect(x+4, y+2, TILE-8, TILE-4);
          ctx.strokeStyle = "#6a5a20";
          ctx.lineWidth = 2;
          ctx.strokeRect(x+4.5,y+2.5,TILE-9,TILE-5);
        }
      }
    }

    // Grid overlay (subtle)
    ctx.strokeStyle = "rgba(0,0,0,.2)";
    ctx.lineWidth = 0.5;
    for (let x=0;x<CW;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke();}
    for (let y=0;y<CH;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke();}

    // Pickups
    gs.pickups.forEach(pk => {
      ctx.save(); ctx.shadowBlur=8;
      ctx.shadowColor=pk.type==="medkit"?"#ff4444":"#4488ff";
      ctx.fillStyle=pk.type==="medkit"?"#ff4444":"#4488ff";
      ctx.beginPath(); ctx.arc(pk.x,pk.y,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#ffffff"; ctx.font="8px sans-serif"; ctx.textAlign="center";
      ctx.fillText(pk.type==="medkit"?"♥":"⊛",pk.x,pk.y+3);
      ctx.restore();
    });

    // Turrets
    gs.turrets.forEach(t => {
      ctx.save(); ctx.translate(t.x,t.y);
      ctx.fillStyle="#556644"; ctx.strokeStyle="#88aa44"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.rotate(t.angle);
      ctx.fillStyle="#334422"; ctx.fillRect(0,-3,16,6);
      ctx.restore();
    });

    // Particles
    gs.particles.forEach(p => {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.5,p.r*a),0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Blood decals (from dead particles)
    // Enemies
    gs.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x,e.y);
      // Shadow
      ctx.fillStyle="rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(2,3,e.size,e.size*.65,0,0,Math.PI*2); ctx.fill();

      // Body — draw realistic-ish human silhouette
      const col = e.bleedTimer > 0 ? "#cc3300" : e.col;
      if (e.isBoss) { ctx.shadowBlur=24; ctx.shadowColor="#ff2200"; }
      const hpPct = e.hp / e.maxHp;
      // Torso
      ctx.fillStyle=col;
      ctx.beginPath();
      ctx.ellipse(0,2,e.size*.75,e.size,0,0,Math.PI*2); ctx.fill();
      // Head
      ctx.fillStyle="#c89070";
      ctx.beginPath();
      ctx.arc(0,-e.size*.9,e.size*.5,0,Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle=e.eyes;
      ctx.beginPath(); ctx.arc(-e.size*.2,-e.size*.9,e.size*.15,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.size*.2,-e.size*.9,e.size*.15,0,Math.PI*2); ctx.fill();
      // Arms
      ctx.strokeStyle=col; ctx.lineWidth=e.size*.45;
      ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-e.size*.7,0); ctx.lineTo(-e.size*1.3,e.size*.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.size*.7,0); ctx.lineTo(e.size*1.3,e.size*.5); ctx.stroke();

      if (e.isBoss) {
        ctx.font=`bold ${e.size*.7}px sans-serif`;
        ctx.fillStyle="#ff8888"; ctx.textAlign="center";
        ctx.fillText("☣",0,e.size*.4);
      }

      // HP bar (always for boss, or scanner active)
      if (e.isBoss || gs.players.some(p=>p.scanner)) {
        ctx.fillStyle="#1a0a0a"; ctx.fillRect(-e.size,-e.size-9,e.size*2,5);
        ctx.fillStyle=hpPct>.6?"#88ff44":hpPct>.3?"#ffaa00":"#ff2222";
        ctx.fillRect(-e.size,-e.size-9,e.size*2*hpPct,5);
      }
      ctx.restore();
    });

    // Players
    gs.players.forEach(p => {
      if (!p.alive && !p.downed) return;
      ctx.save(); ctx.translate(p.x,p.y);

      // Downed indicator
      if (p.downed) {
        ctx.globalAlpha = .5 + .3*Math.sin(gs.time*6);
        ctx.strokeStyle=p.col; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle=p.col; ctx.font="bold 10px sans-serif"; ctx.textAlign="center";
        ctx.fillText("DOWN",0,-26);
        const revPct = 1 - (p.reviveTimer / 10);
        ctx.strokeStyle="rgba(255,50,50,.6)"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(0,0,22,-Math.PI/2,-Math.PI/2+revPct*Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
      }

      if (!p.alive) { ctx.restore(); return; }

      // Shield glow
      if (p.shield > 0) {
        ctx.globalAlpha=Math.min(1,p.shield)*.7;
        ctx.strokeStyle="#44aaff"; ctx.lineWidth=3; ctx.shadowBlur=15; ctx.shadowColor="#44aaff";
        ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
      }

      ctx.rotate(p.angle);
      ctx.shadowBlur = p.dashDur > 0 ? 18 : 6;
      ctx.shadowColor = p.col;

      // Legs
      ctx.strokeStyle = p.isP2 ? "#1a3a50" : "#1a3a10";
      ctx.lineWidth=5; ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(-4,6);ctx.lineTo(-5,14);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,6);ctx.lineTo(5,14);ctx.stroke();

      // Torso
      ctx.fillStyle = p.isP2 ? "#1e3a50" : "#1e3a12";
      ctx.beginPath();
      ctx.roundRect(-7,-8,14,18,3);
      ctx.fill();

      // Vest / armor
      ctx.fillStyle = p.isP2 ? "#2a5070" : "#2a5018";
      ctx.beginPath();
      ctx.roundRect(-6,-6,12,12,2);
      ctx.fill();

      // Head
      ctx.fillStyle = "#c8a080";
      ctx.beginPath(); ctx.arc(0,-12,6,0,Math.PI*2); ctx.fill();
      // Helmet
      ctx.fillStyle = p.isP2 ? "#1e3a50" : "#1e3a12";
      ctx.beginPath(); ctx.arc(0,-13,7,Math.PI,.0); ctx.fill();

      // Arms
      ctx.strokeStyle = p.isP2 ? "#1e3a50" : "#1e3a12";
      ctx.lineWidth=5; ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-10,8);ctx.stroke();
      ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(10,8);ctx.stroke();

      // Weapon
      ctx.fillStyle="#445533"; ctx.strokeStyle="#223322"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(2,-3,20,6,2); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#667744";
      ctx.beginPath(); ctx.roundRect(18,-2,8,4,1); ctx.fill();

      // Reload flash
      if (p.reloading > 0) {
        ctx.rotate(-p.angle);
        ctx.fillStyle="#ffaa00"; ctx.font="bold 9px sans-serif"; ctx.textAlign="center";
        ctx.fillText("RELOAD",-0,-24);
      }

      ctx.restore();

      // Name tag above player
      ctx.fillStyle=p.col; ctx.font="bold 9px 'IBM Plex Mono',monospace";
      ctx.textAlign="center"; ctx.fillText(p.name,p.x,p.y-30);
    });

    // Bullets — tracer rounds glow
    gs.bullets.forEach(b => {
      if (b.tracer) { ctx.shadowBlur=4; ctx.shadowColor="#ffcc44"; }
      ctx.fillStyle=b.tracer?"#ffdd88":"#eecc66";
      ctx.beginPath(); ctx.arc(b.x,b.y,b.size,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    });

    // Intermission banner
    if (gs.phase === "intermission") {
      ctx.fillStyle="rgba(0,0,0,.65)"; ctx.fillRect(CW/2-160,CH/2-40,320,80);
      ctx.strokeStyle="#88ff44"; ctx.lineWidth=1; ctx.strokeRect(CW/2-160,CH/2-40,320,80);
      ctx.fillStyle="#88ff44"; ctx.font="bold 22px 'Barlow Condensed',sans-serif";
      ctx.textAlign="center"; ctx.fillText(`WAVE ${gs.wave - 1} CLEARED`,CW/2,CH/2-8);
      ctx.fillStyle="#446633"; ctx.font="16px 'IBM Plex Mono',monospace";
      ctx.fillText(`NEXT WAVE IN ${Math.ceil(Math.max(0,gs.interTimer))}s`,CW/2,CH/2+20);
    }

    // Spawning warning
    if (gs.phase === "spawning") {
      ctx.fillStyle="rgba(0,0,0,.55)"; ctx.fillRect(CW/2-140,CH/2-28,280,56);
      ctx.strokeStyle="#ff4400"; ctx.lineWidth=1; ctx.strokeRect(CW/2-140,CH/2-28,280,56);
      ctx.fillStyle="#ff4400"; ctx.font="bold 18px 'Barlow Condensed',sans-serif";
      ctx.textAlign="center"; ctx.fillText(`WAVE ${gs.wave} INCOMING`,CW/2,CH/2+8);
    }

    // Boss alert
    if (gs.isBoss && gs.bossSpawned && !gs.bossKilled) {
      const flash = Math.floor(gs.time * 4) % 2;
      ctx.fillStyle=flash?"rgba(255,34,0,.7)":"rgba(200,20,0,.6)";
      ctx.font="bold 13px 'Barlow Condensed',sans-serif";
      ctx.textAlign="center";
      ctx.fillText(`⚠ ${gs.bossName} ⚠`,CW/2,20);
    }

    // Flashbang overlay
    if (gs.flashbangTimer > 0) {
      ctx.fillStyle=`rgba(255,255,200,${Math.min(.85,gs.flashbangTimer*.3)})`;
      ctx.fillRect(0,0,CW,CH);
    }

    ctx.restore(); // screen shake
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initGame();
    loop._lt = null;
    rafRef.current = requestAnimationFrame(loop);

    const onKeyDown = (e) => {
      keysRef.current[e.code] = true;
      if (e.code === "Escape" || e.code === "KeyP") { pauseRef.current = !pauseRef.current; setPaused(v=>!v); }
      e.preventDefault();
    };
    const onKeyUp   = (e) => { keysRef.current[e.code] = false; };
    const onMM = (e) => {
      const cvs = canvasRef.current; if (!cvs) return;
      const r = cvs.getBoundingClientRect();
      rectRef.current = r;
      const sx = CW / r.width, sy = CH / r.height;
      mouseRef.current.x = (e.clientX - r.left) * sx;
      mouseRef.current.y = (e.clientY - r.top)  * sy;
      mouseRef.current.absX = (e.clientX - r.left) * sx;
      mouseRef.current.absY = (e.clientY - r.top)  * sy;
      mouseRef.current.clientX = e.clientX;
      mouseRef.current.clientY = e.clientY;
    };
    const onMD = (e) => { if (e.button===0) mouseRef.current.down=true; e.preventDefault(); };
    const onMU = (e) => { if (e.button===0) mouseRef.current.down=false; };

    window.addEventListener("keydown",   onKeyDown);
    window.addEventListener("keyup",     onKeyUp);
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mousedown", onMD);
    window.addEventListener("mouseup",   onMU);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown",   onKeyDown);
      window.removeEventListener("keyup",     onKeyUp);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mousedown", onMD);
      window.removeEventListener("mouseup",   onMU);
    };
  }, []); // eslint-disable-line

  const snap = uiSnap;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",position:"relative"}}>
      {/* HUD */}
      {snap && (
        <div style={{display:"flex",gap:8,width:"100%",maxWidth:CW,marginBottom:8,flexWrap:"wrap"}}>
          {snap.players.map(p=>(
            <div key={p.id} style={{flex:1,minWidth:200,padding:"8px 12px",background:"rgba(0,0,0,.7)",border:`1px solid ${p.col}25`,borderRadius:4}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,color:p.col,letterSpacing:2,fontWeight:600}}>{p.name}</span>
                <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,color:"#336622"}}>☠ {p.kills}</span>
              </div>
              <div style={{height:7,background:"#0e160a",borderRadius:3,overflow:"hidden",marginBottom:3}}>
                <div style={{height:"100%",width:`${Math.max(0,(p.hp/p.maxHp)*100)}%`,
                  background:p.hp/p.maxHp>.5?"#88ff44":p.hp/p.maxHp>.25?"#ffaa00":"#ff2222",borderRadius:3,transition:"width .12s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#336622",fontFamily:"'IBM Plex Mono'"}}>
                <span style={{color:p.downed?"#ff2222":undefined}}>{p.downed?`DOWNED — ${Math.ceil(Math.max(0,p.reviveTimer))}s`:`HP ${Math.max(0,Math.round(p.hp))}/${p.maxHp}`}</span>
                <span style={{color:p.reloading>0?"#ffaa00":"#88ff44"}}>{p.reloading>0?`RELOADING…`:`◉ ${p.curAmmo}/${p.mag}`}</span>
                {p.shield>0&&<span style={{color:"#44aaff"}}>SHIELD</span>}
              </div>
            </div>
          ))}
          <div style={{padding:"8px 14px",background:"rgba(0,0,0,.7)",border:"1px solid #1a2a10",borderRadius:4,textAlign:"center",minWidth:110}}>
            <div style={{fontFamily:"'Barlow Condensed'",fontSize:18,fontWeight:700,color:"#88ff44",letterSpacing:2}}>{snap.wave}/{snap.totalWaves}</div>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:8,color:"#2a3a20",letterSpacing:1}}>
              {snap.phase==="intermission"?`NEXT: ${Math.ceil(snap.interTimer)}s`:snap.phase==="spawning"?"INCOMING":snap.enemies>0?`${snap.enemies} ENEMIES`:"CLEAR"}
            </div>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:8,color:"#ffd700",marginTop:2}}>+{snap.coins}¢</div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{position:"relative",width:"100%",maxWidth:CW}}>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{width:"100%",height:"auto",display:"block",borderRadius:4,border:"1px solid #1a2a10",boxShadow:"0 0 40px rgba(0,0,0,.8)",imageRendering:"pixelated",cursor:"crosshair"}} />

        {paused && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:4,backdropFilter:"blur(4px)"}}>
            <div style={{fontFamily:"'Barlow Condensed'",fontSize:38,fontWeight:900,color:"#88ff44",letterSpacing:6,marginBottom:8,textShadow:"0 0 20px #88ff44"}}>PAUSED</div>
            <div style={{fontSize:10,color:"#2a3a20",letterSpacing:4,fontFamily:"'IBM Plex Mono'",marginBottom:20}}>ESC / P TO RESUME</div>
            <div style={{display:"flex",gap:10}}>
              <GBtn label="RESUME" col="#88ff44" onClick={()=>{pauseRef.current=false;setPaused(false);}}/>
              <GBtn label="ABORT MISSION" col="#ff4444" onClick={()=>{cancelAnimationFrame(rafRef.current);onBack();}} small />
            </div>
          </div>
        )}
      </div>

      {/* Power-up belt */}
      {snap?.players[0] && (
        <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap",justifyContent:"center"}}>
          {[["Q","grenade","💣"],["E","medkit","⚕"],["F","slowfield","🌀"],["T","turret","🔫"],["G","airstrike","✈"]].map(([key,pk,icon])=>{
            const count = GS.current?.players?.[0]?.powerups?.[pk] || 0;
            return (
              <div key={pk} style={{padding:"4px 10px",borderRadius:3,background:count>0?"rgba(136,255,68,.05)":"rgba(0,0,0,.3)",
                border:`1px solid ${count>0?"#1e2e14":"#0e160a"}`,fontFamily:"'IBM Plex Mono'",fontSize:9,
                color:count>0?"#88ff44":"#1a2a10",display:"flex",alignItems:"center",gap:4}}>
                <span>{icon}</span><span>[{key}]</span><span style={{color:"#ffd700"}}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{marginTop:6,fontSize:8,color:"#121e0c",letterSpacing:2,fontFamily:"'IBM Plex Mono'",textAlign:"center"}}>
        P1: WASD+MOUSE · SHIFT DASH · Q/E/F/T/G ITEMS · R RELOAD · ESC PAUSE &nbsp;|&nbsp; P2: IJKL · CTRL DASH · U/O ITEMS · P RELOAD
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME OVER / VICTORY
function GameOverScreen({ result, save, onRetry, onMenu }) {
  if (!result) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:460,paddingTop:20,animation:"fadeUp .45s ease"}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:"clamp(36px,10vw,58px)",fontWeight:900,color:"#cc2200",letterSpacing:5,textShadow:"0 0 26px #cc220088",marginBottom:4}}>MISSION FAILED</div>
      <div style={{fontSize:9,color:"#2a1a0a",letterSpacing:4,marginBottom:20,fontFamily:"'IBM Plex Mono'"}}>BOTH OPERATIVES LOST</div>
      <div style={{background:"rgba(0,0,0,.5)",border:"1px solid #2a1a0a",borderRadius:4,padding:20,marginBottom:16,width:"100%",textAlign:"left"}}>
        {[["KILLS",result.kills,"#88ff44"],["WAVES",result.waves||"-","#ffaa00"],["REVIVES",result.revives,"#44ccff"],["COINS EARNED",`+${result.coinsEarned||0}¢`,"#ffd700"]].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
            <span style={{color:"#2a2a1a",fontSize:12,fontFamily:"'Barlow Condensed'",fontWeight:600,letterSpacing:1}}>{l}</span>
            <span style={{color:c,fontWeight:700,fontSize:12,fontFamily:"'IBM Plex Mono'"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,flexDirection:"column",width:"100%"}}>
        <GBtn label="RE-BRIEF & RETRY" col="#88ff44" onClick={onRetry} />
        <GBtn label="← MAIN MENU" col="#2a3a20" onClick={onMenu} small />
      </div>
    </div>
  );
}

function VictoryScreen({ result, save, onNext, onMenu }) {
  if (!result) return null;
  const isLast = (result.levelId || 0) >= TOTAL_LEVELS;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:460,paddingTop:20,animation:"fadeUp .45s ease"}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:"clamp(34px,10vw,54px)",fontWeight:900,color:"#88ff44",letterSpacing:5,textShadow:"0 0 24px rgba(136,255,68,.5)",marginBottom:4}}>MISSION COMPLETE</div>
      {isLast && <div style={{fontSize:13,color:"#ffd700",letterSpacing:3,marginBottom:4,fontFamily:"'Barlow Condensed'",animation:"pulse 1.5s infinite"}}>★ CAMPAIGN COMPLETE — HARKOV SAVED ★</div>}
      <div style={{background:"rgba(0,0,0,.5)",border:"1px solid #1a2a10",borderRadius:4,padding:20,marginBottom:16,width:"100%",textAlign:"left"}}>
        {[["KILLS",result.kills,"#88ff44"],["REVIVES USED",result.revives,"#44ccff"],["COINS EARNED",`+${result.coinsEarned||0}¢`,"#ffd700"]].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
            <span style={{color:"#2a3a1a",fontSize:12,fontFamily:"'Barlow Condensed'",fontWeight:600,letterSpacing:1}}>{l}</span>
            <span style={{color:c,fontWeight:700,fontSize:12,fontFamily:"'IBM Plex Mono'"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,flexDirection:"column",width:"100%"}}>
        {!isLast && <GBtn label="CONTINUE →  NEXT MISSION" col="#88ff44" onClick={onNext} />}
        <GBtn label="← MAIN MENU" col="#2a3a20" onClick={onMenu} small />
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOP
function ShopScreen({ save, shopTab, setShopTab, purchase, onBack, getStats }) {
  const tabs=[{key:"p1",label:"🎖 KANE — P1"},{key:"p2",label:"🏥 LEILA — P2"},{key:"upgrades",label:"⬆ UPGRADES"},{key:"powerups",label:"💊 SUPPLIES"}];

  const renderWeapons = (charNum) => {
    const field = charNum===1?"p1Weapon":"p2Weapon";
    const uField= charNum===1?"p1Unlocked":"p2Unlocked";
    const cat   = charNum===1?"p1weapon":"p2weapon";
    return Object.entries(WEAPONS).map(([k,w])=>{
      const owned = (save[uField]||[]).includes(k);
      const equipped = save[field]===k;
      return (
        <SCard key={k} name={w.name} rarity={w.rarity} desc={w.desc} cost={w.cost} owned={owned} equip={equipped} canAfford={save.coins>=w.cost} onSelect={()=>purchase(cat,k)}>
          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:9,color:"#336622",marginBottom:5,letterSpacing:1}}>
            {Object.entries(WEAPON_CATS)[Object.keys(WEAPONS).indexOf(k)%Object.keys(WEAPON_CATS).length]?.[0]?.toUpperCase()||w.cat.toUpperCase()}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:5}}>
            {[["DMG",w.dmg],["RPS",w.rps.toFixed(1)],["MAG",w.mag],["RNG",w.range]].map(([l,v])=>(
              <span key={l} style={{fontSize:8,color:"#3a4a28",fontFamily:"'IBM Plex Mono'",background:"rgba(0,0,0,.4)",padding:"1px 5px",borderRadius:2}}>{l}:{v}</span>
            ))}
          </div>
        </SCard>
      );
    });
  };

  return (
    <div style={{width:"100%",maxWidth:900,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:"'Barlow Condensed'",fontSize:20,fontWeight:800,color:"#88ff44",letterSpacing:4}}>ARMORY</div>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 14px",borderRadius:20,background:"rgba(136,255,68,.05)",border:"1px solid rgba(136,255,68,.15)",color:"#88ff44",fontWeight:700,fontSize:13,fontFamily:"'IBM Plex Mono'"}}>{save.coins.toLocaleString()} ¢</div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #1a2a10",marginBottom:12}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setShopTab(t.key)} style={{padding:"9px 14px",background:"transparent",border:"none",cursor:"pointer",color:shopTab===t.key?"#88ff44":"#2a3a20",fontSize:11,fontWeight:700,letterSpacing:1,borderBottom:`2px solid ${shopTab===t.key?"#88ff44":"transparent"}`,transition:"all .18s",fontFamily:"'Barlow Condensed'"}}>{t.label}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:9,maxHeight:"56vh",overflowY:"auto",paddingRight:4}}>
        {shopTab==="p1" && renderWeapons(1)}
        {shopTab==="p2" && renderWeapons(2)}
        {shopTab==="upgrades" && Object.entries(UPGRADES).map(([k,up])=>{
          const lvl=(save.upgrades||{})[k]||0;
          const maxed=lvl>=up.max;
          const cost=up.cost*(lvl+1);
          return (
            <SCard key={k} name={`${up.name} ${lvl>0?`Lv.${lvl}`:""}`} rarity={up.rarity} desc={up.desc} cost={maxed?0:cost} owned={false} equip={false} canAfford={!maxed&&save.coins>=cost} maxed={maxed} onSelect={()=>purchase("upgrade",k)}>
              <div style={{display:"flex",gap:2,marginBottom:5}}>
                {Array.from({length:up.max}).map((_,i)=>(<div key={i} style={{width:13,height:4,borderRadius:1,background:i<lvl?"#88ff44":"#1a2a10"}}/>))}
              </div>
            </SCard>
          );
        })}
        {shopTab==="powerups" && Object.entries(POWERUPS).map(([k,pw])=>{
          const count=(save.powerups||{})[k]||0;
          return (
            <SCard key={k} name={pw.name} rarity={pw.rarity} desc={pw.desc} cost={pw.cost} owned={false} equip={false} canAfford={save.coins>=pw.cost} badge={count>0?`×${count}`:null} onSelect={()=>purchase("powerup",k)}>
              <div style={{fontSize:20,marginBottom:5}}>{pw.icon}</div>
              <div style={{fontSize:8,color:"#336622",fontFamily:"'IBM Plex Mono'",marginBottom:4}}>USES: {pw.uses}  ·  KEY: {pw.key||"—"}</div>
            </SCard>
          );
        })}
      </div>
      <button onClick={onBack} style={{marginTop:12,padding:"9px 20px",background:"transparent",border:"1px solid #1a2a10",color:"#2a3a20",cursor:"pointer",borderRadius:3,fontWeight:700,letterSpacing:2,fontSize:11,fontFamily:"'Barlow Condensed'",transition:"all .18s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#88ff4455";e.currentTarget.style.color="#88ff44";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a2a10";e.currentTarget.style.color="#2a3a20";}}>
        ← EXIT ARMORY
      </button>
    </div>
  );
}

function SCard({ name, rarity, desc, cost, owned, equip, canAfford, onSelect, children, badge, maxed }) {
  const [h,setH] = useState(false);
  const rc = RARITY_C[rarity]||"#777";
  return (
    <div onClick={onSelect} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{padding:12,borderRadius:4,cursor:"pointer",position:"relative",transition:"all .18s",
        border:`2px solid ${equip?"#88ff44":h?"rgba(136,255,68,.22)":"rgba(136,255,68,.06)"}`,
        background:equip?"rgba(136,255,68,.06)":h?"rgba(136,255,68,.03)":"rgba(0,0,0,.4)",
        opacity:(!canAfford&&!owned&&!maxed)?.45:1,
        boxShadow:equip?"0 0 12px rgba(136,255,68,.18)":"none",
        transform:h&&!equip?"translateY(-2px)":"none"}}>
      {badge&&<div style={{position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:2,background:"#88ff44",color:"#0a1405",fontSize:9,fontWeight:800,letterSpacing:1}}>{badge}</div>}
      {equip&&!badge&&<div style={{position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:2,background:"#88ff44",color:"#0a1405",fontSize:9,fontWeight:800,letterSpacing:1}}>EQ</div>}
      {maxed&&<div style={{position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:2,background:"#ffd700",color:"#0a0800",fontSize:9,fontWeight:800,letterSpacing:1}}>MAX</div>}
      <div style={{fontSize:8,color:rc,fontWeight:700,letterSpacing:2,marginBottom:5,fontFamily:"'IBM Plex Mono'"}}>{rarity}</div>
      {children}
      <div style={{fontSize:13,fontWeight:700,marginBottom:2,fontFamily:"'Barlow Condensed'",letterSpacing:1,color:"#88ff44"}}>{name}</div>
      <div style={{fontSize:10,color:"#2a3a1a",marginBottom:8,lineHeight:1.4,fontFamily:"'IBM Plex Mono'"}}>{desc}</div>
      <div style={{fontSize:10,fontWeight:700,color:owned?"#88ff44":canAfford?"#ffd700":maxed?"#ffd700":"#1a2a10",fontFamily:"'IBM Plex Mono'"}}>{maxed?"MAXED":cost===0?"FREE":owned?"OWNED":`${cost.toLocaleString()}¢`}</div>
    </div>
  );
}

const WEAPON_CATS = { pistol:"🔫",smg:"⚡",rifle:"🎯",shotgun:"💥",sniper:"🔭",lmg:"🔩" };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS & STATS
function SettingsScreen({ save, setSave, onBack }) {
  const tog = k => setSave(p=>({...p,[k]:!p[k]}));
  return (
    <div style={{width:"100%",maxWidth:400,animation:"fadeUp .4s ease"}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:20,fontWeight:800,color:"#88ff44",letterSpacing:4,marginBottom:18}}>SETTINGS</div>
      <div style={{background:"rgba(0,0,0,.44)",border:"1px solid #1a2a10",borderRadius:4,overflow:"hidden",marginBottom:12}}>
        {[["sfxOn","🔊 Sound FX","All game sound effects"]].map(([k,label,desc])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 17px",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,fontFamily:"'Barlow Condensed'",letterSpacing:1,color:"#88ff44"}}>{label}</div>
              <div style={{fontSize:10,color:"#2a3a20"}}>{desc}</div>
            </div>
            <div onClick={()=>tog(k)} style={{width:42,height:23,borderRadius:11,cursor:"pointer",position:"relative",background:save[k]?"#88ff44":"#1a2a10",border:`1px solid ${save[k]?"#88ff44":"#2a3a20"}`,transition:"all .22s"}}>
              <div style={{position:"absolute",top:2,left:save[k]?19:2,width:17,height:17,borderRadius:"50%",background:save[k]?"#0a1405":"#2a3a20",transition:"left .22s"}}/>
            </div>
          </div>
        ))}
        <div style={{padding:"13px 17px",borderTop:"1px solid rgba(255,255,255,.04)"}}>
          <div style={{fontWeight:700,fontSize:13,fontFamily:"'Barlow Condensed'",color:"#88ff44",marginBottom:4}}>⚠ WIPE ALL DATA</div>
          <button onClick={()=>{if(window.confirm("Reset ALL progress? Cannot be undone.")){localStorage.removeItem(SK);setSave({...DEFAULT_SAVE});}}} style={{padding:"7px 14px",background:"transparent",border:"1px solid #cc220040",color:"#cc2200",cursor:"pointer",borderRadius:3,fontSize:11,fontWeight:700,fontFamily:"'Barlow Condensed'",transition:"all .18s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(204,34,0,.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>FACTORY RESET</button>
        </div>
      </div>
      <GBtn label="← BACK" col="#336622" onClick={onBack} small />
    </div>
  );
}

function StatsScreen({ save, onBack }) {
  const s = save.stats;
  return (
    <div style={{width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontSize:20,fontWeight:800,color:"#88ff44",letterSpacing:4,marginBottom:18}}>INCIDENT REPORT</div>
      <div style={{background:"rgba(0,0,0,.44)",border:"1px solid #1a2a10",borderRadius:4}}>
        {[["Games Played",s.gamesPlayed],["Total Kills",s.totalKills.toLocaleString()],["Campaign Progress",`${save.campaignProgress} / ${TOTAL_LEVELS}`],["Best Level Reached",s.bestLevel],["Total Revives",s.totalRevives],["Total Coins",`${s.totalCoins.toLocaleString()}¢`],["Current Balance",`${save.coins.toLocaleString()}¢`]].map(([l,v],i,arr)=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 17px",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,.04)":"none"}}>
            <span style={{color:"#2a3a1a",fontSize:12,fontFamily:"'Barlow Condensed'",fontWeight:600,letterSpacing:1}}>{l}</span>
            <span style={{color:"#88ff44",fontWeight:700,fontSize:11,fontFamily:"'IBM Plex Mono'"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:14}}><GBtn label="← BACK" col="#336622" onClick={onBack} small /></div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GBtn({ label, col, onClick, disabled, small, big }) {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{padding:big?"17px 28px":small?"8px 14px":"12px 22px",
        background:h&&!disabled?`${col}1a`:"transparent",
        border:`${big?"2px":"1px"} solid ${disabled?"#1a2a10":col}`,
        color:disabled?"#1a2a10":col, cursor:disabled?"not-allowed":"pointer",
        borderRadius:3, fontSize:big?15:small?11:13, fontWeight:700,
        fontFamily:"'Barlow Condensed'", letterSpacing:2, transition:"all .18s",
        boxShadow:h&&!disabled?`0 0 12px ${col}33`:"none",
        width:big?"100%":undefined}}>
      {label}
    </button>
  );
}