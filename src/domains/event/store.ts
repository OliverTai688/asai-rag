"use client";

import { create } from "zustand";
import { InteractionEvent } from "./types";
import { demoSeedEvents } from "@/domains/demo/seed-fixtures";

interface EventState {
  events: InteractionEvent[];
  
  // Actions
  addEvent: (event: InteractionEvent) => void;
  getEventsByClientId: (clientId: string) => InteractionEvent[];
  getLatestEvents: (limit: number) => InteractionEvent[];
}

export const useEventStore = create<EventState>()((set, get) => ({
  events: demoSeedEvents,

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events],
  })),

  getEventsByClientId: (clientId) => {
    return get().events.filter((e) => e.clientId === clientId);
  },

  getLatestEvents: (limit) => {
    return [...get().events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
}));
