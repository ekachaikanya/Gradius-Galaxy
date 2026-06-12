import React, { useRef, useEffect, useState, useMemo } from "react";
import { 
  GameView, 
  PilotProfile, 
  LeaderboardEntry, 
  StoryStage, 
  StageBuff,
  PowerUpIndex,
  Position,
  Bullet,
  Enemy,
  EnemyBullet,
  PowerUpCapsule,
  GameParticle,
  ScrollingStar
} from "../types";

// Sound Synthesizer using Web Audio API (Zero-dependency arcade sounds)
class SoundSynth {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Lazy initialize standard AudioContext
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.warn("AudioContext failing to initialize", e);
      }
    }
  }

  toggle(val: boolean) {
    this.enabled = val;
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playDouble() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.10);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playLaserBeam() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playExplode() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playCapsule() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playSelect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playUpgrade() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.2);
    
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.2);
    osc2.stop(this.ctx.currentTime + 0.2);
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
}

const synth = new SoundSynth();

interface GradiusGameProps {
  pilot: PilotProfile;
  stage: StoryStage;
  buff: StageBuff | null;
  onGameFinished: (finalScore: number, progressReached: number, ghostFramesStr: string) => void;
  onExit: () => void;
  opponentGhostFrames?: string; // If competing
  opponentName?: string;
  opponentScore?: number;
}

export default function GradiusGame({
  pilot,
  stage,
  buff,
  onGameFinished,
  onExit,
  opponentGhostFrames,
  opponentName,
  opponentScore
}: GradiusGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Game values state (for React rendering in HUD or Game Over)
  const [lives, setLives] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [powerHighlight, setPowerHighlight] = useState<number>(0); // 0 (none) index to 6

  // Vic Viper configuration
  const shipPos = useRef<Position>({ x: 100, y: 250 });
  const shipSpeed = useRef<number>(4);
  const shipLives = useRef<number>(3);
  const shipScore = useRef<number>(0);
  const speedUpGrade = useRef<number>(0); // Max 4 levels
  const missileEquipped = useRef<boolean>(false);
  const doubleEquipped = useRef<boolean>(false);
  const laserEquipped = useRef<boolean>(false);
  const shieldHealth = useRef<number>(0); // Shield Absorbs 3 hitpoints
  const weaponCooldown = useRef<number>(0);
  const invincibleTicks = useRef<number>(0);

  // Options configuration (Trailing follow path)
  const optionCount = useRef<number>(0);
  const shipHistory = useRef<Position[]>([]); // Trail log

  // Power up capsule count determines slot
  const currentCapsuleCount = useRef<number>(0); // Modulo 6 yields index

  // Game entity lists
  const bulletList = useRef<Bullet[]>([]);
  const enemyList = useRef<Enemy[]>([]);
  const enemyBulletList = useRef<EnemyBullet[]>([]);
  const capsuleList = useRef<PowerUpCapsule[]>([]);
  const starList = useRef<ScrollingStar[]>([]);
  const particleList = useRef<GameParticle[]>([]);

  // Story parameters and spawner state
  const ticksPassed = useRef<number>(0);
  const baseDifficulty = stage.baseDifficulty;
  const stageTimeline = useRef<number>(1800); // Ticks (30 seconds) until boss spawns
  const bossSpawned = useRef<boolean>(false);

  // Replay logger for GHOST uploads
  const loggedGhostFrames = useRef<string[]>([]); // Array of frame tokens: "y,fire,shieldActive,powerIndex,activated;"
  const recordInterval = 5; // Record state every 5 frames

  // Duel Ghost replay state (if loaded)
  const parsedOpponentFrames = useMemo(() => {
    if (!opponentGhostFrames) return null;
    const tokens = opponentGhostFrames.split(";");
    return tokens
      .filter(t => t.trim().length > 0)
      .map(t => {
        const parts = t.split(",");
        return {
          y: parseFloat(parts[0]) || 250,
          fire: parts[1] === "1",
          shieldActive: parts[2] === "1",
          powerIndex: parseInt(parts[3]) || 0,
          activated: parts[4] === "1"
        };
      });
  }, [opponentGhostFrames]);

  const ghostPos = useRef<Position>({ x: 100, y: 250 });
  const ghostIndex = useRef<number>(0);
  const ghostBulletList = useRef<Bullet[]>([]);

  // Sync state initially with buffs applied by Gemini story briefing
  useEffect(() => {
    synth.toggle(soundOn);
    if (buff) {
      if (buff.type === "SPEED") {
        speedUpGrade.current = Math.min(4, Math.floor(buff.value));
        shipSpeed.current = 4 + speedUpGrade.current * 1.5;
      } else if (buff.type === "OPTION") {
        optionCount.current = Math.min(3, Math.floor(buff.value));
      } else if (buff.type === "MISSILE") {
        missileEquipped.current = true;
      } else if (buff.type === "SHIELD") {
        shieldHealth.current = Math.min(3, Math.floor(buff.value));
      } else if (buff.type === "FIRE_RATE") {
        // Handled in cooldown
      }
    }
  }, [buff, soundOn]);

  // Generate scrolling stars initially
  useEffect(() => {
    const stars: ScrollingStar[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * 900,
        y: Math.random() * 500,
        speed: 0.5 + Math.random() * 3.5,
        size: 0.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7
      });
    }
    starList.current = stars;
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Stop screen scroll when playing
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "z", "x", "k", "l"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      keysPressed.current[key] = true;

      // Handle direct manual upgrade trigger (X/L button or Space)
      if (key === "x" || key === "l" || e.key === " ") {
        triggerUpgradeActivation();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Activate upgrade bar selection
  const triggerUpgradeActivation = () => {
    const slot = currentCapsuleCount.current % 7;
    if (slot === 0) return; // No powerup ready

    synth.playUpgrade();
    // Record activation trigger in ghost logger
    const activeUpgrade = slot;

    switch (activeUpgrade) {
      case 1: // SPEED
        if (speedUpGrade.current < 4) {
          speedUpGrade.current += 1;
          shipSpeed.current = 4 + speedUpGrade.current * 1.5;
        }
        break;
      case 2: // MISSILE
        missileEquipped.current = true;
        break;
      case 3: // DOUBLE
        doubleEquipped.current = true;
        laserEquipped.current = false; // Mutually exclusive
        break;
      case 4: // LASER
        laserEquipped.current = true;
        doubleEquipped.current = false; // Mutually exclusive
        break;
      case 5: // OPTION
        if (optionCount.current < 3) {
          optionCount.current += 1;
        }
        break;
      case 6: // SHIELD
        shieldHealth.current = 3; // Refill or grant shield
        break;
    }

    // Reset capsule slot
    currentCapsuleCount.current = 0;
    setPowerHighlight(0);
  };

  // Sound toggling helper
  const handleSoundToggle = () => {
    setSoundOn(!soundOn);
    synth.toggle(!soundOn);
  };

  // Main game ticks loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      if (!isPlaying) return;

      ticksPassed.current += 1;

      // Invincible tick tick
      if (invincibleTicks.current > 0) {
        invincibleTicks.current -= 1;
      }

      // 1. Process keys movement
      let dx = 0;
      let dy = 0;
      if (keysPressed.current["arrowup"] || keysPressed.current["w"]) dy -= 1;
      if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) dy += 1;
      if (keysPressed.current["arrowleft"] || keysPressed.current["a"]) dx -= 1;
      if (keysPressed.current["arrowright"] || keysPressed.current["d"]) dx += 1;

      // Apply diagonal normalization
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      const prevX = shipPos.current.x;
      const prevY = shipPos.current.y;
      shipPos.current.x = Math.max(20, Math.min(880, shipPos.current.x + dx * shipSpeed.current));
      shipPos.current.y = Math.max(30, Math.min(470, shipPos.current.y + dy * shipSpeed.current));

      // Append ship history for option trailing
      shipHistory.current.push({ x: shipPos.current.x, y: shipPos.current.y });
      if (shipHistory.current.length > 100) {
        shipHistory.current.shift();
      }

      // 2. Firing weapons loop
      if (weaponCooldown.current > 0) {
        weaponCooldown.current -= 1;
      }

      let shootTriggered = false;
      const rateFactor = (buff?.type === "FIRE_RATE") ? 0.6 : 1.0;
      const fireInterval = Math.max(7, Math.floor(15 * rateFactor));

      if ((keysPressed.current["z"] || keysPressed.current["k"]) && weaponCooldown.current === 0) {
        shootTriggered = true;
        weaponCooldown.current = fireInterval;

        const bulletIdPrefix = `b-${ticksPassed.current}`;

        // Play authentic sound bleeps
        if (laserEquipped.current) synth.playLaserBeam();
        else if (doubleEquipped.current) synth.playDouble();
        else synth.playLaser();

        // 1. Player main weapons fire
        if (laserEquipped.current) {
          // Standard laser beam bullet
          bulletList.current.push({
            id: `${bulletIdPrefix}-main-laser`,
            x: shipPos.current.x + 20,
            y: shipPos.current.y,
            vx: 16,
            vy: 0,
            isLaser: true,
            isMissile: false,
            damage: 3,
            color: "#67e8f9"
          });
        } else if (doubleEquipped.current) {
          // Shoot forward and diagonal-up gun
          bulletList.current.push({
            id: `${bulletIdPrefix}-main-1`,
            x: shipPos.current.x + 20,
            y: shipPos.current.y,
            vx: 12,
            vy: 0,
            isLaser: false,
            isMissile: false,
            damage: 1,
            color: "#60a5fa"
          });
          bulletList.current.push({
            id: `${bulletIdPrefix}-main-up`,
            x: shipPos.current.x + 15,
            y: shipPos.current.y - 10,
            vx: 9,
            vy: -9,
            isLaser: false,
            isMissile: false,
            damage: 1,
            color: "#60a5fa"
          });
        } else {
          // Normal bullet
          bulletList.current.push({
            id: `${bulletIdPrefix}-main-normal`,
            x: shipPos.current.x + 20,
            y: shipPos.current.y,
            vx: 12,
            vy: 0,
            isLaser: false,
            isMissile: false,
            damage: 1,
            color: "#3b82f6"
          });
        }

        // 2. Missile Firing (drops downward)
        if (missileEquipped.current) {
          bulletList.current.push({
            id: `${bulletIdPrefix}-main-missile`,
            x: shipPos.current.x + 5,
            y: shipPos.current.y + 10,
            vx: 5,
            vy: 5,
            isLaser: false,
            isMissile: true,
            damage: 2,
            color: "#ef4444"
          });
        }

        // 3. Options copy weapons fire (each option launches identical bullet lagging)
        for (let o = 1; o <= optionCount.current; o++) {
          const trailIdx = Math.max(0, shipHistory.current.length - 1 - o * 18);
          const optPos = shipHistory.current[trailIdx] || shipPos.current;

          if (laserEquipped.current) {
            bulletList.current.push({
              id: `${bulletIdPrefix}-opt-${o}-laser`,
              x: optPos.x + 10,
              y: optPos.y,
              vx: 16,
              vy: 0,
              isLaser: true,
              isMissile: false,
              damage: 2.2,
              color: "#38bdf8"
            });
          } else if (doubleEquipped.current) {
            bulletList.current.push({
              id: `${bulletIdPrefix}-opt-${o}-1`,
              x: optPos.x + 10,
              y: optPos.y,
              vx: 12,
              vy: 0,
              isLaser: false,
              isMissile: false,
              damage: 0.8,
              color: "#38bdf8"
            });
            bulletList.current.push({
              id: `${bulletIdPrefix}-opt-${o}-up`,
              x: optPos.x + 5,
              y: optPos.y - 8,
              vx: 9,
              vy: -9,
              isLaser: false,
              isMissile: false,
              damage: 0.8,
              color: "#38bdf8"
            });
          } else {
            bulletList.current.push({
              id: `${bulletIdPrefix}-opt-${o}-normal`,
              x: optPos.x + 10,
              y: optPos.y,
              vx: 12,
              vy: 0,
              isLaser: false,
              isMissile: false,
              damage: 0.8,
              color: "#38bdf8"
            });
          }

          if (missileEquipped.current) {
            bulletList.current.push({
              id: `${bulletIdPrefix}-opt-${o}-missile`,
              x: optPos.x,
              y: optPos.y + 8,
              vx: 5,
              vy: 5,
              isLaser: false,
              isMissile: true,
              damage: 1.5,
              color: "#ef4444"
            });
          }
        }
      }

      // 3. Spawning Enemies & Formations
      if (!bossSpawned.current && ticksPassed.current < stageTimeline.current) {
        // Spawn waves based on timeline division
        const spawnChance = 0.015 + baseDifficulty * 0.005;
        if (Math.random() < spawnChance && enemyList.current.length < 12) {
          // Standard single or red formation spawns
          const spawnY = 50 + Math.random() * 320;
          const isRedCapsuleGiver = Math.random() < 0.25; // Red waves yield collectibles
          
          if (isRedCapsuleGiver) {
            // Spawn a coordinated linear formation of 4 red flyer targets
            // Destroying the entire group grants a red capsule
            const waveId = `w-${ticksPassed.current}`;
            for (let f = 0; f < 4; f++) {
              enemyList.current.push({
                id: `${waveId}-${f}`,
                x: 950 + f * 45,
                y: spawnY,
                vx: -4,
                vy: 0,
                width: 25,
                height: 25,
                enemyType: "red_flyer",
                hp: 1,
                maxHp: 1,
                scoreValue: 100,
                color: "#f87171",
                shootCooldown: 60 + Math.random() * 60,
                shootInterval: 120,
                theta: 0
              });
            }
          } else {
            // Spawn normal single flyer carrying sine wave trajectory
            enemyList.current.push({
              id: `enemy-${ticksPassed.current}`,
              x: 950,
              y: spawnY,
              vx: -(3 + Math.random() * 3),
              vy: 0,
              width: 26,
              height: 24,
              enemyType: "flyer",
              hp: 1 + Math.floor(baseDifficulty * 0.7),
              maxHp: 2,
              scoreValue: 150,
              color: "#94a3b8",
              shootCooldown: 80 + Math.random() * 100,
              shootInterval: 180,
              theta: Math.random() * Math.PI
            });
          }
        }

        // Spawn rotating ground turret occasionally
        if (Math.random() < 0.008 && enemyList.current.length < 14) {
          const turretOnCeiling = Math.random() < 0.5;
          const turretY = turretOnCeiling ? 38 : 462;
          enemyList.current.push({
            id: `turret-${ticksPassed.current}`,
            x: 950,
            y: turretY,
            vx: -2.0, // Scroll speed
            vy: 0,
            width: 32,
            height: 28,
            enemyType: "turret",
            hp: 3 + Math.floor(baseDifficulty),
            maxHp: 5,
            scoreValue: 300,
            color: "#64748b",
            shootCooldown: 40 + Math.random() * 60,
            shootInterval: 90
          });
        }
      }

      // Spawns the Chapter Boss!
      if (!bossSpawned.current && ticksPassed.current >= stageTimeline.current) {
        bossSpawned.current = true;
        // Spawn standard Big Core Boss
        const bossId = `boss-${ticksPassed.current}`;
        enemyList.current.push({
          id: bossId,
          x: 1000, // Slides onto screen
          y: 250,
          vx: -1.5,
          vy: 1, // Moves up and down
          width: 90,
          height: 120,
          enemyType: "boss",
          hp: 80 + baseDifficulty * 30,
          maxHp: 80 + baseDifficulty * 30,
          scoreValue: 10000,
          color: "#e11d48",
          shootCooldown: 60,
          shootInterval: 80
        });

        // Add 3 shielded shield blocks in front of the core to mimic Big Core's mechanics!
        for (let sh = 0; sh < 3; sh++) {
          enemyList.current.push({
            id: `${bossId}-shield-${sh}`,
            x: 960,
            y: 250 + (sh - 1) * 35,
            vx: -1.5,
            vy: 1,
            width: 14,
            height: 28,
            enemyType: "boss_shield",
            hp: 20 + baseDifficulty * 5,
            maxHp: 20 + baseDifficulty * 5,
            scoreValue: 500,
            color: "#14b8a6",
            shootCooldown: 99999, // Doesn't shoot
            shootInterval: 99999
          });
        }
      }

      // 4. Update Game Physics & Positions
      // Update bullets
      bulletList.current.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;

        // Missile floor sliding mechanics!
        if (b.isMissile) {
          if (b.y >= 465) {
            b.y = 465;
            b.vy = 0;
            b.vx = 8; // Slides forward fast on floor
          } else if (b.y <= 35) {
            b.y = 35;
            b.vy = 0;
            b.vx = 8; // Slides along ceiling
          }
        }
      });
      // Filter out off-screen bullets
      bulletList.current = bulletList.current.filter(b => b.x > -50 && b.x < 950 && b.y > -50 && b.y < 550);

      // Update scrolling stars parallax
      starList.current.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = 900;
          star.y = Math.random() * 500;
        }
      });

      // Update power up capsules movement
      capsuleList.current.forEach(cap => {
        cap.x += cap.vx;
        cap.y += cap.vy;

        // Bounces on floor/ceiling blocks
        if (cap.y <= 40 || cap.y >= 460) {
          cap.vy = -cap.vy;
        }
      });
      capsuleList.current = capsuleList.current.filter(cap => cap.x > -50 && cap.x < 950);

      // Update enemies
      const bossItem = enemyList.current.find(e => e.enemyType === "boss");
      
      enemyList.current.forEach(enemy => {
        // Special Boss movement mechanics
        if (enemy.enemyType === "boss") {
          // Slide in from right initially
          if (enemy.x > 700) {
            enemy.x += enemy.vx;
          } else {
            // Hover up and down
            enemy.vx = 0;
            enemy.y += enemy.vy * 1.5;
            if (enemy.y <= 100 || enemy.y >= 400) {
              enemy.vy = -enemy.vy;
            }
          }

          // Shoots lethal laser core groups
          if (enemy.shootCooldown > 0) {
            enemy.shootCooldown -= 1;
          } else {
            enemy.shootCooldown = enemy.shootInterval;
            // Fires 4 rapid thin core lasers
            for (let bl = 0; bl < 4; bl++) {
              const blId = `eb-${ticksPassed.current}-${bl}`;
              enemyBulletList.current.push({
                id: blId,
                x: enemy.x - 30,
                y: enemy.y - 45 + bl * 30,
                vx: -8,
                vy: 0,
                radius: 6
              });
            }
          }
        } else if (enemy.enemyType === "boss_shield") {
          // Bind to boss coordinate exactly!
          if (bossItem) {
            enemy.x = bossItem.x - 35;
            // Place shielding blocks relative to boss center y
            const indexSign = enemy.id.endsWith("-0") ? -1 : enemy.id.endsWith("-1") ? 0 : 1;
            enemy.y = bossItem.y + indexSign * 35;
          } else {
            enemy.hp = 0; // Destroy shield if boss is deceased
          }
        } else {
          // General flyer movement physics
          enemy.x += enemy.vx;
          enemy.y += enemy.vy;

          if (enemy.enemyType === "flyer") {
            // Sine-wave oscillations
            enemy.theta = (enemy.theta || 0) + 0.05;
            enemy.vy = Math.sin(enemy.theta) * 2;
          }

          // Firing logic for normal flyers and ground turrets
          if (enemy.shootCooldown > 0) {
            enemy.shootCooldown -= 1;
          } else {
            enemy.shootCooldown = enemy.shootInterval + Math.random() * 50;
            if (enemy.enemyType === "turret" && enemy.x < 900) {
              // Aim directly at Player ship (Vic Viper)
              const dx = shipPos.current.x - enemy.x;
              const dy = shipPos.current.y - enemy.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 50) {
                enemyBulletList.current.push({
                  id: `eb-${ticksPassed.current}-${Math.random()}`,
                  x: enemy.x,
                  y: enemy.y,
                  vx: (dx / dist) * 5,
                  vy: (dy / dist) * 5,
                  radius: 5
                });
              }
            } else if (enemy.enemyType === "flyer" && enemy.x < 850) {
              // Fire basic forward sphere bullet
              enemyBulletList.current.push({
                id: `eb-${ticksPassed.current}-${Math.random()}`,
                x: enemy.x - 10,
                y: enemy.y,
                vx: -5,
                vy: 0,
                radius: 4
              });
            }
          }
        }
      });

      // Filter out dead or past screen enemies
      enemyList.current = enemyList.current.filter(e => e.hp > 0 && e.x > -100);

      // Check if boss was destroyed to finish stage
      if (bossSpawned.current && !enemyList.current.some(e => e.enemyType === "boss")) {
        // Boss killed! Award victor scores
        shipScore.current += 15000;
        setScore(shipScore.current);
        handleVictory();
        return;
      }

      // Update enemy projectiles
      enemyBulletList.current.forEach(eb => {
        eb.x += eb.vx;
        eb.y += eb.vy;
      });
      // Filter out off-screen enemy bullets
      enemyBulletList.current = enemyBulletList.current.filter(eb => eb.x > -50 && eb.x < 950 && eb.y > -50 && eb.y < 550);

      // Update particles life
      particleList.current.forEach(part => {
        part.x += part.vx;
        part.y += part.vy;
        part.life -= 1;
      });
      particleList.current = particleList.current.filter(part => part.life > 0);

      // 5. Duel Opponent Replay Ghost updates
      if (parsedOpponentFrames) {
        // Feed the ghost frames at matching index
        const frameIdx = Math.floor(ticksPassed.current / recordInterval);
        if (frameIdx < parsedOpponentFrames.length) {
          const currentGhostFrame = parsedOpponentFrames[frameIdx];
          ghostPos.current.y = currentGhostFrame.y;

          // Align ghost's visual x-plane
          // To make it look like a real racer flying next to you, keep it at x: 120
          ghostPos.current.x = 120;

          // Ghost muzzle fire triggers
          if (currentGhostFrame.fire && ticksPassed.current % 12 === 0) {
            ghostBulletList.current.push({
              id: `gb-${ticksPassed.current}`,
              x: ghostPos.current.x + 20,
              y: ghostPos.current.y,
              vx: 12,
              vy: 0,
              isLaser: false,
              isMissile: false,
              damage: 0.5,
              color: "#22d3ee" // Holographic neon bullet
            });
          }
        }
      }

      // Track relative ghost bullets
      ghostBulletList.current.forEach(gb => {
        gb.x += gb.vx;
      });
      ghostBulletList.current = ghostBulletList.current.filter(gb => gb.x < 950);

      // 6. RECORD GHOST FRAMES FOR THE PILOT
      if (ticksPassed.current % recordInterval === 0) {
        // Compact snapshot format: y,shootTriggered,shieldActive,powerIndex,activated;
        const currentPowerIndex = currentCapsuleCount.current % 7;
        const snHost = `${Math.floor(shipPos.current.y)},${shootTriggered ? 1 : 0},${shieldHealth.current > 0 ? 1 : 0},${currentPowerIndex},0`;
        loggedGhostFrames.current.push(snHost);
      }

      // 7. Dynamic Collisions detection
      // Collision A: Player bullets hit Enemies
      bulletList.current.forEach(bullet => {
        enemyList.current.forEach(enemy => {
          const isColliding = Math.abs(bullet.x - enemy.x) < (enemy.width / 2 + 5) &&
                              Math.abs(bullet.y - enemy.y) < (enemy.height / 2 + 5);

          if (isColliding) {
            enemy.hp -= bullet.damage;
            // Create target hit sparks
            createSparks(bullet.x, bullet.y, 3, "#facc15");

            // Delete non-laser bullets immediately on impact (lasers pierce!)
            if (!bullet.isLaser) {
              bullet.x = -9999; 
            }
            synth.playHit();

            // If enemy died
            if (enemy.hp <= 0) {
              // Add explosion particles
              createExplosion(enemy.x, enemy.y, enemy.enemyType === "boss" ? 40 : 12, enemy.color);
              shipScore.current += enemy.scoreValue;
              setScore(shipScore.current);
              
              // Spawns power-up capsules!
              // In Gradius, single orange flyer or full red groups drop them
              if (enemy.enemyType === "red_flyer" || Math.random() < 0.22) {
                capsuleList.current.push({
                  id: `cap-${ticksPassed.current}-${Math.random()}`,
                  x: enemy.x,
                  y: enemy.y,
                  vx: -1.5,
                  vy: Math.random() < 0.5 ? 0.5 : -0.5
                });
              }
            }
          }
        });
      });

      // Collision B: Player gathers capsules
      capsuleList.current.forEach(capsule => {
        const distance = Math.hypot(capsule.x - shipPos.current.x, capsule.y - shipPos.current.y);
        if (distance < 24) {
          // Highlight next powerUp index
          currentCapsuleCount.current = (currentCapsuleCount.current + 1);
          if (currentCapsuleCount.current % 7 === 0) {
            currentCapsuleCount.current = 1; // Loop back and skip NONE
          }

          // Trigger state highlights
          const highlightIndex = currentCapsuleCount.current % 7;
          setPowerHighlight(highlightIndex);

          // Spark particle effect
          createSparks(capsule.x, capsule.y, 10, "#fb7185");
          synth.playCapsule();
          
          // Add extra score bonus
          shipScore.current += 200;
          setScore(shipScore.current);

          // Mark capsule for garbage collection
          capsule.x = -9999;
        }
      });
      capsuleList.current = capsuleList.current.filter(cap => cap.x !== -9999);

      // Collision C: Player ship hits Terrain blocks (ceilings/floors bounds and obstacles)
      let terrainImpact = false;
      // Define rocky ceiling floor cavern constraints (simple vertical constraints mimicking terrain geometry)
      // Standard heights: Ceiling is y < 40, Floor is y > 460
      if (shipPos.current.y < 38 || shipPos.current.y > 462) {
        terrainImpact = true;
      }

      if (terrainImpact && invincibleTicks.current === 0) {
        handleShipHit();
      }

      // Collision D: Enemies/bullets hitting Player ship
      if (invincibleTicks.current === 0) {
        // Enemy bullets hitting Player
        enemyBulletList.current.forEach(eb => {
          const dist = Math.hypot(eb.x - shipPos.current.x, eb.y - shipPos.current.y);
          if (dist < eb.radius + 12) {
            eb.x = -9999; // Delete projectile
            handleShipHit();
          }
        });
        enemyBulletList.current = enemyBulletList.current.filter(eb => eb.x !== -9999);

        // Enemies colliding directly into player
        enemyList.current.forEach(enemy => {
          const isColliding = Math.abs(shipPos.current.x - enemy.x) < (enemy.width / 2 + 10) &&
                              Math.abs(shipPos.current.y - enemy.y) < (enemy.height / 2 + 10);
          if (isColliding) {
            enemy.hp -= 2; // Crash damages enemy
            if (enemy.hp <= 0) {
              createExplosion(enemy.x, enemy.y, 10, enemy.color);
            }
            handleShipHit();
          }
        });
      }

      // 8. RENDER CANVAS SCENE GRAPH DRAWINGS
      ctx.fillStyle = "#020205"; // Deep cosmic darkness
      ctx.fillRect(0, 0, 900, 500);

      // A. Draw scrolling nebulous dust layer stars
      starList.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // B. Draw Rugged space cave walls (Gradius aesthetic ceiling and floor rock terrains)
      ctx.fillStyle = stage.colorTheme === "amber" ? "#292524" : stage.colorTheme === "blue" ? "#1e1b4b" : "#111827"; // Cavern base rock
      ctx.strokeStyle = stage.colorTheme === "amber" ? "#f59e0b" : stage.colorTheme === "blue" ? "#3b82f6" : "#f43f5e"; // Glowing magma cavern veins
      ctx.lineWidth = 3;

      // Draw Rugged cave shapes
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= 950; x += 50) {
        // Generate procedural rocky teeth at top
        const noiseY = 22 + Math.sin(x * 0.015 + ticksPassed.current * 0.01) * 6;
        ctx.lineTo(x, noiseY);
      }
      ctx.lineTo(900, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 500);
      for (let x = 0; x <= 950; x += 50) {
        // Procedural floor rock teeth
        const noiseY = 478 - Math.cos(x * 0.02 + ticksPassed.current * 0.012) * 6;
        ctx.lineTo(x, noiseY);
      }
      ctx.lineTo(900, 500);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // C. Draw power up capsule collectibles
      capsuleList.current.forEach(cap => {
        // Draw spinning octagon capsule with red core glow
        const glowRad = 10 + Math.abs(Math.sin(ticksPassed.current * 0.1)) * 4;
        
        ctx.shadowBlur = glowRad;
        ctx.shadowColor = "#f43f5e";
        
        ctx.fillStyle = "#ffe4e6";
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cap.x, cap.y, glowRad, 5, ticksPassed.current * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset shadow
      });

      // D. Draw Player Bullets
      bulletList.current.forEach(b => {
        ctx.fillStyle = b.color;
        if (b.isLaser) {
          // Draw horizontal piercing laser beam lines
          ctx.shadowBlur = 8;
          ctx.shadowColor = b.color;
          ctx.fillRect(b.x - 40, b.y - 3, 50, 6);
          ctx.shadowBlur = 0;
        } else if (b.isMissile) {
          // Draw diagonal ground sliding missile rocket
          ctx.fillRect(b.x, b.y, 6, 4);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(b.x - 3, b.y + 1, 3, 2); // Flame tail
        } else {
          // Standard glowing round pellet
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // E. Draw Duel Opponent Replay Ghost
      if (parsedOpponentFrames) {
        ctx.save();
        ctx.globalAlpha = 0.40; // Holographic phantom transparency
        
        // Draw Vic Viper Ghost Starship
        ctx.fillStyle = "#06b6d4";
        ctx.strokeStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(ghostPos.current.x + 18, ghostPos.current.y);
        ctx.lineTo(ghostPos.current.x - 14, ghostPos.current.y - 12);
        ctx.lineTo(ghostPos.current.x - 6, ghostPos.current.y);
        ctx.lineTo(ghostPos.current.x - 14, ghostPos.current.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ghost designation text floating beside it
        ctx.restore();
        ctx.fillStyle = "rgba(34, 211, 238, 0.6)";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(`PHANTOM: ${opponentName || 'CHALLENGER'} (${opponentScore || ''})`, ghostPos.current.x - 40, ghostPos.current.y - 16);

        // Draw active ghost bullets
        ghostBulletList.current.forEach(gb => {
          ctx.fillStyle = "rgba(34, 211, 238, 0.5)";
          ctx.beginPath();
          ctx.arc(gb.x, gb.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // F. Draw Options (glowing energy trailing units)
      for (let o = 1; o <= optionCount.current; o++) {
        const trailIdx = Math.max(0, shipHistory.current.length - 1 - o * 18);
        const optPos = shipHistory.current[trailIdx] || shipPos.current;

        // Draw glowing neon orange circle
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#f97316";
        ctx.fillStyle = "#ffedd5";
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(optPos.x, optPos.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }

      // G. Draw Player Ship (Vic Viper)
      const renderShip = invincibleTicks.current === 0 || Math.floor(ticksPassed.current / 4) % 2 === 0;
      if (renderShip) {
        // Draw thruster plume
        const plumeScale = 8 + Math.random() * 8;
        ctx.fillStyle = "#ff781e";
        ctx.beginPath();
        ctx.moveTo(shipPos.current.x - 12, shipPos.current.y - 4);
        ctx.lineTo(shipPos.current.x - 12 - plumeScale, shipPos.current.y);
        ctx.lineTo(shipPos.current.x - 12, shipPos.current.y + 4);
        ctx.closePath();
        ctx.fill();

        // Draw beautifully designed retro vector Vic Viper hull
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#2563eb"; // Blue wings
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        // Nose point
        ctx.moveTo(shipPos.current.x + 22, shipPos.current.y);
        // Wing top
        ctx.lineTo(shipPos.current.x - 12, shipPos.current.y - 14);
        // Thruster indent top
        ctx.lineTo(shipPos.current.x - 6, shipPos.current.y - 4);
        // Center tail fin
        ctx.lineTo(shipPos.current.x - 16, shipPos.current.y);
        // Thruster indent bottom
        ctx.lineTo(shipPos.current.x - 6, shipPos.current.y + 4);
        // Wing bottom
        ctx.lineTo(shipPos.current.x - 12, shipPos.current.y + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cabin windshield (cyan glass)
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.moveTo(shipPos.current.x + 4, shipPos.current.y - 3);
        ctx.lineTo(shipPos.current.x + 12, shipPos.current.y);
        ctx.lineTo(shipPos.current.x + 4, shipPos.current.y + 3);
        ctx.closePath();
        ctx.fill();

        // If front Shield is deployed, draw defensive blue visual ripple field
        if (shieldHealth.current > 0) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#3b82f6";
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + shieldHealth.current * 0.2})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(shipPos.current.x + 18, shipPos.current.y, 25, -Math.PI / 2.3, Math.PI / 2.3);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // H. Draw Enemies
      enemyList.current.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        
        if (enemy.enemyType === "boss") {
          // Draw massive Capital Warship "Big Core"
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          
          // Outer hull armor
          ctx.fillStyle = "#4b5563";
          ctx.strokeStyle = "#374151";
          ctx.lineWidth = 2;
          ctx.fillRect(-35, -55, 75, 110);
          
          // Side pylons
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-45, -60, 15, 25);
          ctx.fillRect(-45, 35, 15, 25);
          
          // Weak cyan Core core shields inside Center Core slot!
          const coreEnergy = Math.abs(Math.sin(ticksPassed.current * 0.1));
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#06b6d4";
          ctx.fillStyle = `rgba(6, 182, 212, ${0.6 + coreEnergy * 0.4})`;
          ctx.beginPath();
          ctx.arc(10, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw exposed damage alerts
          if (enemy.hp < enemy.maxHp * 0.4 && ticksPassed.current % 12 < 6) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
            ctx.fillRect(-35, -55, 75, 110);
          }

          // Red alert panel
          ctx.restore();
          
          // Floating Boss Health Bar
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(enemy.x - 45, enemy.y - 70, 90, 6);
          const barWidth = (enemy.hp / enemy.maxHp) * 90;
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(enemy.x - 45, enemy.y - 70, barWidth, 6);
          
        } else if (enemy.enemyType === "boss_shield") {
          // Rounded defense plate blocks on Big Core
          ctx.fillStyle = "#0d9488";
          ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
          ctx.strokeStyle = "#2dd4bf";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);

          // Glowing force shields overlay
          ctx.strokeStyle = "rgba(45, 212, 191, 0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(enemy.x - enemy.width / 2 - 2, enemy.y - enemy.height / 2 - 2, enemy.width + 4, enemy.height + 4);

        } else if (enemy.enemyType === "turret") {
          // Draw bottom ground dome turrets
          ctx.fillStyle = "#475569";
          const isCeiling = enemy.y < 250;
          
          ctx.beginPath();
          if (isCeiling) {
            ctx.ellipse(enemy.x, enemy.y - 12, 16, 12, 0, 0, Math.PI);
          } else {
            ctx.ellipse(enemy.x, enemy.y + 12, 16, 12, 0, Math.PI, 0);
          }
          ctx.fill();

          // Gun barrel pointing towards the Vic Viper pilot!
          const dx = shipPos.current.x - enemy.x;
          const dy = shipPos.current.y - enemy.y;
          const angle = Math.atan2(dy, dx);
          
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + Math.cos(angle) * 16, enemy.y + Math.sin(angle) * 16);
          ctx.stroke();

        } else if (enemy.enemyType === "red_flyer") {
          // Red glowing formation glider
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.moveTo(enemy.x - 12, enemy.y);
          ctx.lineTo(enemy.x + 10, enemy.y - 8);
          ctx.lineTo(enemy.x + 10, enemy.y + 8);
          ctx.closePath();
          ctx.fill();

          // Wing struts
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(enemy.x - 2, enemy.y - 12, 4, 24);
        } else {
          // Standard silver/gray drone glider
          ctx.fillStyle = "#4b5563";
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
          ctx.fill();

          // Wing blades
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(enemy.x - 2, enemy.y - 10, 5, 20);
        }
      });

      // I. Draw Enemy Projectiles (Orange balls)
      enemyBulletList.current.forEach(eb => {
        // Core ball
        ctx.fillStyle = "#fb923c";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner fire dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // J. Draw Particles
      particleList.current.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.life / part.maxLife;
        ctx.fillRect(part.x - part.size/2, part.y - part.size/2, part.size, part.size);
        ctx.globalAlpha = 1.0; // Reset
      });

      // K. Loop again
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Damage handler
    const handleShipHit = () => {
      if (invincibleTicks.current > 0) return;

      if (shieldHealth.current > 0) {
        shieldHealth.current -= 1;
        invincibleTicks.current = 40; // temporary brief immunity
        synth.playHit();
        createSparks(shipPos.current.x + 10, shipPos.current.y, 12, "#3b82f6");
      } else {
        // Boom! Lose pilot life
        synth.playExplode();
        createExplosion(shipPos.current.x, shipPos.current.y, 35, "#ff3300");
        
        shipLives.current -= 1;
        setLives(shipLives.current);

        // Reset Ship position and set broad invincibility
        shipPos.current = { x: 100, y: 250 };
        invincibleTicks.current = 150; // Invulnerability frames

        // Demote weaponry on crash (vintage Gradius rule!)
        optionCount.current = Math.max(0, optionCount.current - 1);
        missileEquipped.current = false;
        doubleEquipped.current = false;
        laserEquipped.current = false;

        if (shipLives.current <= 0) {
          handleGameOver();
        }
      }
    };

    // Spark generators
    const createSparks = (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        particleList.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          size: 1 + Math.random() * 3,
          color,
          life: 15 + Math.random() * 10,
          maxLife: 25
        });
      }
    };

    const createExplosion = (x: number, y: number, count: number, primaryColor: string) => {
      const colors = [primaryColor, "#f97316", "#facc15", "#ef4444"];
      for (let i = 0; i < count; i++) {
        particleList.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          size: 2 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 30 + Math.random() * 30,
          maxLife: 60
        });
      }
    };

    const handleGameOver = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameId);

      // Compact the flight replay array to a semicolon list
      const ghostFramesText = loggedGhostFrames.current.join(";");
      onGameFinished(shipScore.current, stage.chapter, ghostFramesText);
    };

    const handleVictory = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameId);

      // Compact the flight replay array to a semicolon list
      const ghostFramesText = loggedGhostFrames.current.join(";");
      onGameFinished(shipScore.current, stage.chapter + 1, ghostFramesText);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, stage, baseDifficulty, opponentGhostFrames, parsedOpponentFrames]);

  return (
    <div className="flex flex-col items-center bg-black/40 p-4 rounded-3xl border border-white/10 shadow-2xl w-full max-w-4xl backdrop-blur-md" ref={containerRef} id="gradius-game-stage">
      
      {/* 1. HUD Display indicators */}
      <div className="flex justify-between items-center w-full bg-[#090e16]/60 px-4 py-2 rounded-t-2xl border-b border-white/5 font-mono text-sm tracking-widest text-neutral-300">
        <div className="flex items-center space-x-4">
          <span className="text-cyan-400 font-extrabold arcade-text-glow-red">VIC-VIPER:</span>
          <span className="text-white flex items-center space-x-1">
            {Array.from({ length: Math.max(0, lives) }).map((_, idx) => (
              <span key={idx} className="text-cyan-400 text-lg">▲</span>
            ))}
            {lives <= 0 && <span className="text-red-500 font-bold">DEAD</span>}
          </span>
        </div>

        <div className="text-center">
          <span className="text-zinc-500">SECTOR: </span>
          <span className="text-orange-400 font-bold">{stage.chapter} - {stage.title}</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-cyan-400 font-extrabold">SCORE:</span>
          <span className="text-white font-bold">{score.toLocaleString()}</span>
        </div>
      </div>

      {/* 2. Primary Vector Game Flight Canvas */}
      <div className="relative w-full aspect-[9/5] bg-black overflow-hidden border-x border-white/5">
        <canvas 
          ref={canvasRef} 
          width={900} 
          height={500} 
          className="w-full h-full object-contain cursor-none block crt-flicker"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Temporary paused banner overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center font-display text-white z-20">
            <h2 className="text-3xl font-extrabold tracking-widest text-orange-500 uppercase mb-3">CONGRATULATIONS / MISSION TERMINATED</h2>
            <p className="text-xs text-zinc-400 font-mono">Synchronizing telemetry parameters to regional logs...</p>
          </div>
        )}
      </div>

      {/* 3. Authentic Gradius bottom power-up bar indicator */}
      <div className="w-full bg-[#090e16]/40 p-4 rounded-b-2xl border-t border-white/5 flex flex-col items-center select-none">
        
        {/* Core upgrade panels row */}
        <div className="grid grid-cols-6 gap-2 w-full max-w-2xl text-center font-mono text-[10px] sm:text-xs uppercase" id="gradius-powerup-bar">
          
          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 1 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : speedUpGrade.current > 0 ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            SpeedUp {speedUpGrade.current > 0 && `(x${speedUpGrade.current})`}
          </div>

          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 2 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : missileEquipped.current ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            Missile {missileEquipped.current && "✓"}
          </div>

          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 3 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : doubleEquipped.current ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            Double {doubleEquipped.current && "✓"}
          </div>

          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 4 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : laserEquipped.current ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            Laser {laserEquipped.current && "✓"}
          </div>

          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 5 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : optionCount.current > 0 ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            Option {optionCount.current > 0 && `(${optionCount.current}/3)`}
          </div>

          <div className={`py-2 px-1 rounded-lg border transition-all ${
            powerHighlight === 6 
              ? "bg-orange-500 border-orange-400 text-black font-black scale-105 shadow-lg shadow-orange-500/30 animate-pulse" 
              : shieldHealth.current > 0 ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400 font-bold" : "bg-black/50 border-white/5 text-zinc-600"
          }`}>
            Shield {shieldHealth.current > 0 && `(HP:${shieldHealth.current})`}
          </div>

        </div>

        {/* Action Controls description helper */}
        <div className="flex flex-col lg:flex-row justify-between items-center w-full mt-4 px-2 text-xs text-zinc-400 font-mono gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>[W,A,S,D / ArrowKeys]: <strong className="text-white">Move Pilot</strong></span>
            <span>[Z / K]: <strong className="text-white">Fire Cannon</strong></span>
            <span>[X / L / Spacebar]: <span className="text-orange-400 border border-orange-500/30 bg-orange-950/30 px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">Activate Upgrade</span></span>
          </div>
          
          <div className="flex items-center space-x-3 font-semibold">
            <button 
              onClick={handleSoundToggle} 
              className="text-zinc-400 hover:text-cyan-400 transition-colors uppercase border border-white/5 hover:border-cyan-500/30 px-2 flex items-center py-1 rounded bg-black/60 cursor-pointer"
            >
              Sound: {soundOn ? "ON 🔊" : "OFF 🔇"}
            </button>
            <button 
              onClick={onExit} 
              className="text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-white/5 hover:border-red-500/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              Abort Flight ⎋
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
