const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Toggle between real blockchain transactions and simulation
// Set to true to use real Freighter signing, false for simulation
export const USE_REAL_BLOCKCHAIN = import.meta.env.VITE_USE_REAL_BLOCKCHAIN === 'true' || false;

export interface RegisterTestResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    txHash: string;
    testMetadata: {
      testId: string;
      creator: string;
      metadataCid: string;
      createdAt: number;
    };
  };
}

export interface MintNFTResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    txHash: string;
    tokenId: string;
    metadataUrl: string;
  };
}

/**
 * Register a test on the blockchain via backend
 */
export const registerTestViaBackend = async (
  testId: string,
  creator: string,
  metadataCid: string
): Promise<RegisterTestResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/blockchain/register-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testId,
        creator,
        metadataCid,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to register test');
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Error calling backend register-test:', error);
    throw error;
  }
};

/**
 * Mint an NFT badge via backend
 */
export const mintNFTViaBackend = async (
  receiver: string,
  testId: string,
  testTitle?: string,
  score?: number,
  totalScore?: number
): Promise<MintNFTResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/blockchain/mint-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver,
        testId,
        testTitle,
        score,
        totalScore,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to mint NFT');
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Error calling backend mint-nft:', error);
    throw error;
  }
};
