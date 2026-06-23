import { useState, useEffect, useRef } from "react";

// ── Pixel palette ─────────────────────────────────────────────
const PAL = {
  wall:"#1a1f2e", wallHL:"#252d42",
  floor:"#2a2a2a", floorLine:"#1e1e1e",
  belt:"#111", beltStripe:"#2a2a2a", beltRail:"#555",
  robot:"#0f2035", robotGlow:"#60a5fa",
  paint:"#1a0a2e", paintMist:"#c084fc",
  elec:"#1a1200", elecGlow:"#fbbf24",
  fire:"#1a0000",
  chem:"#0a1a0a", chemGreen:"#4ade80",
  weld:"#1a0f00", weldOrange:"#f97316",
  tire:"#0f0f1a", tireBlue:"#38bdf8",
  body:"#1a1000", bodyYellow:"#eab308",
  lift:"#001a0a", liftGreen:"#86efac",
  exit:"#052e16", fork:"#1a1a00", forkYellow:"#facc15",
  yellow:"#fbbf24", green:"#22c55e", red:"#ef4444",
  blue:"#3b82f6", purple:"#c084fc",
};

const TILE = 36;
const COLS = 14;
const ROWS = 12;

const W=1,F=0,C=2,M=3,P=4,E=5,R=6,X=7,S=8,CH=9,WE=10,TI=11,BO=12,LI=13,FK=14;

// Expanded map with 3 new zones
const MAP = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,F,F,F,FK,F,F,F,F,F,FK,F,F,W],
  [W,F,M,F,F,S,C,C,C,S,F,WE,F,W],
  [W,F,F,F,F,C,F,F,F,C,F,F,F,W],
  [W,F,P,F,F,C,F,F,F,C,F,CH,F,W],
  [W,F,F,F,F,C,F,F,F,C,F,F,F,W],
  [W,F,TI,F,F,C,F,F,F,C,F,E,F,W],
  [W,F,F,F,F,C,F,F,F,C,F,F,F,W],
  [W,F,R,F,F,C,F,F,F,C,F,BO,F,W],
  [W,F,F,F,F,S,C,C,C,S,F,F,F,W],
  [W,F,LI,F,F,F,F,X,F,F,F,F,F,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

const HAZARDS = {
  [M]:{ label:"Robot Arm Zone",   color:PAL.robotGlow,  icon:"⚙️",
        q:"A robot arm is cycling and a guard is missing. What do you do?",
        opts:["Work around it carefully","E-stop the cell and report it","Keep going, it's quick","Ask someone to watch"],
        ans:1, lesson:"Never enter a robot cell with a missing guard. Hit E-stop, lock out, report immediately." },
  [P]:{ label:"Paint Booth",      color:PAL.purple,     icon:"🎨",
        q:"You're entering the paint booth. What PPE is required?",
        opts:["Just safety glasses","Respirator, gloves & coveralls","Ear plugs only","Nothing if you're quick"],
        ans:1, lesson:"Paint booths have flammable vapors & toxic fumes. Full respirator, chemical gloves, and coveralls required." },
  [E]:{ label:"Electrical Panel", color:PAL.elecGlow,   icon:"⚡",
        q:"Who is allowed to open and work inside an electrical panel?",
        opts:["Anyone with rubber gloves","The shift supervisor","Certified electricians only","Anyone in emergency"],
        ans:2, lesson:"Only certified electricians work inside panels. Arc flash reaches temperatures hotter than the sun." },
  [R]:{ label:"Fire Station",     color:"#f87171",      icon:"🧯",
        q:"A fire starts at a workstation. What's your FIRST action?",
        opts:["Grab the extinguisher","Alert others, pull alarm, evacuate","Pour water on it","Call your manager first"],
        ans:1, lesson:"Alert, alarm, evacuate first. Only fight a fire if it's small, you're trained, and exit is behind you." },
  [CH]:{ label:"Chemical Area",   color:PAL.chemGreen,  icon:"🧪",
         q:"Before handling an unknown chemical, you MUST:",
         opts:["Smell it to identify it","Read the Safety Data Sheet (SDS)","Use gloves and go fast","Ask a coworker"],
         ans:1, lesson:"Always read the SDS first. It tells you the hazards, required PPE, and emergency procedures." },
  [WE]:{ label:"Welding Station", color:PAL.weldOrange, icon:"🔥",
         q:"While near a welder, what eye protection do YOU need?",
         opts:["Nothing, you're just watching","Regular safety glasses","Shade 5+ filter lens or welding shield","Sunglasses"],
         ans:2, lesson:"Arc flash from welding can permanently damage your eyes even from a distance. Always use proper shade lens." },
  [C]: { label:"Assembly Conveyor",color:PAL.green,     icon:"🏭",
         q:"You drop a tool on the moving conveyor. You should:",
         opts:["Quickly reach in and grab it","Walk alongside to grab at end","Hit E-stop first, then retrieve it","Leave it and get another"],
         ans:2, lesson:"Always E-stop before reaching onto any conveyor. Caught-in hazards cause amputations." },
  [TI]:{ label:"Tire Install Station", color:PAL.tireBlue, icon:"🔩",
         q:"You're torquing lug nuts on the line. The gun feels wrong. What do you do?",
         opts:["Keep going, it's probably fine","Complete the job and flag it after","Stop, tag the vehicle, and report the tool issue","Ask the next station to check it"],
         ans:2, lesson:"A mis-torqued wheel can come off at highway speed. Stop immediately, tag the vehicle, and report. Never pass a known defect down the line." },
  [BO]:{ label:"Body Shop",       color:PAL.bodyYellow, icon:"🚗",
         q:"You're grinding metal in the body shop. Sparks are flying. What must be in place?",
         opts:["Just your face shield","Fire blankets around the work area, face shield, and proper PPE","Safety glasses only","Nothing if you're quick"],
         ans:1, lesson:"Grinding sparks can travel 35 feet and ignite flammables. Fire blankets, face shield, gloves, and hearing protection are all required." },
  [FK]:{ label:"Forklift / Pedestrian Zone", color:"#facc15", icon:"🚜",
         q:"You're walking through the warehouse and a forklift is approaching. What do you do?",
         opts:["Keep walking, the driver sees you","Make eye contact and walk behind it","Stop, make eye contact with operator, wait for signal to cross","Run across quickly"],
         ans:2, lesson:"Never assume a forklift operator sees you. Always stop, make eye contact, get a clear signal before crossing. Forklifts have major blind spots and can weigh 9,000+ lbs." },
  [LI]:{ label:"Ergonomics / Lifting", color:PAL.liftGreen, icon:"📦",
         q:"You need to lift a 30lb part from the floor. What is the correct technique?",
         opts:["Bend at the waist and pull fast","Twist your body to build momentum","Bend your knees, keep back straight, lift with your legs","Just drag it across the floor"],
         ans:2, lesson:"Back injuries are the #1 injury in manufacturing. Bend knees, straight back, lift with legs. For anything over 50lbs, use a lift assist or get a partner." },
};

const HAZARD_SET = new Set([M,P,E,R,CH,WE,TI,BO,LI,FK]);
const TOTAL_HAZARDS = 10;
const START = {x:1,y:10};

// ── Cutscene ──────────────────────────────────────────────────
const CUTSCENE = [
  { speaker:"SUPERVISOR", avatar:"👷", text:"Welcome to the floor. Before you touch anything — you need to walk this line and learn every hazard zone." },
  { speaker:"SUPERVISOR", avatar:"👷", text:"Robot arms, paint booths, electrical panels, chemicals, welding, tire install, body shop — all of it is live." },
  { speaker:"NEW HIRE",   avatar:"🧑", text:"Got it. What do I need to do?" },
  { speaker:"SUPERVISOR", avatar:"👷", text:"Walk the floor. Hit every hazard zone. Answer the safety question correctly to clear it. Get them all and you unlock the final certification exam." },
  { speaker:"NEW HIRE",   avatar:"🧑", text:"Understood. I'm ready." },
  { speaker:"SUPERVISOR", avatar:"👷", text:"Watch the line. A car moves through every few seconds. Respect every caution zone. Now go — stay safe out there." },
];

// ── Boss quiz ─────────────────────────────────────────────────
const BOSS_QUESTIONS = [
  { q:"What does LOTO stand for?",
    opts:["Lockout/Tagout","Lock On, Turn Off","Lights Out Tools Off","Line Off Tag Out"],
    ans:0, lesson:"Lockout/Tagout (LOTO) ensures machines cannot be accidentally energized during maintenance or repair." },
  { q:"What color are WARNING signs indicating a potential hazard?",
    opts:["Red","Orange","Yellow","Green"],
    ans:2, lesson:"Yellow = WARNING. Orange = DANGER (immediate hazard). Red = fire protection or emergency equipment." },
  { q:"In the hierarchy of controls, what comes FIRST?",
    opts:["PPE","Administrative controls","Engineering controls","Elimination of the hazard"],
    ans:3, lesson:"Hierarchy: Eliminate → Substitute → Engineering Controls → Admin Controls → PPE. Always eliminate the hazard first." },
  { q:"You see a coworker skipping a safety step on the line. You should:",
    opts:["Mind your own business","Tell them quietly later","Report it immediately to a supervisor","Post about it"],
    ans:2, lesson:"Safety is everyone's responsibility. A caught-in or electrical incident can kill in seconds. Speak up immediately." },
  { q:"How often should you inspect your PPE?",
    opts:["Once a year","Before every use","Monthly","Never — it's brand new"],
    ans:1, lesson:"Inspect PPE before every use. Damaged PPE fails when you need it most." },
  { q:"A coworker gets a chemical in their eye. First action?",
    opts:["Call the nurse first","Rinse eye at eyewash station for 15-20 minutes","Wipe it with a cloth","Wait to see if it burns"],
    ans:1, lesson:"Eyewash stations must be used immediately. Flush for 15-20 minutes minimum. Seconds matter with chemical eye contact." },
  { q:"What is the correct way to report a near-miss?",
    opts:["Don't — nothing happened","Tell a coworker only","Report it to your supervisor immediately","Wait and see if it happens again"],
    ans:2, lesson:"Near-misses are warnings. Reporting them prevents the next incident from being an injury. Always report immediately." },
];

// ── Workers ───────────────────────────────────────────────────
const INIT_WORKERS = [
  {id:0,x:3,y:2,dx:1,dy:0,color:"#065f46"},
  {id:1,x:11,y:5,dx:0,dy:1,color:"#1e3a5f"},
  {id:2,x:7,y:9,dx:-1,dy:0,color:"#7c3aed"},
];

// ── Pixel Sprites ─────────────────────────────────────────────
function PixelPlayer() {
  return (
    <svg width={TILE-4} height={TILE-2} viewBox="0 0 20 26" style={{imageRendering:"pixelated"}}>
      <rect x="3" y="5" width="14" height="2" fill="#b45309"/>
      <rect x="5" y="1" width="10" height="6" fill="#f59e0b"/>
      <rect x="6" y="7" width="8" height="7" fill="#fde68a"/>
      <rect x="7" y="9" width="2" height="2" fill="#1a1a1a"/>
      <rect x="11" y="9" width="2" height="2" fill="#1a1a1a"/>
      <rect x="5" y="14" width="10" height="7" fill="#1d4ed8"/>
      <rect x="2" y="14" width="3" height="6" fill="#1d4ed8"/>
      <rect x="15" y="14" width="3" height="6" fill="#1d4ed8"/>
      <rect x="2" y="20" width="3" height="2" fill="#fde68a"/>
      <rect x="15" y="20" width="3" height="2" fill="#fde68a"/>
      <rect x="6" y="21" width="3" height="4" fill="#1e40af"/>
      <rect x="11" y="21" width="3" height="4" fill="#1e40af"/>
      <rect x="5" y="24" width="5" height="2" fill="#111"/>
      <rect x="10" y="24" width="5" height="2" fill="#111"/>
    </svg>
  );
}

function PixelWorker({color}) {
  return (
    <svg width={TILE-8} height={TILE-4} viewBox="0 0 18 24" style={{imageRendering:"pixelated"}}>
      <rect x="4" y="2" width="10" height="2" fill="#991b1b"/>
      <rect x="5" y="0" width="8" height="5" fill="#dc2626"/>
      <rect x="5" y="5" width="8" height="7" fill="#fde68a"/>
      <rect x="6" y="7" width="2" height="2" fill="#1a1a1a"/>
      <rect x="10" y="7" width="2" height="2" fill="#1a1a1a"/>
      <rect x="4" y="12" width="10" height="6" fill={color}/>
      <rect x="1" y="12" width="3" height="5" fill={color}/>
      <rect x="14" y="12" width="3" height="5" fill={color}/>
      <rect x="5" y="18" width="3" height="4" fill={color}/>
      <rect x="10" y="18" width="3" height="4" fill={color}/>
      <rect x="4" y="21" width="4" height="2" fill="#111"/>
      <rect x="10" y="21" width="4" height="2" fill="#111"/>
    </svg>
  );
}

function PixelCar({color="#c0392b"}) {
  return (
    <svg width="28" height="36" viewBox="0 0 14 18" style={{imageRendering:"pixelated"}}>
      <rect x="1" y="0" width="12" height="18" fill={color} rx="1"/>
      <rect x="2" y="0" width="10" height="1" fill="#7b241c"/>
      <rect x="2" y="17" width="10" height="1" fill="#7b241c"/>
      <rect x="2" y="2" width="10" height="5" fill="#1e3a5c"/>
      <rect x="2" y="11" width="10" height="4" fill="#1e3a5c"/>
      <rect x="0" y="2" width="2" height="4" fill="#111"/>
      <rect x="12" y="2" width="2" height="4" fill="#111"/>
      <rect x="0" y="12" width="2" height="4" fill="#111"/>
      <rect x="12" y="12" width="2" height="4" fill="#111"/>
      <rect x="4" y="8" width="6" height="2" fill="#7b241c"/>
    </svg>
  );
}

// ── Tile ──────────────────────────────────────────────────────
function Tile({tile, cleared, tick}) {
  const T = TILE;
  const base = {width:T,height:T,display:"flex",alignItems:"center",justifyContent:"center",
    position:"relative",flexShrink:0,boxSizing:"border-box",imageRendering:"pixelated"};

  if(tile===W) return(
    <div style={{...base,
      background:`repeating-linear-gradient(90deg,${PAL.wall} 0,${PAL.wall} ${T/2-1}px,${PAL.wallHL} ${T/2-1}px,${PAL.wallHL} ${T/2}px),repeating-linear-gradient(180deg,${PAL.wall} 0,${PAL.wall} ${T/2-1}px,${PAL.wallHL} ${T/2-1}px,${PAL.wallHL} ${T/2}px)`,
      backgroundColor:PAL.wall}}/>
  );

  if(tile===F) return(
    <div style={{...base,
      background:`repeating-linear-gradient(90deg,${PAL.floor} 0,${PAL.floor} ${T-1}px,${PAL.floorLine} ${T-1}px,${PAL.floorLine} ${T}px),repeating-linear-gradient(180deg,${PAL.floor} 0,${PAL.floor} ${T-1}px,${PAL.floorLine} ${T-1}px,${PAL.floorLine} ${T}px)`,
      backgroundColor:PAL.floor}}/>
  );

  if(tile===C||tile===S) {
    const off=(tick*3)%T;
    return(
      <div style={{...base,backgroundColor:PAL.belt,overflow:"hidden",
        borderLeft:`3px solid ${PAL.beltRail}`,borderRight:`3px solid ${PAL.beltRail}`}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{position:"absolute",left:4,right:4,height:2,backgroundColor:PAL.beltStripe,
            top:((i*(T/3)+off)%(T+4))-2,borderRadius:1}}/>
        ))}
        {tile===S&&<div style={{position:"relative",zIndex:2}}><PixelCar/></div>}
      </div>
    );
  }

  const pulse=0.45+0.3*Math.sin(tick*0.12);
  const flash=Math.sin(tick*0.18)>0.5;

  const hazardStyles={
    [M]: {bg:PAL.robot,  border:`2px solid rgba(96,165,250,${pulse})`,   shadow:`0 0 ${8+pulse*6}px rgba(96,165,250,0.5)`},
    [P]: {bg:PAL.paint,  border:`2px solid rgba(192,132,252,${pulse})`,  shadow:`0 0 ${8+pulse*6}px rgba(192,132,252,0.5)`},
    [E]: {bg:flash&&!cleared?PAL.elec+"cc":PAL.elec, border:`2px solid rgba(251,191,36,${pulse})`, shadow:`0 0 ${8+pulse*6}px rgba(251,191,36,0.5)`},
    [R]: {bg:PAL.fire,   border:`2px solid rgba(248,113,113,${pulse})`,  shadow:`0 0 ${8+pulse*6}px rgba(248,113,113,0.5)`},
    [CH]:{bg:PAL.chem,   border:`2px solid rgba(74,222,128,${pulse})`,   shadow:`0 0 ${8+pulse*6}px rgba(74,222,128,0.5)`},
    [WE]:{bg:PAL.weld,   border:`2px solid rgba(249,115,22,${pulse})`,   shadow:`0 0 ${8+pulse*6}px rgba(249,115,22,0.5)`},
    [TI]:{bg:PAL.tire,   border:`2px solid rgba(56,189,248,${pulse})`,   shadow:`0 0 ${8+pulse*6}px rgba(56,189,248,0.5)`},
    [BO]:{bg:PAL.body,   border:`2px solid rgba(234,179,8,${pulse})`,    shadow:`0 0 ${8+pulse*6}px rgba(234,179,8,0.5)`},
    [FK]:{bg:PAL.fork,  border:`2px solid rgba(250,204,21,${pulse})`,   shadow:`0 0 ${8+pulse*6}px rgba(250,204,21,0.5)`},
    [LI]:{bg:PAL.lift,   border:`2px solid rgba(134,239,172,${pulse})`, shadow:`0 0 ${8+pulse*6}px rgba(134,239,172,0.5)`},
  };

  if(hazardStyles[tile]){
    const s=hazardStyles[tile];
    return(
      <div style={{...base,backgroundColor:s.bg,
        border:cleared?"2px solid #333":s.border,
        boxShadow:cleared?"none":s.shadow}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
          <span style={{fontSize:18,opacity:cleared?0.25:1,filter:cleared?"grayscale(1)":"none"}}>
            {HAZARDS[tile].icon}
          </span>
          {cleared&&<span style={{color:PAL.green,fontSize:10,fontWeight:"bold",fontFamily:"monospace"}}>✓OK</span>}
        </div>
      </div>
    );
  }

  if(tile===X) return(
    <div style={{...base,backgroundColor:PAL.exit,border:"2px solid #22c55e",boxShadow:"0 0 12px rgba(34,197,94,0.6)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:14}}>✅</div>
        <div style={{color:PAL.green,fontSize:9,fontWeight:"bold",fontFamily:"monospace"}}>EXIT</div>
      </div>
    </div>
  );

  return <div style={{...base,backgroundColor:PAL.floor}}/>;
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [screen,    setScreen]    = useState("register");
  const [player,    setPlayer]    = useState({name:"",badge:""});
  const [cutIdx,    setCutIdx]    = useState(0);
  const [pos,       setPos]       = useState(START);
  const [cleared,   setCleared]   = useState(new Set());
  const [popup,     setPopup]     = useState(null);
  const [chosen,    setChosen]    = useState(null);
  const [lives,     setLives]     = useState(3);
  const [score,     setScore]     = useState(0);
  const [workers,   setWorkers]   = useState(INIT_WORKERS);
  const [tick,      setTick]      = useState(0);
  const [carPos,    setCarPos]    = useState(0);
  const [bossIdx,   setBossIdx]   = useState(0);
  const [bossChosen,setBossChosen]= useState(null);
  const [bossScore, setBossScore] = useState(0);
  const [nameErr,   setNameErr]   = useState("");

  const popupRef = useRef(null);
  const screenRef= useRef("register");
  useEffect(()=>{ popupRef.current=popup; },[popup]);
  useEffect(()=>{ screenRef.current=screen; },[screen]);

  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),60); return()=>clearInterval(id); },[]);

  useEffect(()=>{
    if(screen!=="game") return;
    const id=setInterval(()=>setCarPos(p=>(p+1)%16),550);
    return()=>clearInterval(id);
  },[screen]);

  useEffect(()=>{
    if(screen!=="game") return;
    const id=setInterval(()=>{
      setWorkers(prev=>prev.map(w=>{
        let nx=w.x+w.dx,ny=w.y+w.dy;
        const t=MAP[ny]?.[nx];
        if(t===W||t===undefined||t===C||t===S||t===X) return{...w,dx:-w.dx,dy:-w.dy};
        return{...w,x:nx,y:ny};
      }));
    },500);
    return()=>clearInterval(id);
  },[screen]);

  const solid=(x,y)=>{ const t=MAP[y]?.[x]; return t===W||t===undefined; };

  const move=(dx,dy)=>{
    if(popupRef.current||screenRef.current!=="game") return;
    setPos(prev=>{
      const nx=prev.x+dx,ny=prev.y+dy;
      if(solid(nx,ny)) return prev;
      const tile=MAP[ny][nx];
      if(tile===X){
        setCleared(c=>{
          setTimeout(()=>setScreen(c.size>=TOTAL_HAZARDS?"boss":"win"),50);
          return c;
        });
        return prev;
      }
      // Line violation — block stepping on conveyor
      if(tile===C||tile===S){
        setTimeout(()=>{ setPopup({tile:"LINE_VIOLATION"}); setChosen(null); },10);
        setLives(l=>{ const nl=l-1; if(nl<=0) setTimeout(()=>setScreen("lose"),900); return nl; });
        return prev;
      }
      if(HAZARD_SET.has(tile)){
        setCleared(c=>{
          if(!c.has(tile)) setTimeout(()=>{ setPopup({tile}); setChosen(null); },10);
          return c;
        });
      }
      return{x:nx,y:ny};
    });
  };

  useEffect(()=>{
    const dn=e=>{
      if(e.key==="ArrowUp"   ||e.key==="w") move(0,-1);
      if(e.key==="ArrowDown" ||e.key==="s") move(0,1);
      if(e.key==="ArrowLeft" ||e.key==="a") move(-1,0);
      if(e.key==="ArrowRight"||e.key==="d") move(1,0);
    };
    window.addEventListener("keydown",dn);
    return()=>window.removeEventListener("keydown",dn);
  },[]);

  const handleAnswer=(i)=>{
    if(chosen!==null||!popup) return;
    setChosen(i);
    const h=HAZARDS[popup.tile];
    if(i===h.ans){ setScore(s=>s+25); setCleared(c=>new Set([...c,popup.tile])); }
    else{ setLives(l=>{ const nl=l-1; if(nl<=0) setTimeout(()=>setScreen("lose"),900); return nl; }); }
  };

  const handleBossAnswer=(i)=>{
    if(bossChosen!==null) return;
    setBossChosen(i);
    const q=BOSS_QUESTIONS[bossIdx];
    if(i===q.ans) setBossScore(s=>s+50);
    else setLives(l=>Math.max(0,l-1));
  };

  const nextBoss=()=>{
    if(bossIdx+1>=BOSS_QUESTIONS.length){
      setScreen(lives>0?"certified":"lose");
    } else { setBossIdx(b=>b+1); setBossChosen(null); }
  };

  const restart=()=>{
    setPos(START); setCleared(new Set()); setLives(3); setScore(0);
    setPopup(null); setChosen(null); setWorkers(INIT_WORKERS.map(w=>({...w})));
    setBossIdx(0); setBossChosen(null); setBossScore(0); setCarPos(0);
    setCutIdx(0); setScreen("register");
    setPlayer({name:"",badge:""});
  };

  const closePopup=()=>{ setPopup(null); setChosen(null); };

  const beltPath=[
    {x:5,y:2},{x:5,y:3},{x:5,y:4},{x:5,y:5},{x:5,y:6},{x:5,y:7},{x:5,y:8},{x:5,y:9},
    {x:9,y:9},{x:9,y:8},{x:9,y:7},{x:9,y:6},{x:9,y:5},{x:9,y:4},{x:9,y:3},{x:9,y:2},
  ];
  const carCell=beltPath[carPos%beltPath.length];

  // ── REGISTER SCREEN ───────────────────────────────────────
  if(screen==="register") return(
    <div style={css.page}>
      <div style={{...css.card,maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:42}}>🏭</div>
          <div style={{fontSize:11,color:"#60a5fa",letterSpacing:3,fontFamily:"monospace",marginTop:6}}>CAR FACTORY TRAINING</div>
          <div style={{fontSize:22,color:"#fff",fontWeight:"bold",margin:"6px 0 2px"}}>Safety Quest</div>
          <div style={{color:"#555",fontSize:12}}>Enter your info to begin</div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          <div>
            <div style={{color:"#888",fontSize:11,marginBottom:5,letterSpacing:1,fontFamily:"monospace"}}>FULL NAME</div>
            <input
              value={player.name}
              onChange={e=>{ setPlayer(p=>({...p,name:e.target.value})); setNameErr(""); }}
              placeholder="e.g. Marcus Johnson"
              style={css.input}
            />
          </div>
          <div>
            <div style={{color:"#888",fontSize:11,marginBottom:5,letterSpacing:1,fontFamily:"monospace"}}>BADGE / EMPLOYEE ID</div>
            <input
              value={player.badge}
              onChange={e=>{ setPlayer(p=>({...p,badge:e.target.value})); setNameErr(""); }}
              placeholder="e.g. EMP-4821 (optional)"
              style={css.input}
            />
          </div>
          {nameErr&&<div style={{color:"#ef4444",fontSize:12}}>{nameErr}</div>}
        </div>

        <button onClick={()=>{
          if(!player.name.trim()){ setNameErr("Please enter your name to continue."); return; }
          setScreen("cutscene");
        }} style={css.btnBlue}>BEGIN TRAINING →</button>

        <div style={{textAlign:"center",marginTop:12,color:"#333",fontSize:11}}>
          Don't know your badge number? Just enter your name and put "N/A" for badge. This info is only used to track training completion.
        </div>
      </div>
    </div>
  );

  // ── CUTSCENE ──────────────────────────────────────────────
  if(screen==="cutscene"){
    const scene=CUTSCENE[cutIdx];
    return(
      <div style={css.page}>
        <div style={{...css.card,maxWidth:380}}>
          <div style={{fontSize:11,color:"#555",letterSpacing:2,marginBottom:12,fontFamily:"monospace"}}>
            ◆ NEW HIRE ORIENTATION — {player.name.toUpperCase()}
          </div>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
            <div style={{fontSize:36,flexShrink:0}}>{scene.avatar}</div>
            <div>
              <div style={{fontSize:11,color:"#555",fontFamily:"monospace",marginBottom:4,letterSpacing:1}}>{scene.speaker}</div>
              <div style={{background:"#0f0f0f",border:"1px solid #2a2a2a",borderRadius:8,padding:12,
                color:"#e5e5e5",fontSize:14,lineHeight:1.65}}>
                "{scene.text}"
              </div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:4}}>
              {CUTSCENE.map((_,i)=>(
                <div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===cutIdx?"#60a5fa":"#333"}}/>
              ))}
            </div>
            <button onClick={()=>{ if(cutIdx+1>=CUTSCENE.length) setScreen("game"); else setCutIdx(i=>i+1); }}
              style={css.btnBlue}>
              {cutIdx+1>=CUTSCENE.length?"Enter the Floor →":"Next →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── BOSS QUIZ ─────────────────────────────────────────────
  if(screen==="boss"){
    const bq=BOSS_QUESTIONS[bossIdx];
    return(
      <div style={css.page}>
        <div style={{...css.card,maxWidth:400}}>
          <div style={{textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:PAL.red,letterSpacing:2,fontFamily:"monospace"}}>◆ FINAL CERTIFICATION EXAM</div>
            <div style={{fontSize:18,color:"#fff",fontWeight:"bold",margin:"6px 0"}}>Safety Boss Quiz</div>
            <div style={{fontSize:12,color:"#555"}}>Q {bossIdx+1}/{BOSS_QUESTIONS.length} · ★ {score+bossScore} pts · {"❤️".repeat(lives)}</div>
          </div>
          <div style={{color:"#fff",fontSize:14,marginBottom:14,lineHeight:1.6,padding:10,background:"#0f0f0f",borderRadius:6,border:"1px solid #2a2a2a"}}>
            {bq.q}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            {bq.opts.map((opt,i)=>{
              let bg="#1e1e1e",border="#333",col="#ccc";
              if(bossChosen!==null){
                if(i===bq.ans){bg="#052e16";border="#22c55e";col="#fff";}
                else if(i===bossChosen){bg="#3f0000";border="#ef4444";col="#fff";}
              }
              return(
                <button key={i} onClick={()=>handleBossAnswer(i)}
                  style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:6,
                    padding:"10px 12px",cursor:bossChosen!==null?"default":"pointer",
                    fontFamily:"inherit",fontSize:13,textAlign:"left"}}>
                  <span style={{color:"#555",marginRight:8}}>{String.fromCharCode(65+i)}.</span>{opt}
                </button>
              );
            })}
          </div>
          {bossChosen!==null&&(
            <>
              <div style={{background:"#0f0f0f",border:`1px solid ${bossChosen===bq.ans?"#22c55e":"#ef4444"}`,borderRadius:6,padding:10,marginBottom:10}}>
                <div style={{color:bossChosen===bq.ans?"#22c55e":"#ef4444",fontWeight:"bold",fontSize:13,marginBottom:4}}>
                  {bossChosen===bq.ans?"✅ Correct! +50 pts":"❌ Wrong! −1 life"}
                </div>
                <div style={{color:"#bbb",fontSize:12,lineHeight:1.5}}>{bq.lesson}</div>
              </div>
              <button onClick={nextBoss} style={css.btnGreen}>
                {bossIdx+1>=BOSS_QUESTIONS.length?"See Results →":"Next Question →"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── CERTIFIED ─────────────────────────────────────────────
  if(screen==="certified") return(
    <div style={css.page}>
      <div style={{...css.card,textAlign:"center"}}>
        <div style={{fontSize:52}}>🏆</div>
        <div style={{fontSize:22,color:"#22c55e",fontWeight:"bold",margin:"8px 0"}}>CERTIFIED!</div>
        <div style={{color:"#aaa",fontSize:13,marginBottom:4}}>
          {player.name} passed the floor walk and final exam.
        </div>
        <div style={{border:"1px solid #22c55e",borderRadius:8,padding:16,margin:"16px 0",background:"#052e16"}}>
          <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontFamily:"monospace",marginBottom:6}}>SAFETY CERTIFICATION</div>
          <div style={{color:"#fff",fontSize:15,fontWeight:"bold"}}>{player.name}</div>
          <div style={{color:"#555",fontSize:12,marginBottom:4}}>Badge: {player.badge}</div>
          <div style={{color:"#fff",fontSize:13}}>Factory Floor Safety — Passed ✓</div>
          <div style={{color:"#aaa",fontSize:11,marginTop:4}}>{new Date().toLocaleDateString()}</div>
          <div style={{fontSize:26,color:"#fbbf24",marginTop:8}}>★ {score+bossScore} total pts</div>
        </div>
        <button onClick={restart} style={css.btnGreen}>PLAY AGAIN</button>
      </div>
    </div>
  );

  if(screen==="win") return(
    <div style={css.page}>
      <div style={{...css.card,textAlign:"center"}}>
        <div style={{fontSize:52}}>✅</div>
        <div style={{fontSize:20,color:"#22c55e",fontWeight:"bold",margin:"8px 0"}}>Floor Complete!</div>
        <div style={{color:"#aaa",fontSize:13,marginBottom:16}}>Clear all {TOTAL_HAZARDS} hazard zones to unlock the final certification exam.</div>
        <div style={{fontSize:22,color:"#fbbf24",marginBottom:16}}>★ {score} pts</div>
        <button onClick={restart} style={css.btnGreen}>TRY AGAIN</button>
      </div>
    </div>
  );

  if(screen==="lose") return(
    <div style={css.page}>
      <div style={{...css.card,textAlign:"center"}}>
        <div style={{fontSize:52}}>⚠️</div>
        <div style={{fontSize:20,color:"#ef4444",fontWeight:"bold",margin:"8px 0"}}>Safety Incident</div>
        <div style={{color:"#aaa",fontSize:13,marginBottom:20}}>Too many wrong answers. Review your training and try again.</div>
        <button onClick={restart} style={css.btnRed}>TRY AGAIN</button>
      </div>
    </div>
  );

  const h=popup&&popup.tile!=='LINE_VIOLATION'?HAZARDS[popup.tile]:null;

  return(
    <div style={css.page}>
      {/* HUD */}
      <div style={{display:"flex",gap:14,marginBottom:6,fontSize:13,alignItems:"center",fontFamily:"monospace",flexWrap:"wrap",justifyContent:"center"}}>
        <span style={{color:"#60a5fa",fontSize:11}}>{player.name} · {player.badge}</span>
        <span>{"❤️".repeat(lives)}{"🖤".repeat(3-lives)}</span>
        <span style={{color:"#fbbf24"}}>★ {score}</span>
        <span style={{color:"#22c55e"}}>✓ {cleared.size}/{TOTAL_HAZARDS}</span>
      </div>

      {/* MAP */}
      <div style={{position:"relative",overflow:"hidden",borderRadius:6,border:"2px solid #333",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${COLS},${TILE}px)`,gridTemplateRows:`repeat(${ROWS},${TILE}px)`}}>
          {MAP.map((row,ry)=>row.map((tile,cx)=>(
            <Tile key={`${ry}-${cx}`} tile={tile} cleared={cleared.has(tile)} tick={tick}/>
          )))}
        </div>

        {/* Caution stripes */}
        {[4,10].map(col=>(
          <div key={col} style={{position:"absolute",top:TILE,bottom:TILE,left:col*TILE,width:2,
            background:"repeating-linear-gradient(to bottom,#fbbf24 0,#fbbf24 7px,transparent 7px,transparent 14px)",
            pointerEvents:"none"}}/>
        ))}

        {/* Moving car */}
        <div style={{position:"absolute",
          left:carCell.x*TILE+(TILE-28)/2,top:carCell.y*TILE+(TILE-36)/2,
          transition:"left 0.4s linear,top 0.4s linear",zIndex:4,pointerEvents:"none"}}>
          <PixelCar color="#e74c3c"/>
        </div>

        {/* Workers */}
        {workers.map(w=>(
          <div key={w.id} style={{position:"absolute",left:w.x*TILE,top:w.y*TILE,width:TILE,height:TILE,
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"left 0.25s,top 0.25s",zIndex:3}}>
            <PixelWorker color={w.color}/>
          </div>
        ))}

        {/* Player */}
        <div style={{position:"absolute",left:pos.x*TILE,top:pos.y*TILE,width:TILE,height:TILE,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"left 0.09s,top 0.09s",zIndex:5}}>
          <PixelPlayer/>
        </div>

        {/* Line Violation Popup */}
        {popup&&popup.tile==="LINE_VIOLATION"&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",
            alignItems:"center",justifyContent:"center",zIndex:20,borderRadius:4}}>
            <div style={{background:"#1a0000",border:"2px solid #ef4444",borderRadius:10,
              padding:24,maxWidth:300,width:"92%",textAlign:"center",
              boxShadow:"0 0 40px rgba(239,68,68,0.6)"}}>
              {/* Flashing stop sign */}
              <div style={{fontSize:52,marginBottom:8,animation:"pulse 0.5s infinite alternate"}}>🚫</div>
              <div style={{fontSize:16,color:"#ef4444",fontWeight:"bold",marginBottom:6,letterSpacing:1}}>
                LINE VIOLATION
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
                <div style={{width:14,height:14,borderRadius:"50%",background:"#ef4444",
                  boxShadow:"0 0 10px #ef4444"}}/>
                <div style={{width:14,height:14,borderRadius:"50%",background:"#ef4444",
                  boxShadow:"0 0 10px #ef4444"}}/>
                <div style={{width:14,height:14,borderRadius:"50%",background:"#ef4444",
                  boxShadow:"0 0 10px #ef4444"}}/>
              </div>
              <div style={{color:"#fff",fontSize:14,lineHeight:1.6,marginBottom:16}}>
                ⛔ You stepped onto the assembly line. Employees are <strong>NOT</strong> permitted on the conveyor. Maintenance access only. This is a recordable safety violation.
              </div>
              <div style={{color:"#ef4444",fontWeight:"bold",fontSize:13,marginBottom:16}}>−1 Life</div>
              <button onClick={closePopup} style={{display:"block",width:"100%",padding:12,
                background:"#7f1d1d",color:"#fff",border:"2px solid #ef4444",
                borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>
                Understood — Step Back
              </button>
            </div>
          </div>
        )}

        {/* Hazard Popup */}
        {popup&&h&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
            alignItems:"flex-start",justifyContent:"center",zIndex:20,borderRadius:4,
            overflowY:"auto",paddingTop:10,paddingBottom:10}}>
            <div style={{background:"#141414",border:`1px solid ${h.color}`,borderRadius:10,
              padding:20,maxWidth:310,width:"92%",boxShadow:`0 0 20px ${h.color}44`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:20}}>{h.icon}</span>
                <span style={{color:h.color,fontWeight:"bold",fontSize:14}}>{h.label}</span>
              </div>
              <div style={{color:"#fff",fontSize:14,marginBottom:14,lineHeight:1.6}}>{h.q}</div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>
                {h.opts.map((opt,i)=>{
                  let bg="#1e1e1e",border="#333",col="#ccc";
                  if(chosen!==null){
                    if(i===h.ans){bg="#052e16";border="#22c55e";col="#fff";}
                    else if(i===chosen){bg="#3f0000";border="#ef4444";col="#fff";}
                  }
                  return(
                    <button key={i} onClick={()=>handleAnswer(i)}
                      style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:6,
                        padding:"9px 11px",cursor:chosen!==null?"default":"pointer",
                        fontFamily:"inherit",fontSize:13,textAlign:"left"}}>
                      <span style={{color:"#555",marginRight:7}}>{String.fromCharCode(65+i)}.</span>{opt}
                    </button>
                  );
                })}
              </div>
              {chosen!==null&&(
                <>
                  <div style={{background:"#0f0f0f",border:`1px solid ${chosen===h.ans?"#22c55e":"#ef4444"}`,
                    borderRadius:6,padding:10,marginBottom:10}}>
                    <div style={{color:chosen===h.ans?"#22c55e":"#ef4444",fontWeight:"bold",fontSize:13,marginBottom:4}}>
                      {chosen===h.ans?"✅ Correct! +25 pts":"❌ Wrong! −1 life"}
                    </div>
                    <div style={{color:"#bbb",fontSize:12,lineHeight:1.5}}>{h.lesson}</div>
                  </div>
                  <button onClick={closePopup} style={css.btnGreen}>Back to Floor →</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* D-Pad */}
      <div style={{display:"grid",gridTemplateColumns:"52px 52px 52px",gap:6,margin:"12px 0 4px"}}>
        <div/><Dp label="▲" fn={()=>move(0,-1)}/><div/>
        <Dp label="◀" fn={()=>move(-1,0)}/>
        <div style={{width:52,height:52,background:"#1a1a1a",borderRadius:8}}/>
        <Dp label="▶" fn={()=>move(1,0)}/>
        <div/><Dp label="▼" fn={()=>move(0,1)}/><div/>
      </div>
      <div style={{color:"#444",fontSize:11,marginTop:2}}>Walk into glowing zones · Clear all {TOTAL_HAZARDS} to unlock boss quiz</div>

      {/* Footer */}
      <div style={{marginTop:20,paddingTop:14,borderTop:"1px solid #1e1e1e",textAlign:"center",fontSize:12,color:"#444"}}>
        Built by BG &nbsp;·&nbsp;
        <a href="https://assetsystemsco.com" target="_blank"
          style={{color:"#555",textDecoration:"none"}}>
          Asset Systems Co.
        </a>
      </div>
    </div>
  );
}

function Dp({label,fn}){
  return(
    <button onPointerDown={fn}
      style={{width:52,height:52,background:"#1e1e1e",border:"1px solid #3a3a3a",color:"#bbb",
        borderRadius:8,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",
        justifyContent:"center",touchAction:"none",userSelect:"none",WebkitUserSelect:"none"}}>
      {label}
    </button>
  );
}

const css={
  page:{minHeight:"100vh",background:"#0a0a0a",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif",padding:"10px 6px",color:"#fff"},
  card:{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:22,width:"100%"},
  input:{width:"100%",padding:"10px 12px",background:"#0f0f0f",border:"1px solid #333",
    borderRadius:6,color:"#fff",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"},
  btnGreen:{display:"block",width:"100%",padding:13,background:"#16a34a",color:"#fff",border:"none",
    borderRadius:8,fontSize:15,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"},
  btnRed:{display:"block",width:"100%",padding:13,background:"#dc2626",color:"#fff",border:"none",
    borderRadius:8,fontSize:15,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"},
  btnBlue:{padding:"10px 20px",background:"#1d4ed8",color:"#fff",border:"none",
    borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"},
};
