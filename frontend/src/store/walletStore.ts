import { create } from 'zustand';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isAdmin: boolean;
  isIssuer: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
  setRole: (role: 'admin' | 'issuer' | 'user') => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  isAdmin: false,
  isIssuer: false,
  connect: (address: string) => set({ address, isConnected: true }),
  disconnect: () => set({ address: null, isConnected: false, isAdmin: false, isIssuer: false }),
  setRole: (role: 'admin' | 'issuer' | 'user') => set({ 
    isAdmin: role === 'admin', 
    isIssuer: role === 'issuer' 
  }),
}));
