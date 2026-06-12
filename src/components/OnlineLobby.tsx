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
  deleteDoc,
  FieldValue
} from "firebase/firestore";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from "firebase/auth";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { ChatMessage, LeaderboardEntry, GhostRecording, LobbyRoom } from "../types";
import { MessageSquare, Trophy, ShieldAlert, Swords, LogIn, LogOut, Radio, Users, Plus, Shield, Check, X, ShieldX } from "lucide-react";

interface OnlineLobbyProps {
  commanderName: string;
  onSetCommanderName: (name: string) => void;
  onChallengeGhost: (ghostFrames: string, opponentName: string, opponentScore: number) => void;
  onStartLobbyBattle?: (lobbyId: string, role: "host" | "guest", stage: any) => void;
}

export default function OnlineLobby({
  commanderName,
  onSetCommanderName,
  onChallengeGhost,
  onStartLobbyBattle
}: OnlineLobbyProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [commanderInput, setCommanderInput] = useState<string>(commanderName || "");
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [messagesInput, setMessagesInput] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingScore, setLoadingScore] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(true);

  // Live Competitive Lobbies parameters
  const [lobbies, setLobbies] = useState<LobbyRoom[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState<boolean>(true);
  const [activeLobby, setActiveLobby] = useState<LobbyRoom | null>(null);
  const [roomNameInput, setRoomNameInput] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [myLobbyRole, setMyLobbyRole] = useState<"host" | "guest" | "">("");
  const [lobbyTab, setLobbyTab] = useState<"leaderboard" | "matchrooms">("leaderboard");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

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

  // Stream Live competitive lobbies
  useEffect(() => {
    if (!currentUser) {
      setLobbies([]);
      setLoadingLobbies(false);
      return;
    }

    setLoadingLobbies(true);
    const lobbiesRef = collection(db, "lobbies");
    const q = query(lobbiesRef, orderBy("createdAt", "desc"), limit(20));

    const unsub = onSnapshot(q, (snapshot) => {
      const activeRooms: LobbyRoom[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        activeRooms.push({
          id: doc.id,
          roomName: d.roomName,
          chapter: d.chapter,
          stageTitle: d.stageTitle,
          status: d.status,
          hostId: d.hostId,
          hostName: d.hostName,
          hostScore: d.hostScore,
          hostLives: d.hostLives,
          hostY: d.hostY,
          hostReady: d.hostReady,
          hostFinished: d.hostFinished,
          guestId: d.guestId,
          guestName: d.guestName,
          guestScore: d.guestScore,
          guestLives: d.guestLives,
          guestY: d.guestY,
          guestReady: d.guestReady,
          guestFinished: d.guestFinished,
          winnerId: d.winnerId,
          winnerName: d.winnerName,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        });
      });
      // Filter out rooms that are finished
      setLobbies(activeRooms.filter(r => r.status !== "finished"));
      setLoadingLobbies(false);
    }, (error) => {
      console.warn("Secure rules prevented lobbies fetch.", error);
      setLoadingLobbies(false);
    });

    return unsub;
  }, [currentUser]);

  // Stream specific active lobby inside
  useEffect(() => {
    if (!activeLobby || !currentUser) return;

    const lobbyRef = doc(db, "lobbies", activeLobby.id);
    const unsub = onSnapshot(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        const currentLobbyState: LobbyRoom = {
          id: snapshot.id,
          roomName: d.roomName,
          chapter: d.chapter,
          stageTitle: d.stageTitle,
          status: d.status,
          hostId: d.hostId,
          hostName: d.hostName,
          hostScore: d.hostScore,
          hostLives: d.hostLives,
          hostY: d.hostY,
          hostReady: d.hostReady,
          hostFinished: d.hostFinished,
          guestId: d.guestId,
          guestName: d.guestName,
          guestScore: d.guestScore,
          guestLives: d.guestLives,
          guestY: d.guestY,
          guestReady: d.guestReady,
          guestFinished: d.guestFinished,
          winnerId: d.winnerId,
          winnerName: d.winnerName,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        };
        setActiveLobby(currentLobbyState);

        // Check if game status became "playing". If yes, launch the match!
        if (currentLobbyState.status === "playing") {
          const targetStage = {
            chapter: currentLobbyState.chapter,
            title: currentLobbyState.stageTitle,
            description: `Competitive real-time duel locked on Sector ${currentLobbyState.chapter}. Outlive and outscore your opponent!`,
            stageType: "Competitive Live Multiplayer Duel",
            bossName: currentLobbyState.chapter === 1 ? "Orion Capital Core" : currentLobbyState.chapter === 2 ? "System Core Shield" : "Galactic Dreadnought",
            baseDifficulty: 1.0 + currentLobbyState.chapter * 0.5,
            colorTheme: currentLobbyState.chapter === 1 ? "blue" : currentLobbyState.chapter === 2 ? "purple" : "red"
          };
          if (onStartLobbyBattle) {
            onStartLobbyBattle(currentLobbyState.id, myLobbyRole, targetStage);
          }
        }
      } else {
        // Doc was deleted, exit the room
        setActiveLobby(null);
        setMyLobbyRole("");
      }
    });

    return unsub;
  }, [activeLobby?.id, currentUser, myLobbyRole]);

  // Lobby action handlers
  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const pilotTitle = commanderName || "Host Pilot";
    const lobbyId = `lobby-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    let title = "Orion Belt Patrol";
    if (selectedChapter === 2) title = "Prometheus Belt Ruins";
    if (selectedChapter === 3) title = "Nemesis Hive Siege";

    const payload = {
      roomName: roomNameInput.trim() || `${pilotTitle}'s Sector Match`,
      chapter: selectedChapter,
      stageTitle: title,
      status: "waiting",
      hostId: currentUser.uid,
      hostName: pilotTitle.slice(0, 16),
      hostScore: 0,
      hostLives: 3,
      hostY: 250,
      hostReady: true,
      hostFinished: false,
      guestId: "",
      guestName: "",
      guestScore: 0,
      guestLives: 0,
      guestY: 250,
      guestReady: false,
      guestFinished: false,
      winnerId: "",
      winnerName: "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await setDoc(doc(db, "lobbies", lobbyId), payload);
      setMyLobbyRole("host");
      setActiveLobby({ ...payload, id: lobbyId });
      setShowCreateModal(false);
      setRoomNameInput("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lobbies/${lobbyId}`);
    }
  };

  const handleJoinLobby = async (room: LobbyRoom) => {
    if (!currentUser) return;
    if (room.status !== "waiting" || room.guestId) {
      alert("This room is already full or matches are in-progress!");
      return;
    }

    const pilotTitle = commanderName || "Challenger Pilot";
    const lobbyRef = doc(db, "lobbies", room.id);

    try {
      await setDoc(lobbyRef, {
        guestId: currentUser.uid,
        guestName: pilotTitle.slice(0, 16),
        guestScore: 0,
        guestLives: 3,
        guestY: 250,
        guestReady: false,
        guestFinished: false,
        updatedAt: new Date()
      }, { merge: true });

      setMyLobbyRole("guest");
      setActiveLobby({
        ...room,
        guestId: currentUser.uid,
        guestName: pilotTitle.slice(0, 16),
        guestLives: 3,
        guestReady: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lobbies/${room.id}`);
    }
  };

  const handleToggleReady = async () => {
    if (!activeLobby || !currentUser) return;
    const lobbyRef = doc(db, "lobbies", activeLobby.id);

    try {
      if (myLobbyRole === "host") {
        await setDoc(lobbyRef, {
          hostReady: !activeLobby.hostReady,
          updatedAt: new Date()
        }, { merge: true });
      } else {
        await setDoc(lobbyRef, {
          guestReady: !activeLobby.guestReady,
          updatedAt: new Date()
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lobbies/${activeLobby.id}`);
    }
  };

  const handleLaunchDuelBattle = async () => {
    if (!activeLobby || myLobbyRole !== "host") return;
    if (!activeLobby.guestId || !activeLobby.guestReady) {
      alert("Opponent is not ready or has not joined yet!");
      return;
    }

    const lobbyRef = doc(db, "lobbies", activeLobby.id);
    try {
      await setDoc(lobbyRef, {
        status: "playing",
        updatedAt: new Date()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lobbies/${activeLobby.id}`);
    }
  };

  const handleLeaveLobby = async () => {
    if (!activeLobby || !currentUser) return;
    const lobbyRef = doc(db, "lobbies", activeLobby.id);

    try {
      if (myLobbyRole === "host") {
        await deleteDoc(lobbyRef);
      } else {
        await setDoc(lobbyRef, {
          guestId: "",
          guestName: "",
          guestReady: false,
          guestFinished: true,
          updatedAt: new Date()
        }, { merge: true });
      }
      setActiveLobby(null);
      setMyLobbyRole("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lobbies/${activeLobby.id}`);
    }
  };

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
          
          {/* Left Column: Fightrooms, Matchmaking, and Leaderboards */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Call Sign Selector */}
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between" id="pilot-callsign-form">
              <div className="flex-grow max-w-sm mr-3">
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
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-xs font-black border-none transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sync
              </button>
            </div>

            {activeLobby ? (
              /* --- ACTIVE LOBBY waiting fightroom state --- */
              <div className="bg-zinc-950/80 border border-cyan-500/30 p-5 rounded-2xl flex flex-col space-y-4 shadow-xl">
                <div className="flex justify-between items-center bg-black/60 px-4 py-3 border border-white/5 rounded-xl">
                  <div>
                    <p className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase flex items-center space-x-1">
                      <Radio className="text-cyan-400 animate-pulse" size={10} />
                      <span>DUEL ARENA COMBAT SEC</span>
                    </p>
                    <h3 className="text-lg font-bold text-white tracking-wide">{activeLobby.roomName}</h3>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Locked Sector</span>
                    <span className="block text-orange-400 text-xs font-extrabold uppercase">CH. {activeLobby.chapter} - {activeLobby.stageTitle}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Host Card */}
                  <div className={`bg-gradient-to-b ${activeLobby.hostReady ? "from-emerald-500/10" : "from-cyan-500/5"} to-transparent border ${activeLobby.hostReady ? "border-emerald-500/20" : "border-white/5"} p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2`}>
                    <div className="p-2 bg-zinc-900 border border-white/5 rounded-full relative">
                      <Users className="text-cyan-400" size={24} />
                      <span className="absolute -top-1 -right-1 bg-cyan-600 text-[8px] px-1 font-bold rounded">1</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-extrabold uppercase text-zinc-500">HOST COMMANDER</p>
                      <h4 className="text-sm font-black text-white font-display mt-0.5">{activeLobby.hostName}</h4>
                    </div>
                    <div className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeLobby.hostReady ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400 animate-pulse"}`}>
                      {activeLobby.hostReady && <Check size={10} />}
                      <span>{activeLobby.hostReady ? "READY TO DEPLOY" : "SYSTEM DIAGS..."}</span>
                    </div>
                  </div>

                  {/* Challenger Card */}
                  {activeLobby.guestId ? (
                    <div className={`bg-gradient-to-b ${activeLobby.guestReady ? "from-emerald-500/10" : "from-cyan-500/5"} to-transparent border ${activeLobby.guestReady ? "border-emerald-500/20" : "border-white/5"} p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2`}>
                      <div className="p-2 bg-zinc-900 border border-white/5 rounded-full relative">
                        <Swords className="text-orange-400" size={24} />
                        <span className="absolute -top-1 -right-1 bg-orange-600 text-[8px] px-1 font-bold rounded">2</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono font-extrabold uppercase text-zinc-500">CHALLENGER PILOT</p>
                        <h4 className="text-sm font-black text-white font-display mt-0.5">{activeLobby.guestName}</h4>
                      </div>
                      <div className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${activeLobby.guestReady ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400 animate-pulse"}`}>
                        {activeLobby.guestReady && <Check size={10} />}
                        <span>{activeLobby.guestReady ? "READY TO DEPLOY" : "SYSTEM DIAGS..."}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/40 border border-dashed border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 min-h-[120px]">
                      <div className="w-5 h-5 rounded-full border-2 border-t-cyan-400 border-dashed border-zinc-700 animate-spin"></div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 font-mono tracking-wider animate-pulse uppercase">Scanning coordinates...</h4>
                        <p className="text-[9px] text-zinc-500 mt-1 max-w-[160px]">Awaiting other pilot locks to enter hyper channels</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-zinc-900/60 p-3 border border-white/5 rounded-xl font-mono text-xs">
                  {/* Exit Lobby */}
                  <button
                    onClick={handleLeaveLobby}
                    className="w-full sm:w-auto px-3.5 py-1.5 border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs rounded-lg font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <X size={12} />
                    <span>ABORT CONTACT</span>
                  </button>

                  {/* Ready statuses control */}
                  {myLobbyRole === "guest" ? (
                    <button
                      onClick={handleToggleReady}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-extrabold uppercase transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer ${
                        activeLobby.guestReady
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25"
                      }`}
                    >
                      {activeLobby.guestReady ? <X size={12} /> : <Check size={12} />}
                      <span>{activeLobby.guestReady ? "STAND DOWN" : "CONFIRM READINESS"}</span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      {activeLobby.guestId ? (
                        <>
                          <button
                            onClick={handleToggleReady}
                            className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              activeLobby.hostReady ? "border border-zinc-700 text-zinc-400 hover:text-white" : "border border-emerald-500 bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {activeLobby.hostReady ? "Prepare" : "Lock Ready"}
                          </button>
                          <button
                            onClick={handleLaunchDuelBattle}
                            disabled={!activeLobby.guestId || !activeLobby.guestReady || !activeLobby.hostReady}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white text-xs rounded-lg font-display font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                            <Swords size={13} />
                            <span>LAUNCH REAL-TIME DUEL</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-zinc-500 text-[10px] animate-pulse">Lobby Host awaiting combat link coordinates...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* --- STANDARD LOBBY TAB ROOM LIST / LEADERBOARDS --- */
              <div className="bg-black/20 border border-white/10 p-4 rounded-2xl flex flex-col flex-grow min-h-[420px]">
                {/* Tabs Selectors */}
                <div className="flex border-b border-white/5 space-x-5 mb-4">
                  <button
                    onClick={() => setLobbyTab("leaderboard")}
                    className={`pb-2.5 px-0.5 text-xs font-mono uppercase tracking-wider font-extrabold focus:outline-none transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      lobbyTab === "leaderboard"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Trophy size={14} />
                    <span>🏆 Leaderboard</span>
                  </button>
                  <button
                    onClick={() => setLobbyTab("matchrooms")}
                    className={`pb-2.5 px-0.5 text-xs font-mono uppercase tracking-wider font-extrabold focus:outline-none transition-colors cursor-pointer flex items-center space-x-1.5 relative ${
                      lobbyTab === "matchrooms"
                        ? "text-orange-400 border-b-2 border-orange-400"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Users size={14} />
                    <span>⚔️ Live Matchrooms</span>
                    {lobbies.length > 0 && (
                      <span className="absolute -top-0.5 -right-3.5 bg-orange-600 text-white text-[8px] font-black px-1 py-0.5 rounded-full leading-none animate-pulse">
                        {lobbies.length}
                      </span>
                    )}
                  </button>
                </div>

                {lobbyTab === "leaderboard" ? (
                  /* --- Tab 1: Leaderboard Listings --- */
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Top Galactic Pilots</h4>
                      <button
                        onClick={fetchLeaderboard}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono border border-cyan-400/20 hover:border-cyan-400/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        Sync ↻
                      </button>
                    </div>

                    {loadingScore ? (
                      <div className="flex-grow flex flex-col items-center justify-center font-mono py-12">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-[9px] text-cyan-400 uppercase tracking-widest animate-pulse">Syncing...</span>
                      </div>
                    ) : leaderboard.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
                        <span className="text-zinc-500 text-xs font-mono">No competitive records recorded. Be the first to establish a score!</span>
                      </div>
                    ) : (
                      <div className="overflow-y-auto max-h-[340px] space-y-1.5 pr-1" id="leaderboard-list">
                        {leaderboard.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="bg-black/40 border border-white/5 hover:border-cyan-500/30 p-3 rounded-xl flex items-center justify-between font-mono text-xs transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`text-xs font-black w-5 ${index === 0 ? "text-yellow-500 font-bold" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-600" : "text-zinc-600"}`}>
                                #{index + 1}
                              </span>
                              <div>
                                <div className="text-white font-bold tracking-wide">{entry.commanderName}</div>
                                <div className="text-[9px] text-zinc-500 mt-0.5">Chapter {entry.stage || 1} Lock</div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="text-cyan-400 font-bold tracking-widest">{entry.score.toLocaleString()}</div>
                              </div>

                              {entry.ghostId !== "none" && (
                                <button
                                  onClick={() => handleLaunchDuel(entry)}
                                  className="bg-orange-600 hover:bg-orange-500 text-white text-[9px] border border-orange-500/20 font-bold px-2 py-1 rounded-md flex items-center space-x-1.5 transition-all uppercase cursor-pointer"
                                  title="Duel with Opponent Flight Phantom Replay"
                                >
                                  <Swords size={10} />
                                  <span>VS GHOST</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* --- Tab 2: Real-time Competitive Matchrooms --- */
                  <div className="flex flex-col flex-grow space-y-4">
                    
                    {/* Inline Host Form */}
                    <div className="bg-orange-500/5 border border-orange-500/20 p-3.5 rounded-xl flex flex-col space-y-2">
                      <div className="flex items-center space-x-1.5 text-orange-400">
                        <Radio size={14} className="animate-pulse" />
                        <span className="text-xs font-mono font-extrabold uppercase tracking-wider">Deploy Battle Sector</span>
                      </div>
                      
                      <form onSubmit={handleCreateLobby} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            maxLength={30}
                            placeholder="Custom battle room title..."
                            value={roomNameInput}
                            onChange={(e) => setRoomNameInput(e.target.value)}
                            className="w-full bg-black/60 border border-white/5 focus:border-orange-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-zinc-200 font-sans text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <select
                            value={selectedChapter}
                            onChange={(e) => setSelectedChapter(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/5 focus:border-orange-500 focus:outline-none rounded-lg px-2 py-1.5 text-zinc-200 font-mono text-xs cursor-pointer"
                          >
                            <option value={1}>Sector I</option>
                            <option value={2}>Sector II</option>
                            <option value={3}>Sector III</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <button
                            type="submit"
                            className="w-full bg-orange-500 hover:bg-orange-400 text-black text-xs font-black uppercase py-1.5 rounded-lg transition-all cursor-pointer shadow-md shadow-orange-500/10"
                          >
                            INIT ROOM
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Scrolling matchrooms */}
                    <div className="flex-grow flex flex-col">
                      <h5 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Active Battlegrounds</h5>
                      
                      {loadingLobbies ? (
                        <div className="flex-grow flex flex-col items-center justify-center font-mono py-8">
                          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                        </div>
                      ) : lobbies.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-xl bg-black/20">
                          <Users size={28} className="text-zinc-700 mb-2" />
                          <span className="text-zinc-500 text-xs font-mono max-w-[240px]">No active pilot battlegrounds. Establish a battle room above to host waiting challengers!</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 overflow-y-auto max-h-[190px]">
                          {lobbies.map((room) => (
                            <div
                              key={room.id}
                              className="bg-black/40 border border-white/5 hover:border-orange-500/20 p-2.5 rounded-lg flex items-center justify-between font-mono text-xs transition-colors"
                            >
                              <div className="flex-grow mr-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-bold text-sm leading-tight">{room.roomName}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">CH. {room.chapter}</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 mt-1">Host Pilot: <span className="text-cyan-400 font-bold">{room.hostName}</span></div>
                              </div>

                              <div>
                                {room.guestId ? (
                                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1">LOBBY FULL</span>
                                ) : (
                                  <button
                                    onClick={() => handleJoinLobby(room)}
                                    className="bg-orange-500/20 hover:bg-orange-500 hover:text-black border border-orange-500/20 text-orange-400 text-[10px] font-black px-3 py-1.5 rounded-md transition-colors uppercase cursor-pointer"
                                  >
                                    JOIN BATTLE
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

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
