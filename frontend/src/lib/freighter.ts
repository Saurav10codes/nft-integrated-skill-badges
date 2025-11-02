// Freighter Wallet integration
// Using mock implementation for development

export async function connectFreighter(): Promise<string | null> {
  // Check if Freighter is installed
  if (typeof window !== 'undefined' && (window as any).freighter) {
    try {
      // Mock connection - replace with actual Freighter API
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockAddress = `G${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
      return mockAddress;
    } catch (error) {
      console.error("Failed to connect to Freighter:", error);
      return null;
    }
  } else {
    // For development, return a mock address
    console.warn("Freighter wallet not detected. Using mock address.");
    return `G${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
  }
}

export async function disconnectFreighter(): Promise<void> {
  console.log("Disconnecting wallet");
}

export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && !!(window as any).freighter;
}

export function getFreighterInstallUrl(): string {
  return "https://www.freighter.app/";
}
