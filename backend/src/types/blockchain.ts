export interface TestMetadata {
  testId: string;
  creator: string;
  metadataCid: string;
  createdAt?: number;
}

export interface BlockchainResult {
  success: boolean;
  txHash: string;
  data?: any;
}

export interface NFTMintResult extends BlockchainResult {
  tokenId: string;
  metadataUrl: string;
}

export interface TestRegistrationResult extends BlockchainResult {
  testMetadata: TestMetadata;
}
