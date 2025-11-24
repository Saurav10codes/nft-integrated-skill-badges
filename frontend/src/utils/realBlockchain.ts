/**
 * Real Blockchain Integration - Freighter Wallet Transaction Signing
 * This module handles building, signing, and submitting real Stellar transactions
 */

import { signTransaction } from '@stellar/freighter-api';
import * as StellarSDK from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

/**
 * Register test on blockchain using real contract call
 */
export const registerTestOnBlockchain = async (
  testId: string,
  creator: string,
  metadataCid: string
): Promise<{ success: boolean; txHash: string }> => {
  try {
    console.log('🔗 Registering test on blockchain (real transaction)...');
    console.log('Request params:', { testId, creator, metadataCid });

    // Step 1: Get unsigned transaction from backend
    const buildResponse = await fetch(`${BACKEND_URL}/api/blockchain/build-register-test-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, creator, metadataCid })
    });

    console.log('Backend response status:', buildResponse.status);

    if (!buildResponse.ok) {
      const errorData = await buildResponse.json();
      console.error('❌ Backend error:', errorData);
      throw new Error(errorData.details || errorData.error || 'Failed to build transaction');
    }

    const responseData = await buildResponse.json();
    console.log('Backend response data:', responseData);
    
    const { data } = responseData;
    
    if (!data || !data.xdr) {
      console.error('Invalid response structure:', responseData);
      throw new Error('Invalid response from backend - missing XDR');
    }
    
    const { xdr } = data;

    console.log('✅ Transaction built, requesting signature from Freighter...');

    // Step 2: Sign transaction with Freighter
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE
    });

    if (signedXdr.error || !signedXdr.signedTxXdr) {
      throw new Error(signedXdr.error || 'Failed to sign transaction');
    }

    console.log('✅ Transaction signed, submitting to Soroban RPC...');

    // Step 3: Submit signed transaction to Soroban RPC (not Horizon!)
    const sorobanServer = new rpc.Server(
      import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
    );

    try {
      const result = await sorobanServer.sendTransaction(
        StellarSDK.TransactionBuilder.fromXDR(
          signedXdr.signedTxXdr,
          NETWORK_PASSPHRASE
        ) as StellarSDK.Transaction
      );

      console.log('✅ Transaction submitted to Soroban!');
      console.log('Submit result:', result);

      // Check if transaction was accepted
      if (result.status !== 'ERROR') {
        console.log('TX Hash:', result.hash);
        return {
          success: true,
          txHash: result.hash
        };
      } else {
        console.error('❌ Soroban RPC returned ERROR status');
        console.error('Error result:', result.errorResult);
        throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult || result)}`);
      }
    } catch (submitError: any) {
      console.error('❌ Transaction submission failed:', submitError);
      console.error('Error response:', submitError.response?.data);
      console.error('Error extras:', submitError.response?.data?.extras);
      console.error('Result codes:', submitError.response?.data?.extras?.result_codes);
      console.error('Result XDR:', submitError.response?.data?.extras?.result_xdr);
      throw submitError;
    }

  } catch (error: any) {
    console.error('❌ Error registering test on blockchain:', error);
    throw error;
  }
};

/**
 * Mint NFT badge on blockchain using real contract call
 */
export const mintNFTOnBlockchain = async (
  receiver: string,
  testId: string,
  testTitle?: string,
  score?: number,
  totalScore?: number
): Promise<{ success: boolean; txHash: string; metadataUrl: string }> => {
  try {
    console.log('🎖️ Minting NFT on blockchain (real transaction)...');
    console.log('Request params:', { receiver, testId, testTitle, score, totalScore });

    // Step 1: Get unsigned transaction from backend (backend also uploads metadata)
    const buildResponse = await fetch(`${BACKEND_URL}/api/blockchain/build-mint-nft-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver, testId, testTitle, score, totalScore })
    });

    console.log('Backend response status:', buildResponse.status);
    
    if (!buildResponse.ok) {
      const errorData = await buildResponse.json();
      console.error('❌ Backend error:', errorData);
      throw new Error(errorData.details || errorData.error || 'Failed to build transaction');
    }

    const responseData = await buildResponse.json();
    console.log('Backend response data:', responseData);
    
    const { data } = responseData;
    
    if (!data || !data.xdr) {
      console.error('Invalid response structure:', responseData);
      throw new Error('Invalid response from backend - missing XDR');
    }
    
    const { xdr, metadataUrl } = data;

    console.log('✅ Transaction built, metadata uploaded');
    console.log('📄 Metadata URL:', metadataUrl);
    console.log('🔏 Requesting signature from Freighter...');

    // Step 2: Sign transaction with Freighter
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE
    });

    if (signedXdr.error || !signedXdr.signedTxXdr) {
      throw new Error(signedXdr.error || 'Failed to sign transaction');
    }

    console.log('✅ Transaction signed, submitting to Soroban RPC...');

    // Step 3: Submit signed transaction to Soroban RPC (not Horizon!)
    const sorobanServer = new rpc.Server(
      import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
    );

    try {
      const result = await sorobanServer.sendTransaction(
        StellarSDK.TransactionBuilder.fromXDR(
          signedXdr.signedTxXdr,
          NETWORK_PASSPHRASE
        ) as StellarSDK.Transaction
      );

      console.log('✅ NFT transaction submitted to Soroban!');
      console.log('Submit result:', result);

      // Check if transaction was accepted
      if (result.status !== 'ERROR') {
        console.log('TX Hash:', result.hash);
        return {
          success: true,
          txHash: result.hash,
          metadataUrl
        };
      } else {
        console.error('❌ Soroban RPC returned ERROR status');
        console.error('Error result:', result.errorResult);
        throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult || result)}`);
      }
    } catch (submitError: any) {
      console.error('❌ Transaction submission failed:', submitError);
      console.error('Error details:', submitError);
      throw submitError;
    }

  } catch (error: any) {
    console.error('❌ Error minting NFT on blockchain:', error);
    throw error;
  }
};
