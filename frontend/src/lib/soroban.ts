// Soroban contract interaction utilities
// Using mock data for development - replace with actual Stellar SDK calls

export interface SkillNFT {
  id: string;
  skill_name: string;
  issuer: string;
  owner: string;
  level: string;
  metadata_uri: string;
  endorsements: number;
  timestamp: number;
}

export interface Issuer {
  address: string;
  name: string;
  verified: boolean;
}

// Mock contract address
const CONTRACT_ADDRESS = "CDJHZ...EXAMPLE...CONTRACT";

// Mock network configuration
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = "https://soroban-testnet.stellar.org";

// Admin functions
export async function addIssuer(adminAddress: string, issuerAddress: string): Promise<string> {
  // Mock transaction
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Admin ${adminAddress} adding issuer ${issuerAddress}`);
  return `tx_hash_${Date.now()}`;
}

export async function removeIssuer(adminAddress: string, issuerAddress: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Admin ${adminAddress} removing issuer ${issuerAddress}`);
  return `tx_hash_${Date.now()}`;
}

export async function getIssuers(): Promise<Issuer[]> {
  // Mock data
  return [
    { address: "GABC...1234", name: "Tech University", verified: true },
    { address: "GDEF...5678", name: "Blockchain Academy", verified: true },
  ];
}

// Issuer functions
export async function mintSkill(
  issuerAddress: string,
  ownerAddress: string,
  skillName: string,
  level: string,
  metadataUri: string
): Promise<{ txHash: string; skillId: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const skillId = `skill_${Date.now()}`;
  console.log(`Minting skill: ${skillName} for ${ownerAddress}`);
  return {
    txHash: `tx_hash_${Date.now()}`,
    skillId,
  };
}

// User functions
export async function getUserSkills(userAddress: string): Promise<SkillNFT[]> {
  // Mock data
  await new Promise(resolve => setTimeout(resolve, 800));
  return [
    {
      id: "skill_1704067200000",
      skill_name: "Solidity Basics",
      issuer: "GABC...1234",
      owner: userAddress,
      level: "Intermediate",
      metadata_uri: "https://ipfs.io/ipfs/Qm...",
      endorsements: 5,
      timestamp: 1704067200000,
    },
    {
      id: "skill_1704153600000",
      skill_name: "AI Hackathon Winner",
      issuer: "GDEF...5678",
      owner: userAddress,
      level: "Expert",
      metadata_uri: "https://ipfs.io/ipfs/Qm...",
      endorsements: 12,
      timestamp: 1704153600000,
    },
  ];
}

// Public verification
export async function verifySkill(skillId: string): Promise<SkillNFT | null> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock verification
  if (skillId.startsWith("skill_")) {
    return {
      id: skillId,
      skill_name: "Verified Skill",
      issuer: "GABC...1234",
      owner: "GXYZ...9999",
      level: "Advanced",
      metadata_uri: "https://ipfs.io/ipfs/Qm...",
      endorsements: 8,
      timestamp: Date.now(),
    };
  }
  
  return null;
}

// Endorsement
export async function endorseSkill(skillId: string, endorserAddress: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`${endorserAddress} endorsing skill ${skillId}`);
  return `tx_hash_${Date.now()}`;
}
