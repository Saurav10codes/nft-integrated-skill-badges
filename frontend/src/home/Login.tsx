import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors } from "../config/colors";
import {
  isFreighterInstalled,
  authenticateWithFreighter,
  formatStellarAddress,
} from "../utils/freighter";
import { supabase, type User } from "../config/supabase";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

const Login = () => {
  const [account, setAccount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [freighterStatus, setFreighterStatus] = useState<string>("Checking...");
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState<string>("");
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState("");
  const [tempWalletData, setTempWalletData] = useState<any>(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    checkFreighterStatus();
  }, []);

  const checkFreighterStatus = async () => {
    try {
      const installed = await isFreighterInstalled();
      if (installed) {
        setFreighterStatus("Detected");
        setError("");
      } else {
        setFreighterStatus("Not installed");
        setError("Freighter wallet not detected. Please install it from freighter.app");
      }
    } catch (error) {
      setFreighterStatus("Not installed");
      setError("Error checking Freighter. Please install it from freighter.app");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const savedUser = localStorage.getItem("stellar_user");
      const savedAddress = localStorage.getItem("stellar_wallet");
      if (savedUser && savedAddress) {
        setAccount(savedAddress);
        setUser(JSON.parse(savedUser));
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError("");
      const installed = await isFreighterInstalled();
      if (!installed) {
        setError("not_installed");
        setLoading(false);
        return;
      }
      const { wallet_address, user: userData } = await authenticateWithFreighter();
      if (!userData.username) {
        setTempWalletData({ wallet_address, user: userData });
        setShowUsernameModal(true);
        setLoading(false);
        return;
      }
      completeLogin(wallet_address, userData);
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      // Set error state to make button red, but don't display error message
      setError("connection_failed");
      cleanupLoginState();
      setLoading(false);
      // Clear error state after 3 seconds to reset button color
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ username: username.trim() })
        .eq('wallet_address', tempWalletData.wallet_address)
        .select()
        .single();
      if (updateError) throw updateError;
      setShowUsernameModal(false);
      completeLogin(tempWalletData.wallet_address, updatedUser);
    } catch (err: any) {
      setError(err.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (wallet_address: string, userData: User) => {
    setAccount(wallet_address);
    setUser(userData);
    localStorage.setItem("stellar_user", JSON.stringify(userData));
    localStorage.setItem("stellar_wallet", wallet_address);
    navigate("/dashboard");
  };

  const cleanupLoginState = () => {
    setAccount("");
    setUser(null);
    localStorage.removeItem("stellar_user");
    localStorage.removeItem("stellar_wallet");
  };

  const disconnectWallet = () => {
    cleanupLoginState();
  };

  const formatAddress = (address: string) => {
    return formatStellarAddress(address);
  };

  const copyAddressToClipboard = async () => {
    try {
      if (!account) return;
      await navigator.clipboard.writeText(account);
      setCopySuccess("Copied!");
      setTimeout(() => setCopySuccess(""), 1800);
    } catch (err) {
      setCopySuccess("Failed to copy");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-5 overflow-hidden relative" 
      style={{ 
        background: `linear-gradient(135deg, ${colors.blueLight} 0%, ${colors.purpleLight} 100%)`,
        backgroundImage: `
          radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
          linear-gradient(135deg, ${colors.blueLight} 0%, ${colors.purpleLight} 100%)
        `,
        backgroundSize: '20px 20px, 100% 100%'
      }}
    >
      {/* Login Card - Slides out to the right when username form appears */}
      <div 
        className={`max-w-lg w-full absolute transition-transform duration-300 ease ${
          showUsernameModal 
            ? 'translate-x-[160%]' 
            : 'translate-x-0'
        }`}
        style={{ pointerEvents: showUsernameModal ? 'none' : 'auto' }}
      >
        <Card className="max-w-lg w-full" style={{ boxShadow: '8px 8px 0px 0px #000000' }}>
          <CardHeader style={{ backgroundColor: colors.yellowLight }}>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 border-4 border-border rounded-base flex items-center justify-center" style={{ backgroundColor: colors.orange }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12L10 8L14 12L10 16L6 12Z" fill="white" />
                  <path d="M14 12L18 8L22 12L18 16L14 12Z" fill="white" opacity="0.8" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-center text-3xl">Stellar Skills</CardTitle>
            <CardDescription className="text-center">
              Connect your Freighter wallet to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Card className={`shadow-shadow ${freighterStatus === "Detected" ? "" : freighterStatus === "Not installed" ? "" : ""}`} style={{ backgroundColor: freighterStatus === "Detected" ? colors.greenLight : freighterStatus === "Not installed" ? colors.redLight : colors.yellowLight }}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-heading">Freighter Status:</span>
                  <span className="text-sm font-bold">
                    {freighterStatus === "Detected" && "Detected"}
                    {freighterStatus === "Not installed" && "Not Installed"}
                    {freighterStatus === "Checking..." && "Checking..."}
                  </span>
                </div>
                {freighterStatus === "Not installed" && (
                  <Button variant="neutral" size="sm" onClick={() => { setFreighterStatus("Checking..."); checkFreighterStatus(); }} className="w-full mt-3">
                    Re-check for Freighter
                  </Button>
                )}
              </CardContent>
            </Card>

            {!account ? (
              <Button 
                className="w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-6px_-6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[12px] active:translate-y-[12px] transition-all duration-150" 
                size="lg" 
                onClick={connectWallet} 
                disabled={loading || freighterStatus !== "Detected"}
                style={{
                  backgroundColor: error ? '#DC2626' : loading ? '#00c97fff' : undefined,
                  borderColor: error ? '#DC2626' : loading ? '#00c97fff' : undefined,
                  color: error || loading ? 'white' : undefined
                }}
              >
                {loading ? "Connecting..." : freighterStatus !== "Detected" ? "Install Freighter First" : "Connect Wallet"}
              </Button>
            ) : (
              <div className="space-y-4">
                <Card style={{ backgroundColor: colors.cyanLight }}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b-2 border-border">
                      <span className="font-heading text-sm">Connected Wallet:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{formatAddress(account)}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyAddressToClipboard}
                          className="h-8 w-8 p-0"
                        >
                          {copySuccess ? (
                            <span className="text-xs">✓</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                        </Button>
                      </div>
                    </div>
                    {user && (
                      <>
                        {user.username && (
                          <div className="flex justify-between items-center py-2 border-b-2 border-border">
                            <span className="font-heading text-sm">Username:</span>
                            <span className="font-bold text-sm">{user.username}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b-2 border-border">
                          <span className="font-heading text-sm">User ID:</span>
                          <span className="font-mono text-xs">{user.id}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b-2 border-border">
                          <span className="font-heading text-sm">Joined:</span>
                          <span className="font-mono text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="font-heading text-sm">Last Login:</span>
                          <span className="font-mono text-sm">{new Date(user.last_login).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Button variant="reverse" className="w-full" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </div>
            )}

            <Card className="shadow-shadow" style={{ backgroundColor: colors.purpleLight }}>
              <CardContent className="py-3">
                <p className="text-sm leading-relaxed">
                  <strong className="font-heading">Note:</strong> Make sure you have
                  Freighter wallet extension installed in your browser. Download from{" "}
                  <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                    freighter.app
                  </a>
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Username Form - Slides in from the left when needed */}
      <div 
        className={`max-w-lg w-full absolute transition-transform duration-300 ease ${
          showUsernameModal 
            ? 'translate-x-0' 
            : '-translate-x-[calc(100%+100vw)]'
        }`}
        style={{ pointerEvents: showUsernameModal ? 'auto' : 'none' }}
      >
        <Card className="w-full" style={{ boxShadow: '8px 8px 0px 0px #000000' }}>
          <CardHeader style={{ backgroundColor: colors.greenLight }}>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 border-4 border-border rounded-base flex items-center justify-center" style={{ backgroundColor: colors.blue }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <CardTitle className="text-center text-3xl">Choose Username</CardTitle>
            <CardDescription className="text-center">
              Pick a unique username for your profile
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-heading font-bold">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                maxLength={20}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleUsernameSubmit();
                }}
                autoFocus
                className="w-full px-4 py-3 border-2 border-border rounded-base text-base font-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main focus:ring-blue transition-shadow shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                style={{ 
                  backgroundColor: 'white',
                  transition: 'all 0.2s'
                }}
              />
              <div className="flex items-center gap-2 px-3 py-2 border-2 border-border rounded-base" style={{ backgroundColor: colors.yellowLight }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className="text-xs">
                  3-20 characters • Letters, numbers, and underscores
                </p>
              </div>
            </div>

            {error && showUsernameModal && (
              <Card className="shadow-shadow" style={{ backgroundColor: colors.redLight }}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p className="text-sm font-base">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUsernameModal(false);
                  setUsername("");
                  setError("");
                  cleanupLoginState();
                }}
                disabled={loading}
                className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUsernameSubmit} 
                disabled={loading || !username.trim() || username.trim().length < 3}
                className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                style={{
                  backgroundColor: loading ? colors.blue : undefined,
                  borderColor: loading ? colors.blue : undefined,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Setting...
                  </span>
                ) : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
