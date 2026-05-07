/** ============================================================
 *  Memory & Session Intelligence — Types
 *
 *  Three-layer memory architecture:
 *    Session   — current session state (ephemeral)
 *    Episodic  — notable past events (persistent)
 *    Semantic  — long-term knowledge (persistent)
 *
 *  MemoryStore is abstracted behind an interface so it can
 *  be backed by in-memory, file, SQLite, Postgres, etc.
 *  playerId is the primary identity key — NOT sessionId.
 *  ============================================================ */

import type { RiskPreference } from "../decision-engine/types.js";
import type { BehaviorState } from "../behavior/types.js";

/* ════════════════════════════════════════════════════════════
   Identity
   ════════════════════════════════════════════════════════════ */

export interface MemoryIdentity {
  playerId: string;
  userId?: string;
  accountId?: string;
  sessionId: string;
  deviceId?: string;
}

/* ════════════════════════════════════════════════════════════
   Event types
   ════════════════════════════════════════════════════════════ */

export type MemoryEventType =
  | "prediction_result"
  | "session_start"
  | "session_end"
  | "behavior_intervention"
  | "tilt_detected"
  | "stop_session"
  | "strategy_switch"
  | "risk_preference_change"
  | "big_loss"
  | "big_win"
  | "calibration_update"
  | "profile_update";

export interface MemoryEvent {
  id: string;
  playerId: string;
  sessionId: string;
  type: MemoryEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/* ════════════════════════════════════════════════════════════
   Player Profile
   ════════════════════════════════════════════════════════════ */

export interface PlayerProfile {
  playerId: string;
  userId?: string;
  accountId?: string;
  defaultRiskPreference: RiskPreference;
  totalSessions: number;
  totalPredictions: number;
  totalWins: number;
  totalLosses: number;
  totalStopSession: number;
  tiltCount: number;
  tiltFrequency: number;         // tilt events per session
  bankrollDisciplineScore: number; // 0–1, higher = better
  strategyAffinity: Record<string, number>;  // strategy → usage count
  strategyReliability: Record<string, number>; // strategy → accuracy
  confidenceTrend: number[];     // last N calibrated confidences
  brierScoreTrend: number[];     // last N brier scores
  rollingAccuracyTrend: number[]; // last N rolling accuracy values
  behaviorStateHistory: BehaviorState[];
  lastUpdated: string;
}

/* ════════════════════════════════════════════════════════════
   Session Memory
   ════════════════════════════════════════════════════════════ */

export interface SessionMemory {
  sessionId: string;
  playerId: string;
  startTime: string;
  currentBankroll: number;
  startingBankroll: number;
  totalBets: number;
  wins: number;
  losses: number;
  recentResults: Array<"win" | "loss">;
  activeStrategy: string;
  currentStreak: { type: "win" | "loss"; count: number };
  sessionWarnings: string[];
  interventions: number;
  durationMinutes: number;
}

/* ════════════════════════════════════════════════════════════
   Episodic Memory — notable events
   ════════════════════════════════════════════════════════════ */

export interface EpisodicMemory {
  playerId: string;
  events: MemoryEvent[];
  significantLosses: MemoryEvent[];    // losses > threshold
  significantWins: MemoryEvent[];      // wins > threshold
  tiltEvents: MemoryEvent[];
  interventionEvents: MemoryEvent[];
  stopSessionEvents: MemoryEvent[];
}

/* ════════════════════════════════════════════════════════════
   Semantic Memory — long-term knowledge
   ════════════════════════════════════════════════════════════ */

export interface SemanticMemory {
  playerId: string;
  riskScore: number;            // 0–1, higher = riskier behavior
  tiltPropensity: number;       // 0–1, probability of tilt per session
  bankrollDiscipline: number;   // 0–1
  strategyAffinity: Record<string, number>;
  strategyReliability: Record<string, number>;
  confidenceTrend: number[];
  averageBrierScore: number;
  averageRollingAccuracy: number;
  repeatedTiltEscalation: boolean;  // true if tilt frequency increasing
  riskEscalationLevel: "none" | "monitor" | "elevated" | "high" | "critical";
  persistentWarnings: string[];
}

/* ════════════════════════════════════════════════════════════
   Memory Context — full output for Decision/Debate/Learning
   ════════════════════════════════════════════════════════════ */

export interface MemoryContext {
  identity: MemoryIdentity;
  playerProfile: PlayerProfile | null;
  session: SessionMemory;
  episodic: EpisodicMemory;
  semantic: SemanticMemory;
  summary: string;
  recommendedConstraints: string[];
  persistentWarnings: string[];
}

/* ════════════════════════════════════════════════════════════
   Retrieval query
   ════════════════════════════════════════════════════════════ */

export type RetrievalStrategy = "latest" | "similarity" | "risk-priority" | "strategy-priority" | "event-priority";

export interface RetrievalQuery {
  strategy: RetrievalStrategy;
  playerId: string;
  limit?: number;
  eventType?: MemoryEventType;
  strategyName?: string;
  riskThreshold?: number;
}

/* ════════════════════════════════════════════════════════════
   Store interface — abstract, can be in-memory or persistent
   ════════════════════════════════════════════════════════════ */

export interface MemoryStore {
  /** Append a new event (append-only). */
  appendEvent(event: MemoryEvent): Promise<void>;

  /** Get all events for a player (deterministic, sorted by timestamp). */
  getEventsByPlayer(playerId: string): Promise<MemoryEvent[]>;

  /** Get events for a specific session. */
  getSessionEvents(sessionId: string): Promise<MemoryEvent[]>;

  /** Get the latest saved profile for a player. */
  getLatestProfile(playerId: string): Promise<PlayerProfile | null>;

  /** Save/update player profile. */
  saveProfile(profile: PlayerProfile): Promise<void>;

  /** Deterministic replay: rebuild MemoryContext from all stored events. */
  replay(playerId: string): Promise<{
    events: MemoryEvent[];
    profile: PlayerProfile | null;
  }>;
}
