import { create } from 'zustand';
import type { PaymentProvider, PlanType } from "../types";

export type { PlanType };

export interface SubscriptionFormState {
  isOpen: boolean;
  currentStep: number;
  selectedPlan: PlanType | null;
  paymentProvider: PaymentProvider | null;
  isProcessing: boolean;
  
  // Actions
  openModal: (plan?: PlanType) => void;
  closeModal: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  selectPlan: (plan: PlanType) => void;
  setPaymentProvider: (provider: PaymentProvider) => void;
  setProcessing: (status: boolean) => void;
  reset: () => void;
}

export const useSubscriptionForm = create<SubscriptionFormState>((set) => ({
  isOpen: false,
  currentStep: 1,
  selectedPlan: null,
  paymentProvider: "ECPAY",
  isProcessing: false,

  openModal: (plan) => set({ isOpen: true, selectedPlan: plan || null, currentStep: 1 }),
  closeModal: () => set({ isOpen: false }),
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  selectPlan: (plan) => set({ selectedPlan: plan }),
  setPaymentProvider: (provider) => set({ paymentProvider: provider }),
  setProcessing: (status) => set({ isProcessing: status }),
  reset: () => set({
    isOpen: false,
    currentStep: 1,
    selectedPlan: null,
    paymentProvider: "ECPAY",
    isProcessing: false,
  }),
}));
