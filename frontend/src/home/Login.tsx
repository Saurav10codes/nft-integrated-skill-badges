import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors } from "../config/colors";
import {
  isFreighterInstalled,
  authenticateWithFreighter,
  formatStellarAddress,
} from "../utils/freighter";
import { supabase, type User } from "../config/supabase";

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
    console.log("🔍 Checking for Freighter wallet using official API...");

    try {
      // Use the official Freighter API to check connection
      const installed = await isFreighterInstalled();

      if (installed) {
        console.log("✅ Freighter is installed and detected!");
        setFreighterStatus("Detected");
        setError("");
      } else {
        console.log("❌ Freighter not found");
        console.log("");
        console.log("📋 INSTALLATION STEPS:");
        console.log("1. Install Freighter from: https://www.freighter.app/");
        console.log("2. Refresh this page after installation");
        console.log("3. Make sure the extension is enabled in your browser");
        console.log("");
        setFreighterStatus("Not installed");
        setError(
          "Freighter wallet not detected. Please install it from freighter.app"
        );
      }
    } catch (error) {
      console.error("Error checking Freighter status:", error);
      setFreighterStatus("Not installed");
      setError(
        "Error checking Freighter. Please install it from freighter.app"
      );
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

      // Check if Freighter is installed (with wait time)
      const installed = await isFreighterInstalled();
      if (!installed) {
        setError(
          "Please install Freighter wallet to continue. Visit https://www.freighter.app/"
        );
        setLoading(false);
        return;
      }

      // Authenticate with Freighter
      const {
        wallet_address,
        user: userData,
        isNewUser,
      } = await authenticateWithFreighter();

      // If user has no username, show modal to set it
      if (!userData.username) {
        setTempWalletData({ wallet_address, user: userData, isNewUser });
        setShowUsernameModal(true);
        setLoading(false);
        return;
      }

      // Complete login
      completeLogin(wallet_address, userData);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);

      if (err.message.includes("User declined")) {
        setError("Connection request was rejected. Please try again.");
      } else if (err.message.includes("not installed")) {
        setError(
          "Please install Freighter wallet from https://www.freighter.app/"
        );
      } else {
        setError(err.message || "Failed to connect wallet");
      }

      cleanupLoginState();
    } finally {
      setLoading(false);
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

      // Update user with username
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ username: username.trim() })
        .eq('wallet_address', tempWalletData.wallet_address)
        .select()
        .single();

      if (updateError) throw updateError;

      // Complete login with updated user data
      setShowUsernameModal(false);
      completeLogin(tempWalletData.wallet_address, updatedUser);
    } catch (err: any) {
      console.error("Error setting username:", err);
      setError(err.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (wallet_address: string, userData: User) => {
    setAccount(wallet_address);
    setUser(userData);

    // Save to localStorage for persistence
    localStorage.setItem("stellar_user", JSON.stringify(userData));
    localStorage.setItem("stellar_wallet", wallet_address);

    // Redirect to dashboard
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
    <>
      {/* Username Modal */}
      {showUsernameModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              // Don't allow closing by clicking outside - username is required
            }
          }}
        >
          <div
            className="bg-white shadow-2xl p-8 max-w-md w-full"
            style={{ borderRadius: "8px" }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: colors.darkRed }}
            >
              Choose Your Username
            </h2>
            <p className="text-gray-600 mb-6">
              Please enter a username to continue. This will be displayed on your profile and tests.
            </p>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username..."
              maxLength={20}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md mb-2 focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUsernameSubmit();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-gray-500 mb-4">
              3-20 characters • Letters, numbers, and underscores
            </p>

            {error && (
              <div
                className="border p-3 mb-4"
                style={{
                  backgroundColor: colors.lightPink,
                  borderColor: colors.rose,
                  color: colors.darkRed,
                  borderRadius: "6px",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleUsernameSubmit}
              disabled={loading || !username.trim()}
              className="w-full text-white font-semibold py-3 px-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.gold} 100%)`,
                borderRadius: "6px",
              }}
            >
              {loading ? "Setting Username..." : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* Main Login Page */}
      <div
        className="min-h-screen flex items-center justify-center p-5"
        style={{
          background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 50%, ${colors.lightMint} 100%)`,
        }}
      >
      <div
        className="bg-white shadow-2xl p-10 max-w-lg w-full animate-fade-in"
        style={{ borderRadius: "8px" }}
      >
        <div className="flex items-center justify-center mb-4">
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect width="24" height="24" rx="6" fill="#FFEFD5" />
            <path d="M6 12L10 8L14 12L10 16L6 12Z" fill="#FF7A00" />
          </svg>
        </div>
        <h1
          className="text-3xl font-bold text-center mb-2"
          style={{ color: colors.darkRed }}
        >
          Stellar Skills
        </h1>
        <p className="text-center text-gray-600 mb-8 text-base">
          Connect your Freighter wallet to get started
        </p>

        {/* Freighter Status Indicator */}
        <div
          className="p-3 mb-4"
          style={{
            backgroundColor:
              freighterStatus === "Detected"
                ? colors.lightMint
                : freighterStatus === "Not installed"
                ? colors.lightPink
                : colors.lightYellow,
            borderRadius: "6px",
            border: `1px solid ${
              freighterStatus === "Detected"
                ? "#059669"
                : freighterStatus === "Not installed"
                ? colors.rose
                : colors.gold
            }`,
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Freighter Status:
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color:
                  freighterStatus === "Detected"
                    ? "#059669"
                    : freighterStatus === "Not installed"
                    ? colors.darkRed
                    : colors.orange,
              }}
            >
              {freighterStatus === "Detected" && "✅ Detected"}
              {freighterStatus === "Not installed" && "❌ Not Installed"}
              {freighterStatus === "Checking..." && "⏳ Checking..."}
              {freighterStatus === "Waiting for extension..." &&
                "⏳ Loading..."}
            </span>
          </div>

          {freighterStatus === "Not installed" && (
            <button
              onClick={() => {
                setFreighterStatus("Checking...");
                checkFreighterStatus();
              }}
              className="w-full text-sm font-semibold py-2 px-4 mt-2"
              style={{
                backgroundColor: colors.blue,
                color: "white",
                borderRadius: "4px",
                border: "none",
              }}
            >
              🔄 Re-check for Freighter
            </button>
          )}
        </div>

        {error && (
          <div
            className="border p-3 mb-5 flex items-center gap-2"
            style={{
              backgroundColor: colors.lightPink,
              borderColor: colors.rose,
              color: colors.darkRed,
              borderRadius: "6px",
            }}
            role="alert"
            aria-live="assertive"
          >
            <span>{error}</span>
          </div>
        )}

        {!account ? (
          <button
            className="w-full text-white font-semibold py-4 px-6 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
            style={{
              background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.gold} 100%)`,
              borderRadius: "6px",
            }}
            onClick={connectWallet}
            disabled={loading || freighterStatus !== "Detected"}
          >
            {loading
              ? "Connecting..."
              : freighterStatus !== "Detected"
              ? "Install Freighter First"
              : "Connect Wallet"}
          </button>
        ) : (
          <div className="mb-5">
            <div
              className="p-5 mb-5"
              style={{ backgroundColor: colors.cream, borderRadius: "6px" }}
            >
              <div className="flex justify-between py-2.5 border-b border-gray-200">
                <span className="font-semibold text-gray-700">
                  Connected Wallet:
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm"
                    style={{ color: colors.blue }}
                  >
                    {formatAddress(account)}
                  </span>
                  <button
                    onClick={copyAddressToClipboard}
                    className="text-xs px-2 py-1 bg-white border rounded text-gray-700"
                    aria-label="Copy full wallet address"
                    title="Copy full wallet address"
                  >
                    Copy
                  </button>
                  {copySuccess && (
                    <span className="text-xs text-green-600">
                      {copySuccess}
                    </span>
                  )}
                </div>
              </div>
              {user && (
                <>
                  {user.username && (
                    <div className="flex justify-between py-2.5 border-b border-gray-200">
                      <span className="font-semibold text-gray-700">
                        Username:
                      </span>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: colors.orange }}
                      >
                        {user.username}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2.5 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">
                      User ID:
                    </span>
                    <span
                      className="font-mono text-sm"
                      style={{ color: colors.blue }}
                    >
                      {user.id}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">Joined:</span>
                    <span
                      className="font-mono text-sm"
                      style={{ color: colors.blue }}
                    >
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="font-semibold text-gray-700">
                      Last Login:
                    </span>
                    <span
                      className="font-mono text-sm"
                      style={{ color: colors.blue }}
                    >
                      {new Date(user.last_login).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
            <button
              className="w-full bg-gray-100 text-gray-700 font-semibold py-4 px-6 border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200"
              style={{ borderRadius: "6px" }}
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        )}

        <div
          className="border-l-4 p-4"
          style={{
            backgroundColor: colors.lightYellow,
            borderColor: colors.gold,
            color: "#854d0e",
            borderRadius: "6px",
          }}
        >
          <p className="m-0 leading-relaxed">
            <strong className="text-gray-900">Note:</strong> Make sure you have
            Freighter wallet extension installed in your browser. Download from{" "}
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.blue, textDecoration: "underline" }}
            >
              freighter.app
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default Login;
