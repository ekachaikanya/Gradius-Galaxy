import React, { useState } from "react";
import { StoryStage, StageBuff, StoryScenarioResponse, GameDifficulty } from "../types";
import { Sparkles, Shield, Rocket, Target, Zap, Waves, ShieldAlert } from "lucide-react";

interface StoryBriefingProps {
  commanderName: string;
  onStartMission: (stage: StoryStage, buff: StageBuff | null, difficulty: GameDifficulty) => void;
  onBack: () => void;
}

export const SECTORS: StoryStage[] = [
  {
    chapter: 1,
    title: "Orion Belt Patrol",
    description: "Navigate through incoming waves of rebel starfighters and asteroid debris. High-density fighter swarms detected.",
    stageType: "Deep Space Patrol",
    bossName: "Orion Capital Core",
    baseDifficulty: 1,
    colorTheme: "gray"
  },
  {
    chapter: 2,
    title: "Magma Cave of Xenon",
    description: "Breach the underground fortress with narrow ceilings and rising magma heat columns. Watch your altitude closely!",
    stageType: "Magma Cavern Fortress",
    bossName: "Inferno core V2",
    baseDifficulty: 2,
    colorTheme: "amber"
  },
  {
    chapter: 3,
    title: "Biohazard Hive Sector",
    description: "Infiltrate the bio-cybernetic capital hive. Dangerous ground turrets dynamically locking onto your signature.",
    stageType: "Mutagen Cyber-Nest",
    bossName: "Behemoth hive core",
    baseDifficulty: 3,
    colorTheme: "blue"
  }
];

export default function StoryBriefing({ commanderName, onStartMission, onBack }: StoryBriefingProps) {
  const [selectedStage, setSelectedStage] = useState<StoryStage>(SECTORS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>("NORMAL");
  const [playerChoice, setPlayerChoice] = useState<string>("Engage defensive deflector array shields");
  const [scenario, setScenario] = useState<StoryScenarioResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const choices = [
    { label: "Shield Deflectors", desc: "Engage front defensive shields (Starts with front shield)", type: "SHIELD", value: 3, icon: Shield },
    { label: "Thruster Intertwining", desc: "Synchronize Option flight pods trail (+1 Option satellite)", type: "OPTION", value: 1, icon: Rocket },
    { label: "High-Voltage Overclock", desc: "Speed up response thrusters (Starts with max ship velocity)", type: "SPEED", value: 2, icon: Zap },
    { label: "Rapid Fire capacitors", desc: "Short-circuit main guns recharge systems (Faster projectile fire)", type: "FIRE_RATE", value: 1.5, icon: Target },
    { label: "Missile Bay Priming", desc: "Deploy floor slide missiles (Equips missiles immediately)", type: "MISSILE", value: 1, icon: Waves }
  ];

  const fetchBriefing = async () => {
    setLoading(true);
    setErrorText("");
    setScenario(null);
    try {
      const response = await fetch("/api/story/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter: selectedStage.chapter,
          commanderName,
          playerChoice,
          stageType: selectedStage.stageType
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact sector command satellites");
      }

      const data: StoryScenarioResponse = await response.json();
      setScenario(data);
    } catch (e: any) {
      console.error(e);
      // Construct fallback internally on network limits
      setScenario({
        storyText: `System Static! Communication jammed. Commander, we have located critical enemy positions at ${selectedStage.title}. Choose your gear and launch immediately.`,
        alienDialogue: "YOU ARE NO MATCH FOR THE CORE FLEET.",
        wingmanAdvice: "No advice available. Fly with extreme precision!",
        stageBuff: {
          name: "Auxiliary Shields",
          description: "Starts match with default auxiliary shielding support.",
          type: "SHIELD",
          value: 1
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-2xl font-sans backdrop-blur-md" id="story-lobby-room">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center space-x-2">
            <Rocket className="text-cyan-400 rotate-45 animate-pulse" size={26} />
            <span>STAGE DEPLOYMENT</span>
          </h2>
          <p className="text-zinc-400 text-sm">Select coordinates and configure Vic Viper loadout modifiers</p>
        </div>
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white text-xs font-mono border border-white/10 hover:border-cyan-400/50 rounded px-3 py-1.5 bg-white/5 hover:bg-cyan-950/20 transition-all cursor-pointer"
        >
          Back To Menu ⎋
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Chapter & Preparation Choices selection */}
        <div className="md:col-span-6 flex flex-col space-y-5">
          {/* 1. Sector Coordinates Selection list */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">1. Select Sector Coordinates</h3>
            <div className="grid grid-cols-1 gap-2">
              {SECTORS.map((st) => (
                <button
                  key={st.chapter}
                  onClick={() => {
                    setSelectedStage(st);
                    setScenario(null); // Clear previous story
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedStage.chapter === st.chapter
                      ? "bg-cyan-950/25 border-cyan-500 text-white shadow-lg shadow-cyan-950/10"
                      : "bg-[#090e16]/60 border-white/5 text-zinc-400 hover:border-white/10 hover:bg-[#0c1420]/60"
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold font-display text-white">
                      Sector {st.chapter}: {st.title}
                    </div>
                    <div className="text-xs text-zinc-500 leading-tight mt-0.5">{st.stageType}</div>
                  </div>
                  <span className={`text-xs font-mono border rounded px-1.5 py-0.5 ${
                    selectedStage.chapter === st.chapter
                      ? "bg-cyan-950 text-cyan-400 border-cyan-800/60"
                      : "bg-black/40 text-zinc-500 border-white/5"
                  }`}>
                    DIFFICULTY: {st.baseDifficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Combat Difficulty Level Selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">2. Choose Combat Difficulty</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["EASY", "NORMAL", "HARD"] as GameDifficulty[]).map((dif) => (
                <button
                  key={dif}
                  type="button"
                  onClick={() => setSelectedDifficulty(dif)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    selectedDifficulty === dif
                      ? "bg-teal-950/30 border-teal-500 text-white shadow-lg shadow-teal-950/20"
                      : "bg-[#090e16]/60 border-white/5 text-zinc-400 hover:border-white/10 hover:bg-[#0c1420]/60"
                  }`}
                >
                  <span className="text-[11px] font-bold font-mono">
                    {dif === "EASY" ? "🟢 EASY" : dif === "NORMAL" ? "🟡 NORMAL" : "🔴 HARD"}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    {dif === "EASY" ? "0.6x Speed" : dif === "NORMAL" ? "1.0x Speed" : "1.6x Speed"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tactical Preparation Choices selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">3. Choose Tactical Buff</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {choices.map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.label}
                    onClick={() => {
                      setPlayerChoice(ch.label);
                      setScenario(null); // Clear previous story
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                      playerChoice === ch.label
                        ? "bg-orange-950/25 border-orange-500 text-white shadow-lg shadow-orange-950/10"
                        : "bg-[#090e16]/40 border-white/5 text-zinc-400 hover:border-white/10 hover:bg-[#0c1420]/40"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg mt-0.5 ${playerChoice === ch.label ? "bg-orange-500/20 text-orange-400" : "bg-black/45 text-zinc-500"}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{ch.label}</div>
                      <div className="text-[10px] text-zinc-500 leading-tight">{ch.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Action Button */}
          <button
            onClick={fetchBriefing}
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 font-display font-black text-black uppercase py-3 rounded-xl tracking-widest text-sm shadow-xl hover:shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 disabled:bg-white/5 disabled:text-zinc-600 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles size={16} />
            <span>{loading ? "Decrypting Signals..." : "Generate AI Mission Briefing"}</span>
          </button>
        </div>

        {/* Right Side: Gemini Smart Briefing outcome */}
        <div className="md:col-span-6 flex flex-col bg-[#090e16]/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden min-h-[300px]" id="briefing-terminal-output">
          
          {loading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-15 font-mono">
              <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-cyan-400 animate-pulse uppercase tracking-wider">Intercepting Sector Logs...</p>
            </div>
          )}

          {!scenario && !loading && (
            <div className="flex flex-col items-center justify-center flex-grow text-center p-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
              <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                Click <span className="text-cyan-400 font-extrabold uppercase">"Generate AI Mission Briefing"</span> to receive a custom tactical flight plan and unlock your starting ship bonus.
              </p>
            </div>
          )}

          {scenario && !loading && (
            <div className="flex flex-col space-y-4 font-mono text-xs flex-grow justify-between">
              
              {/* Story Narrative block */}
              <div>
                <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>ENCRYPTED SIGNAL RECEIVED</span>
                </span>
                <div className="text-zinc-300 text-xs leading-relaxed mt-2 p-3 bg-black/40 rounded-xl border border-white/5 font-sans" id="briefing-story-body">
                  {scenario.storyText}
                </div>
              </div>

              {/* Alien Transmission dialogue call */}
              <div className="bg-red-950/20 border-l-2 border-red-500 p-3 rounded-lg">
                <div className="text-red-500 font-extrabold text-[10px] uppercase tracking-wider mb-1">⚠️ HOSTILE ALIEN INTERCEPT:</div>
                <div className="text-rose-200 italic font-mono text-[11px] leading-tight">
                  "{scenario.alienDialogue}"
                </div>
              </div>

              {/* Wingman Voice check */}
              <div className="bg-[#0e2730] border-l-2 border-cyan-500 p-3 rounded-lg">
                <div className="text-cyan-400 font-extrabold text-[10px] uppercase tracking-wider mb-1">🤖 CO-PILOT ADVICE:</div>
                <div className="text-cyan-100 text-[11px] leading-tight font-sans">
                  {scenario.wingmanAdvice}
                </div>
              </div>

              {/* Buff Modification reward box */}
              <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex items-center justify-between" id="modifier-badge">
                <div className="flex flex-col">
                  <span className="text-orange-400 font-extrabold text-[10px] uppercase tracking-widest">TACTICAL DEPLOYMENT ACTIVE</span>
                  <span className="text-white text-xs font-bold leading-none mt-1">{scenario.stageBuff.name}</span>
                  <span className="text-zinc-400 text-[10px] leading-tight mt-0.5 font-sans">{scenario.stageBuff.description}</span>
                </div>
                <div className="bg-orange-600 text-white font-black px-2 py-1.5 rounded-lg text-[10px] uppercase tracking-wider text-center flex flex-col min-w-[75px] shadow-md shadow-orange-500/20">
                  <span>{scenario.stageBuff.type}</span>
                  <span className="text-sm font-black mt-0.5">+{scenario.stageBuff.value}</span>
                </div>
              </div>

              {/* Launcher Deploy trigger */}
              <button
                onClick={() => onStartMission(selectedStage, scenario.stageBuff, selectedDifficulty)}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-display font-black uppercase text-center py-3 rounded-xl text-xs tracking-widest transition-all shadow-lg hover:shadow-cyan-400/20 cursor-pointer"
              >
                Launch Starfighter Now ✈
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
