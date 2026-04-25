export type ClientStatus = "PROSPECT" | "ACTIVE" | "CLOSED";

export interface FamilyMember {
  relation: string;
  name: string;
  age: number;
}

export interface Policy {
  id: string;
  type: string;
  amount: number;
  provider: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  occupation: string;
  annualIncome: number;
  family: FamilyMember[];
  existingPolicies: Policy[];
  tags: string[];
  aiTags: string[];
  status: ClientStatus;
  lastInteraction: string;
}
