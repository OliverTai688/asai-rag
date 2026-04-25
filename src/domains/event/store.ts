"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { InteractionEvent } from "./types";
import { SEED_EVENTS } from "./mocks";

interface EventState {
  events: InteractionEvent[];
  
  // Actions
  addEvent: (event: InteractionEvent) => void;
  getEventsByClientId: (clientId: string) => InteractionEvent[];
  getLatestEvents: (limit: number) => InteractionEvent[];
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,

      addEvent: (event) => set((state) => ({ 
        events: [event, ...state.events] 
      })),

      getEventsByClientId: (clientId) => {
        return get().events.filter((e) => e.clientId === clientId);
      },

      getLatestEvents: (limit) => {
        return [...get().events]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      },
    }),
    {
      name: "sincerely:v1:events",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
