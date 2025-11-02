import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletConnect } from "@/components/WalletConnect";
import { SkillCard } from "@/components/SkillCard";
import { useWalletStore } from "@/store/walletStore";
import { useToast } from "@/hooks/use-toast";
import { getUserSkills, SkillNFT } from "@/lib/soroban";

const UserProfile = () => {
  const { address, isConnected } = useWalletStore();
  const { toast } = useToast();
  const [skills, setSkills] = useState<SkillNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadSkills();
    }
  }, [isConnected, address]);

  const loadSkills = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const userSkills = await getUserSkills(address);
      setSkills(userSkills);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your skills",
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
              <span className="text-xl font-bold">My Skills</span>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to view your verified skill certificates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <WalletConnect />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-xl border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Your Skill Portfolio</h1>
                  <p className="text-muted-foreground font-mono text-sm">
                    {address?.slice(0, 12)}...{address?.slice(-8)}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Skills:</span>{" "}
                  <span className="font-semibold">{skills.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Endorsements:</span>{" "}
                  <span className="font-semibold">
                    {skills.reduce((sum, skill) => sum + skill.endorsements, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Grid */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : skills.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Award className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Skills Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    You haven't received any verified skill certificates yet. 
                    Complete courses or participate in events from verified issuers to earn skills.
                  </p>
                  <Button asChild>
                    <Link to="/">Explore Opportunities</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserProfile;
