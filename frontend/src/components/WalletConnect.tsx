import { useState } from "react";
import { Wallet, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/store/walletStore";
import { connectFreighter, disconnectFreighter, isFreighterInstalled, getFreighterInstallUrl } from "@/lib/freighter";
import { useToast } from "@/hooks/use-toast";

export function WalletConnect() {
  const { address, isConnected, connect, disconnect } = useWalletStore();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const walletAddress = await connectFreighter();
      if (walletAddress) {
        connect(walletAddress);
        toast({
          title: "Wallet Connected",
          description: `Connected to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to Freighter wallet",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectFreighter();
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-secondary rounded-lg border border-border">
          <p className="text-sm font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <Button onClick={handleDisconnect} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  if (!isFreighterInstalled()) {
    return (
      <Button asChild variant="outline">
        <a href={getFreighterInstallUrl()} target="_blank" rel="noopener noreferrer">
          Install Freighter
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting}>
      <Wallet className="h-4 w-4 mr-2" />
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
