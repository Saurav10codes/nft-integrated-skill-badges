import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Plus, Trash2, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WalletConnect } from "@/components/WalletConnect";
import { useWalletStore } from "@/store/walletStore";
import { useToast } from "@/hooks/use-toast";
import { addIssuer, removeIssuer, getIssuers, Issuer } from "@/lib/soroban";

const AdminDashboard = () => {
  const { address, isConnected } = useWalletStore();
  const { toast } = useToast();
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [newIssuerAddress, setNewIssuerAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  useEffect(() => {
    loadIssuers();
  }, []);

  const loadIssuers = async () => {
    setIsLoadingList(true);
    try {
      const data = await getIssuers();
      setIssuers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load issuers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your admin wallet",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const txHash = await addIssuer(address, newIssuerAddress);
      toast({
        title: "Issuer Added Successfully ✓",
        description: (
          <div className="space-y-1 mt-2">
            <p className="text-sm">Address: {newIssuerAddress.slice(0, 12)}...</p>
            <p className="text-xs text-muted-foreground">Tx: {txHash}</p>
          </div>
        ),
      });
      setNewIssuerAddress("");
      await loadIssuers();
    } catch (error) {
      toast({
        title: "Failed to Add Issuer",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveIssuer = async (issuerAddress: string) => {
    if (!address) return;

    setIsLoading(true);
    try {
      const txHash = await removeIssuer(address, issuerAddress);
      toast({
        title: "Issuer Removed",
        description: `Transaction: ${txHash}`,
      });
      await loadIssuers();
    } catch (error) {
      toast({
        title: "Failed to Remove Issuer",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <span className="text-xl font-bold">Admin Dashboard</span>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Admin Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <WalletConnect />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Add Issuer Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Register New Issuer
                </CardTitle>
                <CardDescription>
                  Add a verified institution or organization as an authorized skill issuer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddIssuer} className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="issuerAddress">Issuer Wallet Address</Label>
                    <Input
                      id="issuerAddress"
                      placeholder="G..."
                      value={newIssuerAddress}
                      onChange={(e) => setNewIssuerAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Issuer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Issuers List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Issuers</CardTitle>
                <CardDescription>
                  Manage authorized institutions that can issue skill certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingList ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : issuers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No issuers registered yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuers.map((issuer) => (
                        <TableRow key={issuer.address}>
                          <TableCell>
                            <CheckCircle className="h-5 w-5 text-success" />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {issuer.address.slice(0, 8)}...{issuer.address.slice(-6)}
                          </TableCell>
                          <TableCell>{issuer.name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveIssuer(issuer.address)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
