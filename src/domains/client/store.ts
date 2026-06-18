"use client";

import { create } from "zustand";
import { Client } from "./types";
import { demoSeedClients } from "@/domains/demo/seed-fixtures";

interface ClientState {
  clients: Client[];
  
  // Actions
  setClients: (clients: Client[]) => void;
  setClient: (client: Client) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
}

export const useClientStore = create<ClientState>()((set, get) => ({
  clients: demoSeedClients,

  setClients: (clients) => set({ clients }),

  setClient: (client) => set((state) => {
    const exists = state.clients.some((item) => item.id === client.id);

    return {
      clients: exists
        ? state.clients.map((item) => item.id === client.id ? client : item)
        : [client, ...state.clients],
    };
  }),

  addClient: (client) => set((state) => ({
    clients: [client, ...state.clients],
  })),

  updateClient: (id, updates) => set((state) => ({
    clients: state.clients.map((c) => c.id === id ? { ...c, ...updates } : c),
  })),

  deleteClient: (id) => set((state) => ({
    clients: state.clients.filter((c) => c.id !== id),
  })),

  getClientById: (id) => get().clients.find((c) => c.id === id),
}));
