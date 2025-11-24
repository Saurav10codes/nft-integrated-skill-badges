import express from 'express';
import { buildRegisterTestTx, buildMintNFTTx } from '../controllers/blockchainController';

const router = express.Router();

// Real blockchain transaction building endpoints
router.post('/blockchain/build-register-test-tx', buildRegisterTestTx);
router.post('/blockchain/build-mint-nft-tx', buildMintNFTTx);

export default router;
