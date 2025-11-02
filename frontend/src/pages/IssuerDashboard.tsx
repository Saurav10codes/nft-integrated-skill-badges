import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletConnect } from "@/components/WalletConnect";
import { MintSkillForm } from "@/components/MintSkillForm";
import { useWalletStore } from "@/store/walletStore";

const IssuerDashboard = () => {
  const { isConnected } = useWalletStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Issuer Dashboard</span>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Issuer Wallet</CardTitle>
              <CardDescription>
                Please connect your verified issuer wallet to mint skill certificates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <WalletConnect />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-2xl font-bold mb-2">Welcome, Verified Issuer</h2>
              <p className="text-muted-foreground">
                Issue skill certificates as non-transferable NFTs on the Stellar blockchain. 
                These credentials will be permanently stored and instantly verifiable.
              </p>
            </div>

            <MintSkillForm />

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Issuer Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Verify the recipient's wallet address before minting</p>
                <p>• Ensure skill information is accurate and complete</p>
                <p>• Store detailed metadata on IPFS or permanent storage</p>
                <p>• Skill NFTs are non-transferable once issued</p>
                <p>• All certificates are publicly verifiable on-chain</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default IssuerDashboard;
