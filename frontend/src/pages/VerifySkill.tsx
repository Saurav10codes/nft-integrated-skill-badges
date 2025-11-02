import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, Search, CheckCircle, XCircle, Loader2, ArrowLeft, Award, Users, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { verifySkill, SkillNFT } from "@/lib/soroban";

const VerifySkill = () => {
  const { skillId: urlSkillId } = useParams();
  const [skillId, setSkillId] = useState(urlSkillId || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<SkillNFT | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verified" | "invalid">("idle");

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!skillId.trim()) return;

    setIsVerifying(true);
    setVerificationStatus("idle");
    
    try {
      const result = await verifySkill(skillId);
      if (result) {
        setVerificationResult(result);
        setVerificationStatus("verified");
      } else {
        setVerificationResult(null);
        setVerificationStatus("invalid");
      }
    } catch (error) {
      setVerificationResult(null);
      setVerificationStatus("invalid");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify if skillId is in URL
  useState(() => {
    if (urlSkillId) {
      handleVerify();
    }
  });

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
              <span className="text-xl font-bold">Verify Skill</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Verify Skill Certificate
              </CardTitle>
              <CardDescription>
                Enter a skill ID or scan a QR code to verify authenticity on the Stellar blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skillId">Skill ID</Label>
                  <Input
                    id="skillId"
                    placeholder="skill_..."
                    value={skillId}
                    onChange={(e) => setSkillId(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isVerifying || !skillId.trim()}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying on-chain...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Verify Skill
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {verificationStatus === "verified" && verificationResult && (
            <Card className="border-success/50 bg-success/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-success">Verified Skill ✓</CardTitle>
                    <CardDescription>This skill certificate is authentic and valid</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-card p-6 rounded-lg border border-border space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{verificationResult.skill_name}</h3>
                      <p className="text-sm text-muted-foreground">Skill ID: {verificationResult.id}</p>
                    </div>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {verificationResult.level}
                    </Badge>
                  </div>

                  <div className="grid gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issued By</p>
                        <p className="font-mono text-sm">{verificationResult.issuer}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Owner</p>
                        <p className="font-mono text-sm">{verificationResult.owner}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Endorsements</p>
                        <p className="font-semibold">{verificationResult.endorsements}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issued On</p>
                        <p className="font-medium">
                          {new Date(verificationResult.timestamp).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <a href={verificationResult.metadata_uri} target="_blank" rel="noopener noreferrer">
                      View Full Certificate
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Blockchain Confirmation</p>
                  <p>This certificate has been verified on the Stellar blockchain and is permanently stored on-chain. The information above is immutable and can be independently verified at any time.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {verificationStatus === "invalid" && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-destructive">Invalid Skill Certificate</CardTitle>
                    <CardDescription>This skill ID could not be verified on-chain</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The skill ID you entered does not match any valid certificate on the Stellar blockchain. 
                  Please check the ID and try again, or contact the issuer if you believe this is an error.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifySkill;
