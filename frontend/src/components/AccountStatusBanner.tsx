/**
 * Account Status Banner
 * Shows wallet account status and provides funding option for testnet
 */

import { useState, useEffect } from 'react';
import { checkAccountExists, fundTestnetAccount } from '../utils/stellarAccount';
import { Button } from './ui/Button';

interface AccountStatusBannerProps {
  walletAddress: string;
}

export const AccountStatusBanner = ({ walletAddress }: AccountStatusBannerProps) => {
  const [accountStatus, setAccountStatus] = useState<{
    exists: boolean;
    balance?: string;
    checking: boolean;
  }>({ exists: true, checking: true });
  const [funding, setFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState('');

  useEffect(() => {
    checkAccount();
  }, [walletAddress]);

  const checkAccount = async () => {
    setAccountStatus({ exists: true, checking: true });
    const result = await checkAccountExists(walletAddress);
    setAccountStatus({
      exists: result.exists,
      balance: result.balance,
      checking: false
    });
  };

  const handleFundAccount = async () => {
    setFunding(true);
    setFundingMessage('');
    
    const result = await fundTestnetAccount(walletAddress);
    setFundingMessage(result.message);
    
    if (result.success) {
      // Wait a moment then recheck account
      setTimeout(async () => {
        await checkAccount();
        setFunding(false);
      }, 2000);
    } else {
      setFunding(false);
    }
  };

  if (accountStatus.checking) {
    return null; // Or show a loading state
  }

  if (accountStatus.exists) {
    return null; // Account is good, no need to show banner
  }

  return (
    <div className="mb-6 p-4 bg-yellow-100 border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-3xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2">Account Not Found on Stellar Testnet</h3>
          <p className="mb-3 text-sm">
            Your wallet address is not yet activated on the Stellar testnet. You need to fund it with some XLM to activate it and perform blockchain transactions.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleFundAccount}
              disabled={funding}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {funding ? '🔄 Funding...' : '💰 Fund Account (Testnet)'}
            </Button>
            <Button
              onClick={checkAccount}
              disabled={funding}
              variant="outline"
            >
              🔄 Recheck
            </Button>
          </div>
          {fundingMessage && (
            <p className={`mt-3 text-sm font-semibold ${
              fundingMessage.includes('success') ? 'text-green-700' : 'text-red-700'
            }`}>
              {fundingMessage}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-600">
            Note: Testnet XLM has no real value and is used only for testing purposes.
          </p>
        </div>
      </div>
    </div>
  );
};
