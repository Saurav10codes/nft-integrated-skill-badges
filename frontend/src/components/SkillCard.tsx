import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Award, Users, Calendar, QrCode, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SkillNFT } from "@/lib/soroban";

interface SkillCardProps {
  skill: SkillNFT;
}

export function SkillCard({ skill }: SkillCardProps) {
  const verificationUrl = `${window.location.origin}/verify/${skill.id}`;
  const formattedDate = new Date(skill.timestamp).toLocaleDateString();

  return (
    <Card className="overflow-hidden border-border hover:shadow-lg transition-all duration-300">
      <div className="h-2 bg-gradient-to-r from-primary to-accent" />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{skill.skill_name}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Award className="h-3.5 w-3.5" />
              Issued by {skill.issuer.slice(0, 8)}...
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {skill.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{skill.endorsements} endorsements</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <QrCode className="h-4 w-4 mr-2" />
                Show QR
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Skill Verification QR Code</DialogTitle>
                <DialogDescription>
                  Scan this code to verify the skill on-chain
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={verificationUrl} size={200} level="H" />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all">
                  {verificationUrl}
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="icon" asChild>
            <a href={skill.metadata_uri} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
