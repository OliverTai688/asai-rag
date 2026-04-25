"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Client } from "./types";
import { SEED_CLIENTS } from "./mocks";

interface ClientState {
  clients: Client[];
  
  // Actions
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: SEED_CLIENTS,

      addClient: (client) => set((state) => ({ 
        clients: [client, ...state.clients] 
      })),

      updateClient: (id, updates) => set((state) => ({
        clients: state.clients.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),

      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id)
      })),

      getClientById: (id) => get().clients.find((c) => c.id === id),
    }),
    {
      name: "sincerely:v1:clients",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
