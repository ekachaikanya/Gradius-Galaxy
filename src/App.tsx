import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PilotProfile, GameView, StoryStage, StageBuff, GameDifficulty } from "./types";
import GradiusGame from "./components/GradiusGame";
import StoryBriefing from "./components/StoryBriefing";
import OnlineLobby from "./components/OnlineLobby";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { Gamepad2, Trophy, Shield, Rocket, Radio, RefreshCcw, LogIn, User as UserIcon } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<GameView>(GameView.MAIN_MENU);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [commanderName, setCommanderName] = useState<string>("Viper-1");

  // Gate Choice selection state
  const [hasChosenGuest, setHasChosenGuest] = useState<boolean>(() => {
    return localStorage.getItem("gradius_has_chosen_guest") === "true";
  });
  const [gateGuestInput, setGateGuestInput] = useState<string>(() => {
    return localStorage.getItem("gradius_guest_name") || `Pilot-${Math.floor(100 + Math.random() * 900)}`;
  });

  // Story mode active states
  const [activeStage, setActiveStage] = useState<StoryStage | null>(null);
  const [activeBuff, setActiveBuff] = useState<StageBuff | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<GameDifficulty>("NORMAL");

  // Real-time battle state parameters
  const [activeLobbyId, setActiveLobbyId] = useState<string>("");
  const [playerRole, setPlayerRole] = useState<"host" | "guest" | "">("");

  // Ghost duel challenger parameters
  const [opponentGhostFrames, setOpponentGhostFrames] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [opponentScore, setOpponentScore] = useState<number>(0);

  // Session results summary
  const [lastScore, setLastScore] = useState<number>(0);
  const [clearedStage, setClearedStage] = useState<number>(1);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [recordedGhost, setRecordedGhost] = useState<string>("");

  // Global pilot profile
  const [profile, setProfile] = useState<PilotProfile | null>(null);

  // Monitor Auth state changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Determine the Google profile's real name (capped at 20 characters as per Firestore rules)
        const googleName = user.displayName ? user.displayName.slice(0, 20) : `Pilot-${Math.floor(100 + Math.random() * 900)}`;
        setCommanderName(googleName);

        // Fetch or initialize their persistent profile under /profiles/{uid}
        const profileRef = doc(db, "profiles", user.uid);
        try {
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: user.uid,
              commanderName: googleName,
              highScore: data.highScore,
              storyProgress: data.storyProgress
            });
            // Update Firestore with the current Google name if it has changed
            if (data.commanderName !== googleName) {
              await setDoc(profileRef, {
                ...data,
                commanderName: googleName,
                updatedAt: new Date()
              }, { merge: true });
            }
          } else {
            // First time profile generation
            const mockProfile: PilotProfile = {
              uid: user.uid,
              commanderName: googleName,
              highScore: 0,
              storyProgress: 0
            };
            await setDoc(profileRef, {
              commanderName: googleName,
              highScore: 0,
              storyProgress: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            setProfile(mockProfile);
          }
        } catch (err) {
          console.warn("Secure rules isolated profile or guest access triggered.", err);
        }
      } else {
        setProfile(null);
        // Load guest name from local storage
        const storedGuestName = localStorage.getItem("gradius_guest_name") || `Pilot-${Math.floor(100 + Math.random() * 900)}`;
        // Save back if it was generated freshly
        if (!localStorage.getItem("gradius_guest_name")) {
          localStorage.setItem("gradius_guest_name", storedGuestName);
        }
        setCommanderName(storedGuestName);
      }
    });
    return unsub;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      localStorage.removeItem("gradius_has_chosen_guest");
      setHasChosenGuest(false);
    } catch (e: any) {
      console.error("Sign in failed:", e);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("gradius_has_chosen_guest");
      setHasChosenGuest(false);
    } catch (e: any) {
      console.error("Sign out process error:", e);
    }
  };

  const handleEnterAsGuest = (nickname: string) => {
    const cleanName = nickname.trim().slice(0, 16) || `Pilot-${Math.floor(100 + Math.random() * 900)}`;
    setCommanderName(cleanName);
    localStorage.setItem("gradius_guest_name", cleanName);
    localStorage.setItem("gradius_has_chosen_guest", "true");
    setHasChosenGuest(true);
  };

  // Sync profile callsign when logged in user modifies it in lobby
  const handleUpdateCallsighName = async (newName: string) => {
    setCommanderName(newName);
    if (currentUser) {
      const profileRef = doc(db, "profiles", currentUser.uid);
      try {
        await setDoc(profileRef, {
          commanderName: newName,
          highScore: profile?.highScore || 0,
          storyProgress: profile?.storyProgress || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        if (profile) {
          setProfile({ ...profile, commanderName: newName });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${currentUser.uid}`);
      }
    } else {
      localStorage.setItem("gradius_guest_name", newName);
      setGateGuestInput(newName);
    }
  };

  // Launch direct story match
  const handleStartMission = (stage: StoryStage, buff: StageBuff | null, difficulty: GameDifficulty) => {
    setActiveStage(stage);
    setActiveBuff(buff);
    setActiveDifficulty(difficulty);
    setOpponentGhostFrames(""); // Clear opponent ghosts
    setOpponentName("");
    setOpponentScore(0);
    setActiveView(GameView.GAMEPLAY);
  };

  // Launch Duel Challenging match
  const handleStartGhostDuel = (ghostFrames: string, opponentCallsign: string, oppScore: number) => {
    setActiveStage({
      chapter: 1,
      title: "Orion Belt Patrol",
      description: "Holographic competitive duel coordinates locked. Fly side-by-side against recorded patterns.",
      stageType: "Competitive Ghost Duel Arena",
      bossName: "Orion Capital Core",
      baseDifficulty: 1.5,
      colorTheme: "blue"
    });
    setActiveBuff(null);
    setOpponentGhostFrames(ghostFrames);
    setOpponentName(opponentCallsign);
    setOpponentScore(oppScore);
    setActiveView(GameView.GAMEPLAY);
  };

  // Launch synchronous competitive matchroom duel
  const handleStartLobbyBattle = (lobbyId: string, role: "host" | "guest", stage: StoryStage) => {
    setActiveLobbyId(lobbyId);
    setPlayerRole(role);
    setActiveStage(stage);
    setActiveBuff(null);
    setOpponentGhostFrames("");
    setOpponentName("");
    setOpponentScore(0);
    setActiveView(GameView.GAMEPLAY);
  };

  // Safe multiplayer exit and cleanup
  const handleExitLobbyBattle = async () => {
    if (activeLobbyId && playerRole) {
      const lobbyRef = doc(db, "lobbies", activeLobbyId);
      try {
        if (playerRole === "host") {
          await setDoc(lobbyRef, { status: "finished" }, { merge: true });
        } else {
          await setDoc(lobbyRef, {
            guestId: "",
            guestName: "",
            guestReady: false,
            guestFinished: true
          }, { merge: true });
        }
      } catch (err) {
        console.warn("Could not clean up lobby on exit:", err);
      }
    }
    setActiveLobbyId("");
    setPlayerRole("");
    setActiveView(GameView.ONLINE_LOBBY);
  };

  // Complete Active Gameplay
  const handleGameFinished = async (finalScore: number, progressedChapter: number, ghostFramesStr: string) => {
    setLastScore(finalScore);
    setClearedStage(progressedChapter);
    setRecordedGhost(ghostFramesStr);
    setSaveStatus("");
    setActiveView(GameView.GAME_OVER);

    // Auto submit scores to cloud databases for both logged-in and guest pilots!
    setSubmittingScore(true);
    setSaveStatus("Securing flight logs to regional telemetry server...");

    const randomScoreId = `score-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const randomGhostId = `ghost-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const userIdToSave = currentUser ? currentUser.uid : "guest";

    try {
      // 1. Submit compact ghost frames file trace
      if (ghostFramesStr && ghostFramesStr.length > 10) {
        const ghostPayload = {
          userId: userIdToSave,
          commanderName: commanderName.slice(0, 20),
          score: finalScore,
          ghostFrames: ghostFramesStr,
          createdAt: new Date()
        };
        await setDoc(doc(db, "ghosts", randomGhostId), ghostPayload);
      }

      // 2. Submit leaderboard high score record
      const leaderPayload = {
        userId: userIdToSave,
        commanderName: commanderName.slice(0, 20),
        score: finalScore,
        stage: progressedChapter,
        ghostId: ghostFramesStr ? randomGhostId : "none",
        difficulty: activeDifficulty,
        createdAt: new Date()
      };
      await setDoc(doc(db, "leaderboard", randomScoreId), leaderPayload);

      // 3. Update Pilot's Profile if score exceeds their previous best (only if logged in)
      if (currentUser) {
        const isNewBest = finalScore > (profile?.highScore || 0);
        const nextChapter = Math.max(profile?.storyProgress || 0, progressedChapter);

        if (isNewBest || nextChapter > (profile?.storyProgress || 0)) {
          const profileRef = doc(db, "profiles", currentUser.uid);
          await setDoc(profileRef, {
            commanderName: commanderName.slice(0, 20),
            highScore: isNewBest ? finalScore : (profile?.highScore || 0),
            storyProgress: nextChapter,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          setProfile({
            uid: currentUser.uid,
            commanderName: commanderName.slice(0, 20),
            highScore: isNewBest ? finalScore : (profile?.highScore || 0),
            storyProgress: nextChapter
          });
        }
        setSaveStatus("Telemetry synchronization successfully established! Ranking secured.");
      } else {
        // Save locally in local storage for guest pilots
        const guestBestStr = localStorage.getItem("gradius_guest_best") || "0";
        const guestBest = parseInt(guestBestStr);
        if (finalScore > guestBest) {
          localStorage.setItem("gradius_guest_best", String(finalScore));
        }
        setSaveStatus("Pilot ranking details successfully registered on global leaderboard!");
      }
    } catch (err: any) {
      console.error("Firestore Rules restricted submittal:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `leaderboard/${randomScoreId}`);
      } catch (diagnosedError) {
        console.error("Diagnosed permission error detail:", diagnosedError);
      }
      setSaveStatus("Logs rejected. Make sure network communication is unimpeded.");
    } finally {
      setSubmittingScore(false);
    }

    setActiveLobbyId("");
    setPlayerRole("");
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Sleek Interface background Nebula glow effects */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-950/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-950/45 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-cyan-950/40 rounded-full blur-[100px]"></div>
      </div>

      {/* Decorative cybernetic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,_16,_16,_0)_50%,_rgba(0,_0,_0,_0.25)_50%)] bg-[size:100%_4px] pointer-events-none z-0"></div>

      <AnimatePresence mode="wait">
        
        {/* GATE AUTHORIZATION PORTAL */}
        {!currentUser && !hasChosenGuest ? (
          <motion.div
            key="auth-portal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md bg-zinc-950/75 border border-white/10 p-8 rounded-3xl shadow-2xl text-center z-10 relative backdrop-blur-md"
            id="gradius-auth-portal"
          >
            {/* Glowing rocket icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-full shadow-lg shadow-cyan-500/15 animate-pulse">
                <Rocket size={44} className="text-cyan-400" />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white uppercase" style={{ wordSpacing: "3px" }}>
              GRADIUS <span className="text-cyan-400 arcade-text-glow-blue">GALAXY</span>
            </h1>
            <p className="text-zinc-500 text-xs tracking-wider uppercase font-mono mt-1 mb-6">Access Authorization Bureau</p>

            <p className="text-zinc-300 text-xs leading-relaxed mb-6 font-sans">
              Connect Google profile to secure permanent flight telemetry and live radio broadcasts, or enter immediately under a customizable Guest pilot callsign.
            </p>

            <div className="space-y-4">
              {/* Option A: Link Google Profile */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
                id="portal-login-google-btn"
              >
                <LogIn size={15} />
                <span>Link Google Profile</span>
              </button>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#05070a] px-3 text-zinc-500 font-mono tracking-widest">Or standalone guest</span>
                </div>
              </div>

              {/* Option B: Custom Callsign Guest Entry */}
              <div className="text-left bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                <label className="block text-[10px] font-extrabold uppercase text-zinc-400 font-mono tracking-wider">
                  Select Guest Callsign
                </label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Enter guest callsign..."
                  value={gateGuestInput}
                  onChange={(e) => setGateGuestInput(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 focus:outline-none rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs"
                />
                
                <button
                  onClick={() => handleEnterAsGuest(gateGuestInput)}
                  className="w-full py-2 bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-750 hover:to-zinc-650 text-zinc-200 border border-white/5 font-mono text-[11px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Launch Guest Mode 🛸</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-mono mt-6">
              * Guest score logs are registered anonymously on global scoreboard.
            </p>
          </motion.div>
        ) : (
          /* VIEW 1: Main Landing Title Menu */
          activeView === GameView.MAIN_MENU && (
            <motion.div
              key="main-menu"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl bg-black/40 border border-white/10 p-8 rounded-3xl shadow-2xl text-center z-10 relative backdrop-blur-md"
              id="gradius-main-menu"
            >
              {/* Glowing spaceship vector halo */}
              <div className="flex justify-center mb-5">
                <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-full shadow-lg shadow-cyan-500/10 animate-pulse">
                  <Rocket size={42} className="text-cyan-400" />
                </div>
              </div>

              {/* Title Pairings displays */}
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-display text-white uppercase" style={{ wordSpacing: "3px" }}>
                GRADIUS <span className="text-cyan-400 arcade-text-glow-blue">GALAXY</span>
              </h1>
              <p className="text-zinc-500 text-xs tracking-wider uppercase font-mono mt-1">Online Competitive & Story Arena</p>

              {/* Callsign Status Banner with Actions */}
              <div className="my-6 bg-black/40 p-3 px-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-lg mx-auto text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className={currentUser ? "text-emerald-400 animate-pulse" : "text-amber-400 animate-pulse"}>●</span>
                  <span className="text-zinc-400">{currentUser ? "PILOT COUPLING:" : "GUEST MODE:"}</span>
                  <strong className="text-white text-sm tracking-wide">{commanderName}</strong>
                </div>
                
                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 font-bold rounded-lg text-[10px] uppercase transition-all tracking-wider font-mono cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        localStorage.removeItem("gradius_has_chosen_guest");
                        setHasChosenGuest(false);
                      }}
                      className="px-3 py-1.5 bg-cyan-950/40 text-cyan-400 hover:text-cyan-300 border border-cyan-900/20 font-bold rounded-lg text-[10px] uppercase transition-all tracking-wider font-mono cursor-pointer"
                    >
                      Auth Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Core Launch Interfaces */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                
                <button
                  onClick={() => setActiveView(GameView.STORY_BRIEFING)}
                  className="group p-5 bg-gradient-to-br from-white/5 to-white/[0.01] hover:from-white/10 border border-white/10 hover:border-cyan-500/40 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[140px]"
                  id="story-mode-btn"
                >
                  <div className="bg-white/5 group-hover:bg-cyan-950/35 text-zinc-400 group-hover:text-cyan-400 p-2 rounded-lg inline-self-start transition-colors">
                    <Gamepad2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase font-display text-white group-hover:text-cyan-400 transition-colors">🚀 STORY CAMPAIGN</h3>
                    <p className="text-zinc-400/80 text-[11px] font-sans leading-tight mt-1">
                      AI-powered tactile story missions, co-pilot logs, and custom ship modifiers.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveView(GameView.ONLINE_LOBBY)}
                  className="group p-5 bg-gradient-to-br from-white/5 to-white/[0.01] hover:from-white/10 border border-white/10 hover:border-orange-500/40 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[140px]"
                  id="online-lobby-btn"
                >
                  <div className="bg-white/5 group-hover:bg-orange-950/35 text-zinc-400 group-hover:text-orange-400 p-2 rounded-lg inline-self-start transition-colors">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase font-display text-white group-hover:text-orange-400 transition-colors">🏆 LEADERBOARD HUB</h3>
                    <p className="text-zinc-400/80 text-[11px] font-sans leading-tight mt-1">
                      Live pilot communications, global scoreboard rankings, and real flight trajectory ghost duels.
                    </p>
                  </div>
                </button>

              </div>

              {/* Quick Guest Score display */}
              <div className="mt-8 text-[11px] text-zinc-500 font-mono">
                {!currentUser && (
                  <span>Guest Local Record: <strong className="text-zinc-300 font-bold">{localStorage.getItem("gradius_guest_best") || 0}</strong></span>
                )}
                {currentUser && profile && (
                  <span>Commander Record: <strong className="text-cyan-400 font-bold">{profile.highScore.toLocaleString()}</strong> | Completed Sectors: <strong className="text-orange-400">{profile.storyProgress}</strong></span>
                )}
              </div>

            </motion.div>
          )
        )}

        {/* VIEW 2: Story Briefing Control center */}
        {activeView === GameView.STORY_BRIEFING && (
          <motion.div
            key="story"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="z-10 w-full flex justify-center"
          >
            <StoryBriefing
              commanderName={commanderName}
              onBack={() => setActiveView(GameView.MAIN_MENU)}
              onStartMission={handleStartMission}
            />
          </motion.div>
        )}

        {/* VIEW 3: Competitive Leaderboard & Comms Hub */}
        {activeView === GameView.ONLINE_LOBBY && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="z-10 w-full flex justify-center"
          >
            <OnlineLobby
              commanderName={commanderName}
              onSetCommanderName={handleUpdateCallsighName}
              onChallengeGhost={handleStartGhostDuel}
              onBack={() => setActiveView(GameView.MAIN_MENU)}
            />
          </motion.div>
        )}

        {/* VIEW 4: Active side-scroller Gameplay flight */}
        {activeView === GameView.GAMEPLAY && activeStage && (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 w-full flex justify-center"
          >
            <GradiusGame
              pilot={profile || { uid: "guest", commanderName, highScore: 0, storyProgress: 0 }}
              stage={activeStage}
              buff={activeBuff}
              difficulty={activeDifficulty}
              onGameFinished={handleGameFinished}
              onExit={handleExitLobbyBattle}
              opponentGhostFrames={opponentGhostFrames}
              opponentName={opponentName}
              opponentScore={opponentScore}
              activeLobbyId={activeLobbyId}
              playerRole={playerRole}
            />
          </motion.div>
        )}

        {/* VIEW 5: Mission completed terminal panel */}
        {activeView === GameView.GAME_OVER && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-black/60 border border-white/10 p-8 rounded-3xl shadow-2xl text-center z-10 relative font-mono backdrop-blur-md"
            id="gameover-summary"
          >
            <h2 className="text-3xl font-extrabold tracking-widest text-cyan-400 uppercase arcade-text-glow-blue">MISSION REPORT</h2>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Pilot Telemetry Logs Saved</div>

            <div className="my-6 bg-black/40 p-5 rounded-xl border border-white/5 text-left space-y-4">
              
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400 font-sans">PILOT CALLSIGN:</span>
                <span className="text-white font-bold">{commanderName}</span>
              </div>

              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400 font-sans">FINAL SCORE:</span>
                <span className="text-cyan-400 font-extrabold text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse">{lastScore.toLocaleString()}</span>
              </div>

              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400 font-sans">STAGE CLEARANCE:</span>
                <span className="text-orange-400 font-bold">Sector {clearedStage} completed</span>
              </div>

              {saveStatus && (
                <div className="p-3 bg-cyan-950/20 rounded border border-cyan-800/40 text-[11px] leading-relaxed text-cyan-300 font-sans flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  <span>{saveStatus}</span>
                </div>
              )}

            </div>

            <div className="flex flex-col space-y-2 mt-6">
              <button
                onClick={() => setActiveView(GameView.MAIN_MENU)}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-lg uppercase tracking-wider text-xs font-black transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                id="gamover-mainmenu-btn"
              >
                <span>Return To Command Menu</span>
              </button>

              <button
                onClick={() => {
                  if (activeStage) {
                    setActiveView(GameView.GAMEPLAY);
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 rounded-lg border border-orange-500/30 uppercase text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md hover:shadow-orange-500/20"
                id="gamover-retry-btn"
              >
                <RefreshCcw size={12} className="animate-spin-slow" />
                <span>Retry Flight sector coordinates</span>
              </button>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
