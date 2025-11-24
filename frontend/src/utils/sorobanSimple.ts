// Soroban Contract Configuration and Utilities
// This file provides contract explorer utilities and configurations

// Get configuration from environment variables
export const SOROBAN_CONFIG = {
  RPC_URL: import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443',
  NETWORK_PASSPHRASE: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  NETWORK: import.meta.env.VITE_STELLAR_NETWORK || 'testnet',
  HORIZON_URL: import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  TEST_REGISTRY_ID: import.meta.env.VITE_TEST_REGISTRY_CONTRACT_ID,
  BADGE_NFT_ID: import.meta.env.VITE_BADGE_NFT_CONTRACT_ID,
};

/**
 * Format contract address for display
 */
export const formatContractAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Get Stellar Explorer URL for transaction
 */
export const getExplorerUrl = (txHash: string): string => {
  const network = SOROBAN_CONFIG.NETWORK;
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
};

/**
 * Get Stellar Explorer URL for contract
 */
export const getContractExplorerUrl = (contractId: string): string => {
  const network = SOROBAN_CONFIG.NETWORK;
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
};

/**
 * Get contract IDs
 */
export const CONTRACT_IDS = {
  TEST_REGISTRY: SOROBAN_CONFIG.TEST_REGISTRY_ID,
  BADGE_NFT: SOROBAN_CONFIG.BADGE_NFT_ID,
};

/**
 * Log contract information
 */
export const logContractInfo = () => {
  console.log('📋 Soroban Contract Configuration:');
  console.log('Network:', SOROBAN_CONFIG.NETWORK);
  console.log('RPC URL:', SOROBAN_CONFIG.RPC_URL);
  console.log('Test Registry:', SOROBAN_CONFIG.TEST_REGISTRY_ID);
  console.log('Badge NFT:', SOROBAN_CONFIG.BADGE_NFT_ID);
  console.log('');
  console.log('View Contracts on Stellar Expert:');
  console.log('Test Registry:', getContractExplorerUrl(SOROBAN_CONFIG.TEST_REGISTRY_ID!));
  console.log('Badge NFT:', getContractExplorerUrl(SOROBAN_CONFIG.BADGE_NFT_ID!));
};
