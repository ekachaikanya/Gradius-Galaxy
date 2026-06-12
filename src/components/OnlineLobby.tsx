import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  setDoc,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from "firebase/auth";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { ChatMessage, LeaderboardEntry } from "../types";
import { MessageSquare, Trophy, Swords, LogIn, LogOut, Radio, Check, ChevronLeft, User as UserIcon } from "lucide-react";

interface OnlineLobbyProps {
  commanderName: string;
  onSetCommanderName: (name: string) => void;
  onChallengeGhost: (ghostFrames: string, opponentName: string, opponentScore: number) => void;
  onBack: () => void;
}

export default function OnlineLobby({
  commanderName,
  onSetCommanderName,
  onChallengeGhost,
  onBack
}: OnlineLobbyProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [commanderInput, setCommanderInput] = useState<string>(commanderName || "");
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [messagesInput, setMessagesInput] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | "EASY" | "NORMAL" | "HARD">("ALL");
  const [loadingScore, setLoadingScore] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(true);

  // Sync active Auth subscription
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        const cleanName = user.displayName ? user.displayName.slice(0, 20) : `Pilot-${Math.floor(100 + Math.random() * 900)}`;
        onSetCommanderName(cleanName);
        setCommanderInput(cleanName);
      }
    });
    return unsub;
  }, [onSetCommanderName]);

  // Sync input value when commanderName prop changes from parent
  useEffect(() => {
    setCommanderInput(commanderName);
  }, [commanderName]);

  // Stream Live global Pilot chats using Firestore Real-time Snapshot
  useEffect(() => {
    setLoadingChat(true);
    const chatsRef = collection(db, "chat");
    const q = query(chatsRef, orderBy("createdAt", "desc"), limit(40));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        msgs.push({
          id: doc.id,
          userId: d.userId,
          commanderName: d.commanderName,
          message: d.message,
          createdAt: d.createdAt
        });
      });
      // Sort messages ascending chronologically for natural chat lists
      setChats(msgs.reverse());
      setLoadingChat(false);
    }, (error) => {
      console.warn("Secure rules isolated chat logs from guest viewing.", error);
      setLoadingChat(false);
    });

    return unsub;
  }, []);

  // Load Leaderboard entries from Firestore
  const fetchLeaderboard = async () => {
    setLoadingScore(true);
    const leaderboardRef = collection(db, "leaderboard");
    const q = query(leaderboardRef, orderBy("score", "desc"), limit(25));

    try {
      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        entries.push({
          id: doc.id,
          userId: d.userId,
          commanderName: d.commanderName,
          score: d.score,
          stage: d.stage,
          ghostId: d.ghostId,
          difficulty: d.difficulty || "NORMAL",
          createdAt: d.createdAt
        });
      });
      setLeaderboard(entries);
    } catch (error) {
      console.error("Leaderboard loading error:", error);
    } finally {
      setLoadingScore(false);
    }
  };

  // Trigger loading scores on mount and when user auth changes
  useEffect(() => {
    fetchLeaderboard();
  }, [currentUser]);

  // Auth: Log in with Google Popup
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Sign in failed:", e);
    }
  };

  // Auth: Log out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (e: any) {
      console.error("Sign out process error:", e);
    }
  };

  // Send a Live global Chat message to Firestore
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messagesInput.trim() || !currentUser) return;

    const pilotCallsign = commanderName || "Pilot";
    const docId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const chatPayload = {
      userId: currentUser.uid,
      commanderName: pilotCallsign.slice(0, 16),
      message: messagesInput.trim().slice(0, 150),
      createdAt: new Date()
    };

    setMessagesInput("");

    try {
      await setDoc(doc(db, "chat", docId), chatPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chat/${docId}`);
    }
  };

  // Launch Duel against another player's high score ghost
  const handleLaunchDuel = async (entry: LeaderboardEntry) => {
    if (!entry.ghostId || entry.ghostId === "none") {
      alert("No telemetry flight profile exists for this pilot.");
      return;
    }

    try {
      const ghostDoc = await getDoc(doc(db, "ghosts", entry.ghostId));
      if (ghostDoc.exists()) {
        const ghData = ghostDoc.data();
        if (ghData.ghostFrames) {
          onChallengeGhost(ghData.ghostFrames, entry.commanderName, entry.score);
        } else {
          alert("Telemetry trajectory is empty.");
        }
      } else {
        alert("The pilot's telemetry ghost has expired.");
      }
    } catch (e) {
      console.error("Error retrieving ghost frames", e);
      alert("An access error occurred while syncing ghost signals.");
    }
  };

  // Set Callsign
  const handleSaveCallsign = () => {
    if (commanderInput.trim().length >= 2) {
      onSetCommanderName(commanderInput.trim().slice(0, 16));
    }
  };

  return (
    <div className="w-full max-w-4xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-2xl font-sans backdrop-blur-md" id="online-lobby-panel">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-5 mb-5 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer"
            id="back-menu-btn"
            title="Return to Main Menu"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center space-x-2">
              <Trophy className="text-cyan-400" size={26} />
              <span>PILOT LEADERBOARD</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-0.5">Global high scores, recorded pilot trajectory duels, and communication network</p>
          </div>
        </div>

        {currentUser ? (
          <div className="flex items-center space-x-3 bg-black/40 border border-white/5 p-2 rounded-xl">
            <div className="flex flex-col text-right">
              <span className="text-xs font-mono text-cyan-400 font-bold">● LINK ESTABLISHED</span>
              <span className="text-white text-xs font-semibold leading-tight">{currentUser.displayName}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 bg-black/50 text-orange-400 hover:text-orange-300 rounded border border-white/5 hover:border-orange-500/20 transition-all cursor-pointer"
              title="Logout Profile"
              id="google-logout-btn"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoogleSignIn}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase tracking-wider font-extrabold rounded-xl flex items-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              id="google-login-btn"
            >
              <LogIn size={15} />
              <span>Connect Google Pilot Profile</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Leaderboard and Names */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Custom Pilot Name Customization Card */}
          <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-white/5 p-4 rounded-2xl shadow-lg" id="pilot-callsign-form">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex-grow w-full max-w-md">
                <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1 font-mono tracking-wider">
                  {currentUser ? "My Active Profile Callsign (Sync to Account)" : "Custom Guest Pilot Callsign (Customize name)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Enter custom callsign..."
                    value={commanderInput}
                    onChange={(e) => setCommanderInput(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 focus:border-cyan-500 focus:outline-none rounded-lg pl-3 pr-20 py-2.5 text-zinc-100 font-mono text-xs"
                  />
                  <div className="absolute right-1 top-1 bottom-1 flex items-center">
                    <button
                      onClick={handleSaveCallsign}
                      disabled={commanderInput.trim() === commanderName}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {commanderInput.trim() === commanderName ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-black/40 px-3 py-2 rounded-xl border border-white/5 text-right flex flex-col self-stretch justify-center">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">PILOT INDEX STATUS</span>
                <span className={`text-[11px] font-mono font-bold mt-0.5 ${currentUser ? "text-emerald-400" : "text-orange-400 animate-pulse"}`}>
                  {currentUser ? "🛡️ REGISTERED COUPLING" : "🛸 GUEST CALLSIGN ACT"}
                </span>
              </div>
            </div>
            {!currentUser && (
              <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                * Entering scores as a guest establishes high scores under your callsign on the global board without Google logging!
              </p>
            )}
          </div>

          {/* Standard Leaderboard listings */}
          <div className="bg-black/20 border border-white/10 p-5 rounded-2xl flex flex-col flex-grow min-h-[420px]">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
              <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Trophy size={13} className="text-yellow-500" />
                <span>GALACTIC SCOREBOARD</span>
              </h4>
              <button
                onClick={fetchLeaderboard}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono border border-cyan-400/20 hover:border-cyan-400/40 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                Sync Scores ↻
              </button>
            </div>

            {/* Difficulty Filter Tabs */}
            <div className="flex space-x-1 mb-3 bg-black/50 p-1 rounded-xl border border-white/5 self-start">
              {(["ALL", "EASY", "NORMAL", "HARD"] as ("ALL" | "EASY" | "NORMAL" | "HARD")[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDifficultyFilter(tab)}
                  className={`text-[10px] font-mono px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    difficultyFilter === tab
                      ? "bg-cyan-500 text-black font-bold shadow-md"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {tab === "ALL" ? "ทั้งหมด" : tab === "EASY" ? "ง่าย (EASY)" : tab === "NORMAL" ? "ปกติ (NORMAL)" : "ยาก (HARD)"}
                </button>
              ))}
            </div>

            {loadingScore ? (
              <div className="flex-grow flex flex-col items-center justify-center font-mono py-12">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-[9px] text-cyan-400 uppercase tracking-widest animate-pulse">Scanning rankings...</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
                <span className="text-zinc-500 text-xs font-mono">No telemetry logs found. Fly a sortie and record the first entry!</span>
              </div>
            ) : leaderboard.filter((entry) => difficultyFilter === "ALL" || entry.difficulty === difficultyFilter).length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
                <span className="text-zinc-500 text-xs font-mono">ไม่มีประวัติการบินในระดับความยากนี้นะครับ</span>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[380px] space-y-2 pr-1" id="leaderboard-list">
                {leaderboard
                  .filter((entry) => difficultyFilter === "ALL" || entry.difficulty === difficultyFilter)
                  .map((entry) => {
                    const originalIndex = leaderboard.indexOf(entry);
                    return (
                      <div
                        key={entry.id}
                        className="bg-black/40 border border-white/5 hover:border-cyan-500/30 p-3 rounded-xl flex items-center justify-between font-mono text-xs transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`text-xs font-black w-6 text-center ${originalIndex === 0 ? "text-yellow-400 text-sm font-bold" : originalIndex === 1 ? "text-zinc-300" : originalIndex === 2 ? "text-amber-600" : "text-zinc-600"}`}>
                            #{originalIndex + 1}
                          </span>
                      <div>
                        <div className="text-white font-bold tracking-wide flex items-center space-x-1.5">
                          <span>{entry.commanderName}</span>
                          {entry.userId === "guest" && (
                            <span className="text-[8px] bg-amber-950/40 text-amber-500 border border-amber-800/20 px-1 rounded">GUEST</span>
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Sectors Completed: {entry.stage || 1}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            entry.difficulty === "EASY"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/30"
                              : entry.difficulty === "HARD"
                              ? "bg-rose-950/40 text-rose-400 border-rose-800/30"
                              : "bg-blue-950/40 text-blue-400 border-blue-800/30"
                          }`}>
                            {entry.difficulty === "EASY" ? "ง่าย" : entry.difficulty === "HARD" ? "ยาก" : "ปกติ"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-cyan-400 font-extrabold tracking-widest text-sm">{entry.score.toLocaleString()}</div>
                      </div>

                      {entry.ghostId !== "none" && (
                        <button
                          onClick={() => handleLaunchDuel(entry)}
                          className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] sm:text-xs border border-orange-500/20 font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all uppercase cursor-pointer shadow-md hover:shadow-orange-500/25"
                          title="Fly Sortie side-by-side against Pilot trajectory"
                        >
                          <Swords size={11} />
                          <span>VS GHOST</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Global Comms radio updates */}
        <div className="lg:col-span-5 flex flex-col bg-black/20 border border-white/5 p-4 rounded-2xl max-h-[580px]" id="pilot-chat-column">
          <h3 className="text-sm font-extrabold tracking-wider text-orange-400 font-mono uppercase mb-3 flex items-center space-x-1.5">
            <Radio size={16} className="text-orange-400 animate-pulse" />
            <span>Pilot Comm Radio</span>
          </h3>

          <div className="flex-grow bg-black/40 border border-white/5 rounded-xl p-3 overflow-y-auto min-h-[300px] max-h-[400px] mb-3 flex flex-col justify-end">
            {loadingChat ? (
              <div className="flex flex-col items-center justify-center font-mono flex-grow py-8">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                <span className="text-[10px] text-zinc-500">Syncing Radio Comms...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center text-zinc-500 text-xs font-mono py-8 flex-grow flex items-center justify-center">
                No telemetry broadcasts reported. Send pilot transmission below!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1">
                {chats.map((c) => (
                  <div key={c.id} className="text-xs font-mono flex flex-col leading-tight">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-cyan-400 font-bold tracking-wide">{c.commanderName}</span>
                      <span className="text-[9px] text-zinc-500">
                        {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                      </span>
                    </div>
                    <p className="text-zinc-300 mt-1 pl-1 border-l border-white/5 font-sans break-words">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Broadcast Form */}
          <form onSubmit={handleSendChat} className="flex space-x-2">
            <input
              type="text"
              maxLength={150}
              disabled={!currentUser}
              placeholder={currentUser ? "Broadcast a message..." : "Connect Google Pilot to broadcast coms..."}
              value={messagesInput}
              onChange={(e) => setMessagesInput(e.target.value)}
              className="flex-grow bg-black/60 border border-white/5 focus:border-cyan-500 focus:outline-none rounded-lg px-3 py-2 text-zinc-200 font-sans text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!currentUser || !messagesInput.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono uppercase px-3 py-2 rounded-lg font-black shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
