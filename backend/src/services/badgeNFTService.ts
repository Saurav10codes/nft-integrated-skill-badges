/**
 * Badge NFT Service - Real Stellar Contract Integration
 * This service builds unsigned transactions for NFT minting
 * Frontend will sign and submit these transactions using Freighter wallet
 */

import * as StellarSDK from '@stellar/stellar-sdk';
import type { NFTMintResult } from '../types/blockchain';

// Contract configuration
const NETWORK = (process.env.STELLAR_NETWORK || 'TESTNET').toUpperCase();
const BADGE_NFT_CONTRACT = process.env.BADGE_NFT_CONTRACT_ID;
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const NETWORK_PASSPHRASE = NETWORK === 'TESTNET' 
  ? StellarSDK.Networks.TESTNET 
  : StellarSDK.Networks.PUBLIC;

/**
 * Build an unsigned transaction for NFT minting
 * Frontend will sign this with Freighter and submit to network
 */
export const buildMintNFTTransaction = async (
  receiver: string,
  testId: string,
  metadataUri: string
): Promise<string> => {
  try {
    console.log('🎖️ Building NFT mint transaction...', {
      receiver,
      testId,
      metadataUri,
      contractId: BADGE_NFT_CONTRACT
    });

    if (!BADGE_NFT_CONTRACT) {
      throw new Error('BADGE_NFT_CONTRACT_ID not configured');
    }

    // Create Soroban RPC server for simulation
    const rpcServer = new StellarSDK.rpc.Server(RPC_URL);

    // Create a fresh Horizon server instance for this request
    const horizonServer = new StellarSDK.Horizon.Server(
      NETWORK === 'TESTNET' 
        ? 'https://horizon-testnet.stellar.org' 
        : 'https://horizon.stellar.org'
    );

    // Load the receiver's account
    let account;
    try {
      console.log('🔍 Loading account from Horizon:', receiver);
      account = await horizonServer.loadAccount(receiver);
      console.log('✅ Account loaded successfully, sequence:', account.sequence);
    } catch (error: any) {
      console.error('❌ Failed to load account:', error);
      if (error.response && error.response.status === 404) {
        throw new Error(`Account not found on Stellar testnet. Please fund your account first at: https://laboratory.stellar.org/#account-creator?network=test`);
      }
      throw error;
    }

    // Build contract instance
    const contract = new StellarSDK.Contract(BADGE_NFT_CONTRACT);

    // Build the transaction
    let transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(
        contract.call(
          'mint_badge',
          StellarSDK.nativeToScVal(receiver, { type: 'address' }),
          StellarSDK.nativeToScVal(testId, { type: 'string' }),
          StellarSDK.nativeToScVal(metadataUri, { type: 'string' })
        )
      )
      .setTimeout(180)
      .build();

    console.log('🔄 Simulating transaction on Soroban RPC...');
    
    // Simulate the transaction to get resource estimates
    const simulatedTx = await rpcServer.simulateTransaction(transaction);
    
    if (StellarSDK.rpc.Api.isSimulationSuccess(simulatedTx)) {
      console.log('✅ Simulation successful');
      // Assemble the transaction with simulation results
      transaction = StellarSDK.rpc.assembleTransaction(transaction, simulatedTx).build();
    } else {
      console.error('❌ Simulation failed:', simulatedTx);
      throw new Error(`Transaction simulation failed: ${simulatedTx.error || 'Unknown error'}`);
    }

    // Return XDR for frontend to sign
    const xdr = transaction.toXDR();
    console.log('✅ Transaction built successfully');
    
    return xdr;

  } catch (error: any) {
    console.error('❌ Error building NFT mint transaction:', error);
    throw new Error(`Failed to build transaction: ${error.message}`);
  }
};
