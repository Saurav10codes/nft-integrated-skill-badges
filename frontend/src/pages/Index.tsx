import { Link } from "react-router-dom";
import { Shield, Award, Search, ArrowRight, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/WalletConnect";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NFT Integrated Skill Badges</span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary mb-4">
              <Shield className="h-4 w-4" />
              Powered by Stellar Blockchain
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Own Your Skills,
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Verify On-Chain
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Store and verify your professional skills and achievements as non-transferable NFTs 
              on the Stellar blockchain. Trusted, permanent, and instantly verifiable.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link to="/verify">
                  <Search className="mr-2 h-5 w-5" />
                  Verify a Skill
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/profile">
                  <Award className="mr-2 h-5 w-5" />
                  View My Skills
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-6 rounded-xl border border-border space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Blockchain Verified</h3>
              <p className="text-muted-foreground">
                Every skill is stored on Stellar's Soroban smart contracts, ensuring immutable proof of achievement.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Trusted Issuers</h3>
              <p className="text-muted-foreground">
                Only verified institutions and organizations can issue skill certificates through admin-approved accounts.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Social Proof</h3>
              <p className="text-muted-foreground">
                Build credibility with endorsements from peers and showcase your verified skills to employers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Sections */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-xl border border-border text-center space-y-4 hover:border-primary/50 transition-colors">
              <Award className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">For Learners</h3>
              <p className="text-muted-foreground text-sm">
                View and share your verified skill certificates with potential employers
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/profile">View My Skills</Link>
              </Button>
            </div>

            <div className="bg-card p-8 rounded-xl border border-border text-center space-y-4 hover:border-primary/50 transition-colors">
              <Shield className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">For Issuers</h3>
              <p className="text-muted-foreground text-sm">
                Issue verifiable skill certificates to your students and participants
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/issuer">Issue Certificates</Link>
              </Button>
            </div>

            <div className="bg-card p-8 rounded-xl border border-border text-center space-y-4 hover:border-primary/50 transition-colors">
              <Search className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">For Verifiers</h3>
              <p className="text-muted-foreground text-sm">
                Instantly verify any skill certificate using QR code or skill ID
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/verify">Verify Skills</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built on Stellar Blockchain • Powered by Soroban Smart Contracts</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
