import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWalletStore } from "@/store/walletStore";
import { mintSkill } from "@/lib/soroban";

export function MintSkillForm() {
  const { address } = useWalletStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    ownerAddress: "",
    skillName: "",
    level: "Beginner",
    metadataUri: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await mintSkill(
        address,
        formData.ownerAddress,
        formData.skillName,
        formData.level,
        formData.metadataUri
      );

      toast({
        title: "Skill NFT Minted Successfully! 🎉",
        description: (
          <div className="space-y-1 mt-2">
            <p className="text-sm font-mono">Skill ID: {result.skillId}</p>
            <p className="text-xs text-muted-foreground">Tx: {result.txHash}</p>
          </div>
        ),
      });

      // Reset form
      setFormData({
        ownerAddress: "",
        skillName: "",
        level: "Beginner",
        metadataUri: "",
      });
    } catch (error) {
      toast({
        title: "Minting Failed",
        description: "Could not mint skill NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Mint New Skill NFT
        </CardTitle>
        <CardDescription>
          Issue a verified skill certificate to a user's wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ownerAddress">User Wallet Address *</Label>
            <Input
              id="ownerAddress"
              placeholder="G..."
              value={formData.ownerAddress}
              onChange={(e) => setFormData({ ...formData, ownerAddress: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skillName">Skill Name *</Label>
            <Input
              id="skillName"
              placeholder="e.g., Solidity Basics, React Developer"
              value={formData.skillName}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Skill Level *</Label>
            <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="Expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadataUri">Metadata URI *</Label>
            <Input
              id="metadataUri"
              placeholder="https://ipfs.io/ipfs/..."
              value={formData.metadataUri}
              onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Link to certificate details (IPFS or other permanent storage)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Award className="mr-2 h-4 w-4" />
                Mint Skill NFT
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
