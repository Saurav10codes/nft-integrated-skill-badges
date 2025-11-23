import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../config/colors';
import EarnTab from './EarnTab';
import BadgesTab from './BadgesTab';
import CreateTestTab from './CreateTestTab';
import MyTestsTab from './MyTestsTab';
import TakeTestTab from './TakeTestTab';
import ProfileTab from './ProfileTab';

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

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.lightBlue }}
      >
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: colors.cream }}>
      {/* Sidebar - Fixed */}
      <aside
        className="w-64 shadow-lg flex flex-col h-screen"
        style={{ backgroundColor: 'white', borderRight: `1px solid ${colors.lightBlue}` }}
      >
        {/* Logo/Brand */}
        <div
          className="p-5 border-b flex items-center justify-center"
          style={{ 
            borderColor: colors.lightBlue,
            height: '80px'
          }}
        >
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: colors.darkRed }}>
              Stellar Skills
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Dashboard</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveMenu('profile')}
            className={`w-full text-left px-4 py-3 mb-2 font-medium transition-all duration-200 ${
              activeMenu === 'profile' ? 'shadow-md' : 'hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeMenu === 'profile' ? colors.lightBlue : 'transparent',
              color: activeMenu === 'profile' ? colors.blue : '#4B5563',
              borderRadius: '6px'
            }}
          >
            Profile
          </button>

          <button
            onClick={() => setActiveMenu('earn')}
            className={`w-full text-left px-4 py-3 mb-2 font-medium transition-all duration-200 ${
              activeMenu === 'earn' ? 'shadow-md' : 'hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeMenu === 'earn' ? colors.lightBlue : 'transparent',
              color: activeMenu === 'earn' ? colors.blue : '#4B5563',
              borderRadius: '6px'
            }}
          >
            Earn
          </button>

          <button
            onClick={() => setActiveMenu('badges')}
            className={`w-full text-left px-4 py-3 mb-2 font-medium transition-all duration-200 ${
              activeMenu === 'badges' ? 'shadow-md' : 'hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeMenu === 'badges' ? colors.lightBlue : 'transparent',
              color: activeMenu === 'badges' ? colors.blue : '#4B5563',
              borderRadius: '6px'
            }}
          >
            My Badges
          </button>

          <button
            onClick={() => setActiveMenu('mytests')}
            className={`w-full text-left px-4 py-3 mb-2 font-medium transition-all duration-200 ${
              activeMenu === 'mytests' ? 'shadow-md' : 'hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeMenu === 'mytests' ? colors.lightBlue : 'transparent',
              color: activeMenu === 'mytests' ? colors.blue : '#4B5563',
              borderRadius: '6px'
            }}
          >
            My Tests
          </button>

          <button
            onClick={() => setActiveMenu('create')}
            className={`w-full text-left px-4 py-3 mb-2 font-medium transition-all duration-200 ${
              activeMenu === 'create' ? 'shadow-md' : 'hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeMenu === 'create' ? colors.lightBlue : 'transparent',
              color: activeMenu === 'create' ? colors.blue : '#4B5563',
              borderRadius: '6px'
            }}
          >
            Create Test
          </button>
        </nav>

        {/* User Info & Logout */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: colors.lightBlue }}
        >
          <div 
            className="p-3 mb-3"
            style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
          >
            <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm font-medium" style={{ color: colors.blue }}>
              {formatAddress(account)}
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full text-white px-4 py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            style={{ 
              backgroundColor: colors.rose,
              borderRadius: '6px'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - Fixed */}
        <header
          className="bg-white shadow-sm border-b px-6 flex items-center shrink-0"
          style={{ 
            borderColor: colors.lightBlue,
            height: '80px'
          }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold whitespace-nowrap" style={{ color: colors.darkRed }}>
              {activeMenu === 'profile' && 'Profile'}
              {activeMenu === 'earn' && 'Earn'}
              {activeMenu === 'badges' && 'My Badges'}
              {activeMenu === 'mytests' && 'My Tests'}
              {activeMenu === 'create' && 'Create Test'}
            </h2>
            <span className="text-gray-300 font-light text-xl" style={{ width: '2px' }}>|</span>
            <p className="text-sm text-gray-500">
              {activeMenu === 'profile' && 'Create and manage your custom badges'}
              {activeMenu === 'earn' && 'Discover and take tests to earn badges'}
              {activeMenu === 'badges' && 'View your earned NFT badges and achievements'}
              {activeMenu === 'mytests' && 'Manage tests you have created'}
              {activeMenu === 'create' && 'Design and publish new skill tests'}
            </p>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeMenu === 'profile' && (
            <>
              {/* Welcome Section */}
              <div 
                className="bg-white shadow-md p-6 mb-6"
                style={{ borderRadius: '8px' }}
              >
                <h3 className="text-xl font-bold mb-2" style={{ color: colors.darkRed }}>
                  Welcome back
                </h3>
                <p className="text-gray-600">
                  You're successfully logged in to your Stellar account.
                </p>
              </div>

              {/* User Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Wallet Address Card */}
                <div 
                  className="shadow-md p-5 hover:shadow-lg transition-shadow duration-300"
                  style={{ backgroundColor: colors.lightBlue, borderRadius: '8px' }}
                >
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Wallet Address</h4>
                  <p className="font-mono text-xs break-all" style={{ color: colors.blue }}>
                    {user.wallet_address}
                  </p>
                </div>

                {/* Member Since Card */}
                <div 
                  className="shadow-md p-5 hover:shadow-lg transition-shadow duration-300"
                  style={{ backgroundColor: colors.lightYellow, borderRadius: '8px' }}
                >
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Member Since</h4>
                  <p className="font-mono text-sm" style={{ color: colors.orange }}>
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Last Login Card */}
                <div 
                  className="shadow-md p-5 hover:shadow-lg transition-shadow duration-300"
                  style={{ backgroundColor: colors.peach, borderRadius: '8px' }}
                >
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Last Login</h4>
                  <p className="font-mono text-sm" style={{ color: colors.darkRed }}>
                    {new Date(user.last_login).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Custom Badges Section */}
              <ProfileTab userId={user.id} />
            </>
          )}

          {activeMenu === 'earn' && <EarnTab walletAddress={account} onTakeTest={handleTakeTest} />}

          {activeMenu === 'badges' && (
            <BadgesTab 
              walletAddress={account} 
              onViewTest={handleViewTestFromBadges}
            />
          )}

          {activeMenu === 'mytests' && <MyTestsTab walletAddress={account} />}

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
