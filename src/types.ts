export interface PilotProfile {
  uid: string;
  commanderName: string;
  highScore: number;
  storyProgress: number; // Max chapter completed
}

export interface ChatMessage {
  id: string;
  userId: string;
  commanderName: string;
  message: string;
  createdAt: any; // Firestore Timestamp
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  commanderName: string;
  score: number;
  stage: number;
  ghostId: string;
  createdAt: any;
}

export interface GhostFrame {
  y: number;          // Ship's relative Y coordinate (0 to 100 or actual coordinate)
  fire: boolean;      // Did the player fire this frame
  shieldActive: boolean; // Was shield equipped
  powerIndex: number;  // Currently highlighted upgrade index (0 to 6)
  activated: boolean;  // Did they activate a power up on this frame
}

export interface GhostRecording {
  id?: string;
  userId: string;
  commanderName: string;
  score: number;
  ghostFrames: string; // Packed compact string representing Frame snapshots
  createdAt: any;
}

export enum GameView {
  LOBBY_REGISTRATION, // Register pilot name
  MAIN_MENU,          // Title, select Story or Online
  STORY_BRIEFING,     // Story text, Gemini generation, select Starting Buff in the console
  ONLINE_LOBBY,       // Chat, view Leaderboard, invite / duel ghosts
  GAMEPLAY,           // Active Canvas scrolling arena
  GAME_OVER           // Summary, reward update, submit highscore
}

export interface StoryStage {
  chapter: number;
  title: string;
  description: string;
  stageType: string;
  bossName: string;
  baseDifficulty: number;
  colorTheme: string; // CSS color string or gradient keyword
}

export interface StageBuff {
  name: string;
  description: string;
  type: "SPEED" | "OPTION" | "MISSILE" | "SHIELD" | "FIRE_RATE";
  value: number;
}

export interface StoryScenarioResponse {
  storyText: string;
  alienDialogue: string;
  wingmanAdvice: string;
  stageBuff: StageBuff;
}

// Retro Game Engine Interfaces
export interface Position {
  x: number;
  y: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isLaser: boolean;
  isMissile: boolean;
  damage: number;
  color: string;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  enemyType: "flyer" | "red_flyer" | "turret" | "boss" | "boss_shield";
  hp: number;
  maxHp: number;
  scoreValue: number;
  color: string;
  shootCooldown: number;
  shootInterval: number;
  theta?: number; // For sine wave or helical movement paths
}

export interface EnemyBullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PowerUpCapsule {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ScrollingStar {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

// Gradius classical power up indices
export enum PowerUpIndex {
  NONE = 0,
  SPEED = 1,
  MISSILE = 2,
  DOUBLE = 3,
  LASER = 4,
  OPTION = 5,
  SHIELD = 6
}
