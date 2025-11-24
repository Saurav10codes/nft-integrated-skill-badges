import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../config/colors';
import EarnTab from './EarnTab';
import BadgesTab from './BadgesTab';
import CreateTestTab from './CreateTestTab';
import MyTestsTab from './MyTestsTab';
import TakeTestTab from './TakeTestTab';
import ProfileTab from './ProfileTab';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

interface User {
  id: string;
  wallet_address: string;
  created_at: string;
  last_login: string;
}

type MenuItem = 'profile' | 'earn' | 'badges' | 'mytests' | 'create' | 'taketest';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<MenuItem>('profile');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { testId } = useParams<{ testId?: string }>();

  useEffect(() => {
    // Check if user is authenticated
    const savedUser = localStorage.getItem('stellar_user');
    const savedAddress = localStorage.getItem('stellar_wallet');

    if (!savedUser || !savedAddress) {
      // Redirect to login if not authenticated
      navigate('/');
      return;
    }

    setUser(JSON.parse(savedUser));
    setAccount(savedAddress);

    // If testId is in URL, set it and show test
    if (testId) {
      setSelectedTestId(testId);
      setActiveMenu('taketest');
    }

    // Listen for account changes
    const handleAccountChange = (accounts: string[]) => handleAccountsChanged(accounts);
    
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      window.ethereum.on('accountsChanged', handleAccountChange);
    }

    return () => {
      if (window.ethereum && typeof window.ethereum.removeListener === 'function') {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
      }
    };
  }, [navigate, testId]);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      handleLogout();
    } else if (account && accounts[0].toLowerCase() !== account.toLowerCase()) {
      // User switched to a different account
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('stellar_user');
    localStorage.removeItem('stellar_wallet');
    navigate('/');
  };

  const handleTakeTest = (testId: string) => {
    navigate(`/test/${testId}`);
  };

  const handleBackFromTest = () => {
    setSelectedTestId(null);
    setActiveMenu('earn');
    navigate('/dashboard');
  };

  const handleViewTestFromBadges = (testId: string) => {
    // Switch to earn tab
    setActiveMenu('earn');
    
    // Scroll to the test after a short delay to ensure the tab has rendered
    setTimeout(() => {
      const testElement = document.getElementById(`test-${testId}`);
      if (testElement) {
        testElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight effect
        testElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          testElement.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-5">
            <p className="text-xl font-heading">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden dotted-grid-bg" style={{ backgroundColor: colors.background }}>
      {/* Sidebar - Fixed with Neobrutalism design */}
      <aside className="w-64 bg-secondary-background border-r-4 border-border flex flex-col h-screen shadow-lg" style={{ backgroundColor: colors.yellowLight }}>
        {/* Logo/Brand */}
        <div className="p-5 border-b-4 border-border flex items-center justify-center h-20" style={{ backgroundColor: colors.orangeLight }}>
          <div className="text-center">
            <h1 className="text-xl font-heading">Stellar Skills</h1>
            <p className="text-xs font-heading mt-0.5">Dashboard</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={activeMenu === 'profile' ? 'default' : 'neutral'}
            className={`w-full justify-start text-base ${
              activeMenu === 'profile' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[4px] active:translate-y-[4px]'
            } transition-all duration-150`}
            onClick={() => setActiveMenu('profile')}
            style={{
              backgroundColor: activeMenu === 'profile' ? colors.blueLight : 'transparent',
              borderColor: activeMenu === 'profile' ? colors.blue : '#E5E7EB',
              color: activeMenu === 'profile' ? colors.blue : '#4B5563'
            }}
          >
            Profile
          </Button>

          <Button
            variant={activeMenu === 'earn' ? 'default' : 'neutral'}
            className={`w-full justify-start text-base ${
              activeMenu === 'earn' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[4px] active:translate-y-[4px]'
            } transition-all duration-150`}
            onClick={() => setActiveMenu('earn')}
            style={{
              backgroundColor: activeMenu === 'earn' ? colors.blueLight : 'transparent',
              borderColor: activeMenu === 'earn' ? colors.blue : '#E5E7EB',
              color: activeMenu === 'earn' ? colors.blue : '#4B5563'
            }}
          >
            Earn
          </Button>

          <Button
            variant={activeMenu === 'badges' ? 'default' : 'neutral'}
            className={`w-full justify-start text-base ${
              activeMenu === 'badges' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[4px] active:translate-y-[4px]'
            } transition-all duration-150`}
            onClick={() => setActiveMenu('badges')}
            style={{
              backgroundColor: activeMenu === 'badges' ? colors.blueLight : 'transparent',
              borderColor: activeMenu === 'badges' ? colors.blue : '#E5E7EB',
              color: activeMenu === 'badges' ? colors.blue : '#4B5563'
            }}
          >
            My Badges
          </Button>

          <Button
            variant={activeMenu === 'mytests' ? 'default' : 'neutral'}
            className={`w-full justify-start text-base ${
              activeMenu === 'mytests' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[4px] active:translate-y-[4px]'
            } transition-all duration-150`}
            onClick={() => setActiveMenu('mytests')}
            style={{
              backgroundColor: activeMenu === 'mytests' ? colors.blueLight : 'transparent',
              borderColor: activeMenu === 'mytests' ? colors.blue : '#E5E7EB',
              color: activeMenu === 'mytests' ? colors.blue : '#4B5563'
            }}
          >
            My Tests
          </Button>

          <Button
            variant={activeMenu === 'create' ? 'default' : 'neutral'}
            className={`w-full justify-start text-base ${
              activeMenu === 'create' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[4px] active:translate-y-[4px]'
            } transition-all duration-150`}
            onClick={() => setActiveMenu('create')}
            style={{
              backgroundColor: activeMenu === 'create' ? colors.blueLight : 'transparent',
              borderColor: activeMenu === 'create' ? colors.blue : '#E5E7EB',
              color: activeMenu === 'create' ? colors.blue : '#4B5563'
            }}
          >
            Create Test
          </Button>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t-4 border-border space-y-2" style={{ backgroundColor: colors.pinkLight }}>
          <Card style={{ backgroundColor: colors.white }} className="border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="py-2 px-2.5">
              <p className="text-xs font-heading mb-0.5">Wallet</p>
              <p className="font-mono text-xs font-bold break-all">
                {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
              </p>
            </CardContent>
          </Card>
          
          <Button
            variant="reverse"
            className="w-full font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px] transition-all duration-150"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - Fixed */}
        <header className="bg-secondary-background border-b-4 border-border px-6 flex items-center shrink-0 h-20 shadow-shadow" style={{ backgroundColor: colors.purpleLight }}>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-heading whitespace-nowrap">
              {activeMenu === 'profile' && 'Profile'}
              {activeMenu === 'earn' && 'Earn'}
              {activeMenu === 'badges' && 'My Badges'}
              {activeMenu === 'mytests' && 'My Tests'}
              {activeMenu === 'create' && 'Create Test'}
            </h2>
            <span className="text-border/20 font-light text-xl">|</span>
            <p className="text-sm font-heading">
              {activeMenu === 'profile' && 'View and manage your profile'}
              {activeMenu === 'earn' && 'Discover and take tests to earn badges'}
              {activeMenu === 'badges' && 'View your earned NFT badges'}
              {activeMenu === 'mytests' && 'Manage tests you have created'}
              {activeMenu === 'create' && 'Design and publish new skill tests'}
            </p>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeMenu === 'profile' && (
            <>
              <ProfileTab userId={user.id} />
            </>
          )}

          {activeMenu === 'earn' && <EarnTab walletAddress={account} onTakeTest={handleTakeTest} />}

          {activeMenu === 'badges' && (
            <BadgesTab 
              walletAddress={account} 
              onViewTest={handleViewTestFromBadges}
              onSwitchTab={(tab) => setActiveMenu(tab as MenuItem)}
            />
          )}

          {activeMenu === 'mytests' && <MyTestsTab walletAddress={account} onSwitchTab={(tab) => setActiveMenu(tab as MenuItem)} />}

          {activeMenu === 'create' && <CreateTestTab walletAddress={account} />}

          {activeMenu === 'taketest' && selectedTestId && (
            <TakeTestTab 
              testId={selectedTestId} 
              walletAddress={account} 
              onBack={handleBackFromTest}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
