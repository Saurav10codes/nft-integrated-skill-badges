// Freighter Wallet Integration for Stellar/Soroban
// Using official @stellar/freighter-api package

import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signMessage as freighterSignMessage,
} from '@stellar/freighter-api';
import { supabase } from '../config/supabase';

export const isFreighterInstalled = async (): Promise<boolean> => {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch (error) {
    console.error('Error checking Freighter connection:', error);
    return false;
  }
};

export const connectFreighter = async (): Promise<string> => {
  try {
    // First check if Freighter is installed
    const connected = await isConnected();
    if (!connected.isConnected) {
      throw new Error('Freighter wallet is not installed. Please install it from https://www.freighter.app/');
    }

    // Request access (will prompt user if not already allowed)
    const accessResult = await requestAccess();

    if (accessResult.error) {
      throw new Error(accessResult.error);
    }

    // Return the wallet address
    return accessResult.address;
  } catch (error: any) {
    console.error('Error connecting to Freighter:', error);
    throw new Error(error.message || 'Failed to connect to Freighter wallet');
  }
};

export const signMessageWithFreighter = async (message: string): Promise<string> => {
  try {
    const result = await freighterSignMessage(message);

    if (result.error) {
      throw new Error(result.error);
    }

    return result.signedMessage;
  } catch (error: any) {
    console.error('Error signing message:', error);
    throw new Error(error.message || 'Failed to sign message');
  }
};

export const getFreighterNetwork = async (): Promise<string> => {
  try {
    const result = await getNetwork();

    if (result.error) {
      throw new Error(result.error);
    }

    return result.network;
  } catch (error: any) {
    console.error('Error getting network:', error);
    throw new Error(error.message || 'Failed to get network');
  }
};

export const authenticateWithFreighter = async (): Promise<{
  wallet_address: string;
  user: any;
  isNewUser: boolean;
}> => {
  // Connect to Freighter
  const walletAddress = await connectFreighter();

  // Create message to sign for authentication
  const message = `Sign this message to authenticate with Stellar Skill Badges.\nTimestamp: ${Date.now()}\nWallet: ${walletAddress}`;

  // Sign the message
  const signature = await signMessageWithFreighter(message);

  // Check if user exists in Supabase
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUser) {
    // Update last login
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      wallet_address: walletAddress,
      user: updatedUser,
      isNewUser: false
    };
  }

  // Create new user
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        wallet_address: walletAddress,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    wallet_address: walletAddress,
    user: newUser,
    isNewUser: true
  };
};

export const formatStellarAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};
