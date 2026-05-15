import { useClientStore } from "./store";
import { Client, FamilyMember } from "./types";
import { nanoid } from "nanoid";

/**
 * Client Domain Service
 * UI components should use this service to interact with client data.
 * This ensures the UI remains decoupled from the specific storage implementation (Zustand).
 */
export const clientService = {
  /**
   * 獲取所有客戶
   */
  getAllClients: () => {
    return useClientStore.getState().clients;
  },

  /**
   * 依 ID 獲取客戶
   */
  getClientById: (id: string) => {
    return useClientStore.getState().getClientById(id);
  },

  /**
   * 新增客戶
   */
  createClient: (data: Omit<Client, "id" | "lastInteraction" | "tags" | "aiTags" | "family" | "existingPolicies">) => {
    const newClient: Client = {
      ...data,
      id: `c_${nanoid(8)}`,
      lastInteraction: new Date().toISOString(),
      tags: [],
      aiTags: [],
      family: [],
      existingPolicies: [],
    };
    useClientStore.getState().addClient(newClient);
    return newClient;
  },

  /**
   * 更新客戶資料
   */
  updateClient: (id: string, updates: Partial<Client>) => {
    useClientStore.getState().updateClient(id, {
      ...updates,
      lastInteraction: new Date().toISOString(),
    });
  },

  /**
   * 刪除客戶
   */
  deleteClient: (id: string) => {
    useClientStore.getState().deleteClient(id);
  },

  /**
   * 獲取 KPI 統計數據
   */
  getDashboardStats: () => {
    const clients = useClientStore.getState().clients;
    return {
      totalClients: clients.length,
      prospectCount: clients.filter((c) => c.status === "PROSPECT").length,
      activeCount: clients.filter((c) => c.status === "ACTIVE").length,
      closedCount: clients.filter((c) => c.status === "CLOSED").length,
    };
  },

  /**
   * 新增家屬/關係人
   */
  addFamilyMember: (clientId: string, member: Omit<FamilyMember, "id">) => {
    const client = useClientStore.getState().getClientById(clientId);
    if (!client) return;

    const newMember: FamilyMember = {
      ...member,
      id: `f_${nanoid(6)}`,
    };

    useClientStore.getState().updateClient(clientId, {
      family: [...client.family, newMember],
      lastInteraction: new Date().toISOString(),
    });

    return newMember;
  },

  /**
   * 更新家屬/關係人
   */
  updateFamilyMember: (clientId: string, memberId: string, updates: Partial<FamilyMember>) => {
    const client = useClientStore.getState().getClientById(clientId);
    if (!client) return;

    const updatedFamily = client.family.map(m => 
      m.id === memberId ? { ...m, ...updates } : m
    );

    useClientStore.getState().updateClient(clientId, {
      family: updatedFamily,
      lastInteraction: new Date().toISOString(),
    });
  },

  /**
   * 刪除家屬/關係人
   */
  deleteFamilyMember: (clientId: string, memberId: string) => {
    const client = useClientStore.getState().getClientById(clientId);
    if (!client) return;

    const updatedFamily = client.family.filter(m => m.id !== memberId);

    useClientStore.getState().updateClient(clientId, {
      family: updatedFamily,
      lastInteraction: new Date().toISOString(),
    });
  }
};
