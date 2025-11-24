/**
 * Test Registry Service - Real Stellar Contract Integration
 * This service builds unsigned transactions for test registration
 * Frontend will sign and submit these transactions using Freighter wallet
 */

import * as StellarSDK from '@stellar/stellar-sdk';
import type { TestMetadata, TestRegistrationResult } from '../types/blockchain';

// Contract configuration
const NETWORK = (process.env.STELLAR_NETWORK || 'TESTNET').toUpperCase();
const TEST_REGISTRY_CONTRACT = process.env.TEST_REGISTRY_CONTRACT_ID || 'CC6TAXNQXKQS67LTB3RZITFUA5E24OVSXFPP5Z7ALYDVQ74FGV2XGIVH';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const NETWORK_PASSPHRASE = NETWORK === 'TESTNET' 
  ? StellarSDK.Networks.TESTNET 
  : StellarSDK.Networks.PUBLIC;

/**
 * Build an unsigned transaction for test registration
 * Frontend will sign this with Freighter and submit to network
 */
export const buildRegisterTestTransaction = async (
  testId: string,
  creator: string,
  metadataCid: string
): Promise<string> => {
  try {
    console.log('📝 Building test registration transaction...', {
      testId,
      creator,
      metadataCid,
      contractId: TEST_REGISTRY_CONTRACT
    });

    // Create Soroban RPC server for simulation
    const rpcServer = new StellarSDK.rpc.Server(RPC_URL);

    // Create a fresh Horizon server instance for this request
    const horizonServer = new StellarSDK.Horizon.Server(
      NETWORK === 'TESTNET' 
        ? 'https://horizon-testnet.stellar.org' 
        : 'https://horizon.stellar.org'
    );

    // Load the creator's account
    let account;
    try {
      console.log('🔍 Loading account from Horizon:', creator);
      account = await horizonServer.loadAccount(creator);
      console.log('✅ Account loaded successfully, sequence:', account.sequence);
    } catch (error: any) {
      console.error('❌ Failed to load account:', error);
      if (error.response && error.response.status === 404) {
        throw new Error(`Account not found on Stellar testnet. Please fund your account first at: https://laboratory.stellar.org/#account-creator?network=test`);
      }
      throw error;
    }

    // Build contract instance
    const contract = new StellarSDK.Contract(TEST_REGISTRY_CONTRACT);

    // Build the transaction
    let transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(
        contract.call(
          'register_test',
          StellarSDK.nativeToScVal(testId, { type: 'string' }),
          StellarSDK.nativeToScVal(creator, { type: 'string' }),
          StellarSDK.nativeToScVal(metadataCid, { type: 'string' })
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
    console.error('❌ Error building test registration transaction:', error);
    throw new Error(`Failed to build transaction: ${error.message}`);
  }
};
