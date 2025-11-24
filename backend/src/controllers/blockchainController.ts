import { Request, Response } from 'express';
import { buildRegisterTestTransaction } from '../services/testRegistryService';
import { buildMintNFTTransaction } from '../services/badgeNFTService';
import { generateBadgeMetadata, uploadBadgeMetadata } from '../services/storageService';

/**
 * Build unsigned transaction for test registration
 * Frontend will sign and submit with Freighter
 */
export const buildRegisterTestTx = async (req: Request, res: Response) => {
  try {
    const { testId, creator, metadataCid } = req.body;

    if (!testId || !creator || !metadataCid) {
      return res.status(400).json({
        error: 'Missing required fields: testId, creator, metadataCid'
      });
    }

    const xdr = await buildRegisterTestTransaction(testId, creator, metadataCid);

    return res.json({
      success: true,
      message: 'Transaction built successfully',
      data: { xdr }
    });

  } catch (error: any) {
    console.error('Build transaction error:', error);
    return res.status(500).json({
      error: 'Failed to build transaction',
      details: error.message
    });
  }
};

/**
 * Build unsigned transaction for NFT minting
 * Frontend will sign and submit with Freighter
 */
export const buildMintNFTTx = async (req: Request, res: Response) => {
  try {
    const { receiver, testId, testTitle, score, totalScore } = req.body;

    if (!receiver || !testId) {
      return res.status(400).json({
        error: 'Missing required fields: receiver, testId'
      });
    }

    // Generate and upload metadata first
    const metadata = generateBadgeMetadata(testId, receiver, testTitle, score, totalScore);
    const metadataUrl = await uploadBadgeMetadata(testId, receiver, metadata);

    // Build transaction with metadata URL
    const xdr = await buildMintNFTTransaction(receiver, testId, metadataUrl);

    return res.json({
      success: true,
      message: 'Transaction built successfully',
      data: { xdr, metadataUrl }
    });

  } catch (error: any) {
    console.error('Build transaction error:', error);
    return res.status(500).json({
      error: 'Failed to build transaction',
      details: error.message
    });
  }
};
