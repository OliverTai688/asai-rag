"use client";

import { create } from "zustand";
import { TheaterSession, TheaterTurn, TheaterScore, TheaterPersonaType, TheaterDifficulty } from "./types";

interface TheaterState {
  sessions: TheaterSession[];
  turnsBySession: Record<string, TheaterTurn[]>;
  scoresBySession: Record<string, TheaterScore>;

  // Actions
  createSession: (params: { 
    spinSessionId: string; 
    clientId: string; 
    clientName: string;
    personaType: TheaterPersonaType;
    difficulty: TheaterDifficulty;
  }) => TheaterSession;
  addTurn: (sessionId: string, turn: TheaterTurn) => void;
  updateTension: (sessionId: string, value: number) => void;
  completeSession: (sessionId: string, score: TheaterScore) => void;
  getSessionById: (id: string) => TheaterSession | undefined;
  getTurns: (sessionId: string) => TheaterTurn[];
  getScore: (sessionId: string) => TheaterScore | undefined;
}

export const useTheaterStore = create<TheaterState>()((set, get) => ({
  sessions: [],
  turnsBySession: {},
  scoresBySession: {},

  createSession: ({ spinSessionId, clientId, clientName, personaType, difficulty }) => {
    const id = `theater_${Date.now()}`;
    const newSession: TheaterSession = {
      id,
      spinSessionId,
      clientId,
      clientName,
      personaType,
      difficulty,
      tension: 30, // 初始緊張度
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      turnsBySession: {
        ...state.turnsBySession,
        [id]: [],
      },
    }));

    return newSession;
  },

  addTurn: (sessionId, turn) => {
    set((state) => ({
      turnsBySession: {
        ...state.turnsBySession,
        [sessionId]: [...(state.turnsBySession[sessionId] || []), turn],
      },
    }));
  },

  updateTension: (sessionId, value) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, tension: Math.max(0, Math.min(100, value)), updatedAt: new Date().toISOString() }
          : s
      ),
    }));
  },

  completeSession: (sessionId, score) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, status: 'COMPLETED', updatedAt: new Date().toISOString() } : s
      ),
      scoresBySession: {
        ...state.scoresBySession,
        [sessionId]: score,
      },
    }));
  },

  getSessionById: (id) => get().sessions.find((s) => s.id === id),
  getTurns: (sessionId) => get().turnsBySession[sessionId] || [],
  getScore: (sessionId) => get().scoresBySession[sessionId],
}));
