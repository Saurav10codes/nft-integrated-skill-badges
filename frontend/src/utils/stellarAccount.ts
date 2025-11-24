/**
 * Stellar Account Utilities
 * Helper functions for checking and managing Stellar accounts
 */

import * as StellarSDK from '@stellar/stellar-sdk';

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK = import.meta.env.VITE_STELLAR_NETWORK || 'testnet';

const server = new StellarSDK.Horizon.Server(HORIZON_URL);

/**
 * Check if a Stellar account exists and is funded
 */
export const checkAccountExists = async (address: string): Promise<{
  exists: boolean;
  balance?: string;
  error?: string;
}> => {
  try {
    const account = await server.loadAccount(address);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    
    return {
      exists: true,
      balance: xlmBalance?.balance || '0'
    };
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return {
        exists: false,
        error: 'Account not found on blockchain'
      };
    }
    return {
      exists: false,
      error: error.message
    };
  }
};

/**
 * Get the Friendbot URL for funding testnet accounts
 */
export const getFriendbotUrl = (address: string): string => {
  if (NETWORK === 'testnet') {
    return `https://friendbot.stellar.org?addr=${address}`;
  }
  return '';
};

/**
 * Get the Stellar Laboratory account creator URL
 */
export const getAccountCreatorUrl = (): string => {
  const network = NETWORK === 'testnet' ? 'test' : 'public';
  return `https://laboratory.stellar.org/#account-creator?network=${network}`;
};

/**
 * Fund a testnet account using Friendbot
 */
export const fundTestnetAccount = async (address: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    if (NETWORK !== 'testnet') {
      return {
        success: false,
        message: 'Friendbot is only available on testnet'
      };
    }

    const response = await fetch(getFriendbotUrl(address));
    
    if (response.ok) {
      return {
        success: true,
        message: 'Account funded successfully with 10,000 XLM'
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: error.detail || 'Failed to fund account'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to contact Friendbot'
    };
  }
};
