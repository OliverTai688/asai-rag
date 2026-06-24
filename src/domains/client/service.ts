import { useClientStore } from "./store";
import { Client, DEFAULT_CLIENT_COMPLIANCE, FamilyMember, Policy } from "./types";
import { nanoid } from "nanoid";

type CreateClientInput = Pick<Client, "name" | "annualIncome" | "status"> &
  Partial<Pick<Client, "email" | "phone" | "birthDate" | "occupation" | "notes">>;
type UpdateClientInput = Partial<CreateClientInput>;

type ClientListResponse = {
  clients: Client[];
};

type ClientResponse = {
  client: Client;
};

type ArchiveClientResponse = {
  archived: true;
  client: {
    id: string;
    name: string;
    status: "ARCHIVED";
  };
};

type FamilyMemberWriteInput = Omit<FamilyMember, "id" | "profile"> & {
  profile?: FamilyMember["profile"] | null;
};
type CreateFamilyMemberInput = FamilyMemberWriteInput;
type UpdateFamilyMemberInput = Partial<FamilyMemberWriteInput>;
type CreatePolicyInput = Omit<Policy, "id">;

async function parseApiError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null);
  const message =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Request failed with status ${response.status}`;

  return new Error(message);
}

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
   * 從 BFF 載入目前 workspace 的客戶並更新本地 cache。
   */
  fetchClients: async () => {
    const response = await fetch("/api/clients", { cache: "no-store" });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientListResponse;
    useClientStore.getState().setClients(body.clients);
    return body.clients;
  },

  /**
   * 從 BFF 載入單一客戶並更新本地 cache。
   */
  fetchClientById: async (id: string) => {
    const response = await fetch(`/api/clients/${id}`, { cache: "no-store" });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 新增客戶
   */
  createClient: (
    data: Omit<
      Client,
      | "id"
      | "lastInteraction"
      | "tags"
      | "aiTags"
      | "family"
      | "existingPolicies"
      | "complianceChecklist"
      | "sensitivityLevel"
      | "kycStatus"
    >,
  ) => {
    const newClient: Client = {
      ...data,
      id: `c_${nanoid(8)}`,
      lastInteraction: new Date().toISOString(),
      tags: [],
      aiTags: [],
      family: [],
      existingPolicies: [],
      complianceChecklist: DEFAULT_CLIENT_COMPLIANCE,
      sensitivityLevel: "NORMAL",
      kycStatus: DEFAULT_CLIENT_COMPLIANCE.kycStatus,
    };
    useClientStore.getState().addClient(newClient);
    return newClient;
  },

  /**
   * 透過 BFF 新增客戶；server 會自行推導 organizationId / ownerId / unitId。
   */
  createClientRemote: async (data: CreateClientInput) => {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().addClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 更新客戶；server 會驗證 current member 是否可寫此客戶。
   */
  updateClientRemote: async (id: string, updates: UpdateClientInput) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 新增關係人；server 會驗證 current member 是否可寫此客戶。
   */
  createFamilyMemberRemote: async (clientId: string, member: CreateFamilyMemberInput) => {
    const response = await fetch(`/api/clients/${clientId}/family-members`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(member),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 更新關係人；server 會驗證 current member 是否可寫此客戶。
   */
  updateFamilyMemberRemote: async (clientId: string, memberId: string, updates: UpdateFamilyMemberInput) => {
    const response = await fetch(`/api/clients/${clientId}/family-members/${memberId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 刪除關係人；server 會驗證 current member 是否可寫此客戶。
   */
  deleteFamilyMemberRemote: async (clientId: string, memberId: string) => {
    const response = await fetch(`/api/clients/${clientId}/family-members/${memberId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 新增保單；server 會驗證 current member 是否可寫此客戶。
   */
  createPolicyRemote: async (clientId: string, policy: CreatePolicyInput) => {
    const response = await fetch(`/api/clients/${clientId}/policies`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(policy),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ClientResponse;
    useClientStore.getState().setClient(body.client);
    return body.client;
  },

  /**
   * 透過 BFF 封存客戶；server 只做 soft archive，不刪除合規資料。
   */
  archiveClientRemote: async (id: string) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as ArchiveClientResponse;
    useClientStore.getState().deleteClient(id);
    return body;
  },

  /**
   * 更新客戶資料。
   * Dev-only local cache helper; production client writes should use updateClientRemote().
   */
  updateClient: (id: string, updates: Partial<Client>) => {
    useClientStore.getState().updateClient(id, {
      ...updates,
      lastInteraction: new Date().toISOString(),
    });
  },

  /**
   * 刪除客戶。
   * Dev-only local cache helper; production client archive should use archiveClientRemote().
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
   * 新增家屬/關係人。
   * Dev-only local cache helper; production relationship writes should use createFamilyMemberRemote().
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
   * 更新家屬/關係人。
   * Dev-only local cache helper; production relationship writes should use updateFamilyMemberRemote().
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
   * 刪除家屬/關係人。
   * Dev-only local cache helper; production relationship writes should use deleteFamilyMemberRemote().
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
