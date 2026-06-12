import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc,
  setDoc,
  doc,
  getDocs,
  getDoc,
  FieldValue
} from "firebase/firestore";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from "firebase/auth";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { ChatMessage, LeaderboardEntry, GhostRecording } from "../types";
import { MessageSquare, Trophy, ShieldAlert, Swords, LogIn, LogOut, Radio } from "lucide-react";

interface OnlineLobbyProps {
  commanderName: string;
  onSetCommanderName: (name: string) => void;
  onChallengeGhost: (ghostFrames: string, opponentName: string, opponentScore: number) => void;
}

export default function OnlineLobby({
  commanderName,
  onSetCommanderName,
  onChallengeGhost
}: OnlineLobbyProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [commanderInput, setCommanderInput] = useState<string>(commanderName || "");
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [messagesInput, setMessagesInput] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingScore, setLoadingScore] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(true);

  // Sync active Auth subscription
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user && user.displayName && !commanderName) {
        // Automatically default command callsign to Google name
        const cleanName = user.displayName.split(" ")[0].slice(0, 16);
        onSetCommanderName(cleanName);
        setCommanderInput(cleanName);
      }
    });
    return unsub;
  }, [commanderName, onSetCommanderName]);

  // Stream Live global Pilot chats using Firestore Real-time Snapshot
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setLoadingChat(false);
      return;
    }

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
      console.warn("Secure rules prevented chat fetch or not authenticated yet.", error);
      setLoadingChat(false);
    });

    return unsub;
  }, [currentUser]);

  // Load Leaderboard entries from Firestore
  const fetchLeaderboard = async () => {
    if (!currentUser) return;
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
          createdAt: d.createdAt
        });
      });
      setLeaderboard(entries);
    } catch (error) {
      console.error("Secure rules prevented leaderboard loading:", error);
    } finally {
      setLoadingScore(false);
    }
  };

  // Trigger loading scores once authorized
  useEffect(() => {
    if (currentUser) {
      fetchLeaderboard();
    }
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

    const pilotCallsign = commanderName || commanderInput || "Pilot";
    const docId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const chatPayload = {
      userId: currentUser.uid,
      commanderName: pilotCallsign.slice(0, 16),
      message: messagesInput.trim().slice(0, 150),
      createdAt: new Date() // Will map to server timestamp in rules
    };

    setMessagesInput(""); // Clear field

    try {
      // Securely update with custom write wrappers
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
      // Retrieve the opponent's ghost trajectory from ghosts collections
      const ghostDoc = await getDoc(doc(db, "ghosts", entry.ghostId));
      if (ghostDoc.exists()) {
        const ghData = ghostDoc.data();
        if (ghData.ghostFrames) {
          // Play!
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

  // Set Callsign locally
  const handleSaveCallsign = () => {
    if (commanderInput.trim().length >= 2) {
      onSetCommanderName(commanderInput.trim().slice(0, 16));
    }
  };

  return (
    <div className="w-full max-w-4xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-2xl font-sans backdrop-blur-md" id="online-lobby-panel">
      
      {/* 1. Header with Auth parameters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-5 mb-5 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center space-x-2">
            <Radio className="text-cyan-400 animate-pulse" size={26} />
            <span>PILOT MULTIPLAYER ARENA</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-0.5">Connect to command networks, compete in ghost duels, and coordinate tactics</p>
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
          <button
            onClick={handleGoogleSignIn}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase tracking-wider font-extrabold rounded-xl flex items-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            id="google-login-btn"
          >
            <LogIn size={15} />
            <span>Connect Google Pilot Profile</span>
          </button>
        )}
      </div>

      {!currentUser ? (
        <div className="w-full py-12 flex flex-col items-center justify-center text-center bg-black/20 border border-dashed border-white/5 rounded-3xl px-6">
          <Trophy size={45} className="text-cyan-500/40 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Authentication Required</h3>
          <p className="text-zinc-400 text-sm max-w-sm leading-relaxed mt-1">
            Please sync or connect your Google account to access competitive leaderboard rankings, share your ghost run trajectories, and chat with regional pilots.
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="mt-5 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-display font-black uppercase text-xs tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Connect Vector Network Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Commands, Call Sign and Global Leaderboard */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Call Sign Selector */}
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between" id="pilot-callsign-form">
              <div className="flex-grow max-w-md mr-3">
                <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1 font-mono">My Active Callsign (Pilot Name)</label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Enter custom callsign..."
                  value={commanderInput}
                  onChange={(e) => setCommanderInput(e.target.value)}
                  className="w-full bg-black/60 border border-white/5 focus:border-cyan-500 focus:outline-none rounded-lg px-3 py-1.5 text-zinc-200 font-mono text-xs"
                />
              </div>
              <button
                onClick={handleSaveCallsign}
                disabled={commanderInput.trim() === commanderName}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-xs font-black border-none transition-all mt-5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sync
              </button>
            </div>

            {/* Global High Scores Leaderboard */}
            <div className="bg-black/20 border border-white/15 p-4 rounded-2xl flex flex-col flex-grow min-h-[400px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-extrabold tracking-wider text-cyan-400 font-mono uppercase flex items-center space-x-2">
                  <Trophy size={16} className="text-cyan-400" />
                  <span>Leaderboard Rankings</span>
                </h3>
                <button
                  onClick={fetchLeaderboard}
                  className="text-[10px] text-zinc-400 hover:text-white font-mono border border-white/10 hover:border-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Refresh ↻
                </button>
              </div>

              {loadingScore ? (
                <div className="flex-grow flex flex-col items-center justify-center font-mono py-12">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest animate-pulse">Syncing Leaderboard...</span>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-black/20 border border-dashed border-white/5 rounded-2xl">
                  <span className="text-zinc-500 text-xs font-mono">No competitive records recorded. Be the first to establish a score!</span>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[380px] space-y-1.5 pr-1" id="leaderboard-list">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="bg-black/40 border border-white/5 hover:border-cyan-500/30 p-3 rounded-xl flex items-center justify-between font-mono text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-bold w-6 ${index === 0 ? "text-yellow-500" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-600" : "text-zinc-600"}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <div className="text-white font-bold text-sm tracking-wide">{entry.commanderName}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">Cleared Sector {entry.stage || 1}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-cyan-400 font-extrabold text-sm tracking-widest">{entry.score.toLocaleString()}</div>
                          <div className="text-[9px] text-zinc-500">
                            {entry.createdAt?.toDate ? new Date(entry.createdAt.toDate()).toLocaleDateString() : "Just now"}
                          </div>
                        </div>

                        {entry.ghostId !== "none" && (
                          <button
                            onClick={() => handleLaunchDuel(entry)}
                            className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] border border-orange-500/20 font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all uppercase cursor-pointer"
                            title="Dual with Opponent Flight Phantom Replay"
                          >
                            <Swords size={11} />
                            <span>V.S. GHOST</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Global Live Pilots Chat */}
          <div className="lg:col-span-5 flex flex-col bg-black/20 border border-white/5 p-4 rounded-2xl max-h-[580px]" id="pilot-chat-column">
            <h3 className="text-sm font-extrabold tracking-wider text-orange-400 font-mono uppercase mb-3 flex items-center space-x-1.5">
              <MessageSquare size={16} />
              <span>Pilot Comm Channel</span>
            </h3>

            {/* Chat List Stream */}
            <div className="flex-grow bg-black/40 border border-white/5 rounded-xl p-3 overflow-y-auto min-h-[300px] max-h-[400px] mb-3 flex flex-col justify-end">
              {loadingChat ? (
                <div className="flex flex-col items-center justify-center font-mono flex-grow py-8">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                  <span className="text-[10px] text-zinc-500">Syncing Comms...</span>
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs font-mono py-8 flex-grow flex items-center justify-center">
                  No transmissions currently logged. Send a broadcast below!
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

            {/* Fiting form */}
            <form onSubmit={handleSendChat} className="flex space-x-2">
              <input
                type="text"
                maxLength={150}
                placeholder="Broadcast a message..."
                value={messagesInput}
                onChange={(e) => setMessagesInput(e.target.value)}
                className="flex-grow bg-black/60 border border-white/5 focus:border-cyan-500 focus:outline-none rounded-lg px-3 py-2 text-zinc-200 font-sans text-xs"
              />
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono uppercase px-3 py-2 rounded-lg font-black shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
