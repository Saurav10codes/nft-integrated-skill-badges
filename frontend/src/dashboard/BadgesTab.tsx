import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Badge, type Test, type Attempt } from '../config/supabase';

interface BadgeWithTest extends Badge {
  test?: Test;
}

interface PracticeAttempt extends Attempt {
  test?: Test;
}

interface BadgesTabProps {
  walletAddress: string;
  onViewTest: (testId: string) => void;
}

interface GroupedBadges {
  company: string;
  badges: BadgeWithTest[];
  practiceAttempts: PracticeAttempt[];
}

const BadgesTab = ({ walletAddress, onViewTest }: BadgesTabProps) => {
  const [groupedBadges, setGroupedBadges] = useState<GroupedBadges[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterByCompany, setFilterByCompany] = useState<Record<string, 'all' | 'active' | 'practice'>>({});

  useEffect(() => {
    fetchUserBadgesAndAttempts();
  }, [walletAddress]);

  const fetchUserBadgesAndAttempts = async () => {
    try {
      setLoading(true);

      // Fetch badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (badgesError) throw badgesError;

      // Fetch ALL attempts (both passed and failed) - we'll determine which are practice later
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select('*')
        .eq('candidate_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      console.log('=== DEBUG: Fetching Badges and Attempts ===');
      console.log('Wallet Address:', walletAddress);
      console.log('All attempts fetched:', attemptsData?.length);
      console.log('Attempts data:', attemptsData);
      console.log('Badges data:', badgesData?.length);
      console.log('Badges:', badgesData);

      // Get unique test IDs from both badges and attempts
      const badgeTestIds = badgesData?.map(b => b.test_id) || [];
      const attemptTestIds = attemptsData?.map(a => a.test_id) || [];
      const allTestIds = [...new Set([...badgeTestIds, ...attemptTestIds])];

      if (allTestIds.length > 0) {
        // Fetch all test data
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .in('id', allTestIds);

        if (testsError) throw testsError;

        // Map badges with test data
        const badgesWithTests: BadgeWithTest[] = (badgesData || []).map(badge => ({
          ...badge,
          test: testsData?.find(t => t.id === badge.test_id)
        }));

        // Show ALL attempts (including those that earned badges)
        const practiceAttemptsWithTests: PracticeAttempt[] = (attemptsData || [])
          .map(attempt => ({
            ...attempt,
            test: testsData?.find(t => t.id === attempt.test_id)
          }));

        console.log('Total attempts:', attemptsData?.length);
        console.log('All attempts shown:', practiceAttemptsWithTests.length);
        console.log('Attempts details:', practiceAttemptsWithTests);
        console.log('Badges:', badgesWithTests.length);

        // Group by company
        const grouped = new Map<string, GroupedBadges>();

        // Add badges to groups
        badgesWithTests.forEach(badge => {
          const company = badge.test?.company || 'Independent';
          if (!grouped.has(company)) {
            grouped.set(company, {
              company,
              badges: [],
              practiceAttempts: []
            });
          }
          grouped.get(company)!.badges.push(badge);
        });

        // Add practice attempts to groups
        practiceAttemptsWithTests.forEach(attempt => {
          const company = attempt.test?.company || 'Independent';
          if (!grouped.has(company)) {
            grouped.set(company, {
              company,
              badges: [],
              practiceAttempts: []
            });
          }
          grouped.get(company)!.practiceAttempts.push(attempt);
        });

        // Convert to array and sort by company name
        const groupedArray = Array.from(grouped.values()).sort((a, b) => 
          a.company.localeCompare(b.company)
        );

        console.log('=== FINAL GROUPED DATA ===');
        console.log('Grouped by company:', groupedArray);
        groupedArray.forEach(group => {
          console.log(`Company: ${group.company}`);
          console.log(`  - Badges: ${group.badges.length}`);
          console.log(`  - Practice Attempts: ${group.practiceAttempts.length}`);
        });

        setGroupedBadges(groupedArray);
      } else {
        setGroupedBadges([]);
      }
    } catch (err: any) {
      console.error('Error fetching badges:', err);
      setError(err.message || 'Failed to load badges');
      setGroupedBadges([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading badges...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 border-l-4"
        style={{
          backgroundColor: colors.lightPink,
          borderColor: colors.rose,
          color: colors.darkRed,
          borderRadius: '6px'
        }}
      >
        {error}
      </div>
    );
  }

  if (groupedBadges.length === 0) {
    return (
      <div
        className="bg-white shadow-md p-8 text-center"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
          No Badges or Completed Tests Yet
        </h3>
        <p className="text-gray-600 mb-6">
          You haven't earned any badges or completed any tests yet. Take tests to earn your first badge!
        </p>
        <div
          className="inline-block px-6 py-3 font-medium"
          style={{
            backgroundColor: colors.lightBlue,
            color: colors.blue,
            borderRadius: '6px'
          }}
        >
          Start earning badges
        </div>
      </div>
    );
  }

  const totalBadges = groupedBadges.reduce((sum, group) => sum + group.badges.length, 0);
  const totalPractice = groupedBadges.reduce((sum, group) => sum + group.practiceAttempts.length, 0);

  return (
    <div>
      <div
        className="bg-white shadow-md p-6 mb-6"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-xl font-bold mb-2" style={{ color: colors.darkRed }}>
          Your Achievements
        </h3>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center font-bold text-xl"
              style={{
                backgroundColor: colors.lightBlue,
                color: colors.blue,
                borderRadius: '8px'
              }}
            >
              {totalBadges}
            </div>
            <div>
              <p className="text-sm text-gray-500">Earned Badges</p>
              <p className="text-lg font-semibold" style={{ color: colors.blue }}>
                NFT Certified
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center font-bold text-xl"
              style={{
                backgroundColor: colors.lightYellow,
                color: colors.orange,
                borderRadius: '8px'
              }}
            >
              {totalPractice}
            </div>
            <div>
              <p className="text-sm text-gray-500">Practice Tests</p>
              <p className="text-lg font-semibold" style={{ color: colors.orange }}>
                Completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center font-bold text-xl"
              style={{
                backgroundColor: colors.lightMint,
                color: colors.darkRed,
                borderRadius: '8px'
              }}
            >
              {groupedBadges.length}
            </div>
            <div>
              <p className="text-sm text-gray-500">Companies</p>
              <p className="text-lg font-semibold" style={{ color: colors.darkRed }}>
                Organizations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped by Company */}
      {groupedBadges.map((group) => {
        const filter = filterByCompany[group.company] || 'all';
        const filteredBadges = filter === 'practice' ? [] : group.badges;
        const filteredPractice = filter === 'active' ? [] : group.practiceAttempts;
        
        return (
          <div key={group.company} className="mb-8">
            {/* Company Header */}
            <div
              className="p-4 mb-4 flex items-center justify-between"
              style={{
                backgroundColor: colors.blue,
                borderRadius: '8px'
              }}
            >
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {group.company}
                </h3>
                <p className="text-sm text-white opacity-90">
                  {group.badges.length} badge{group.badges.length !== 1 ? 's' : ''} earned
                  {group.practiceAttempts.length > 0 && ` • ${group.practiceAttempts.length} practice test${group.practiceAttempts.length !== 1 ? 's' : ''} passed`}
                </p>
              </div>
              
              {/* Filter Dropdown */}
              <select
                value={filter}
                onChange={(e) => setFilterByCompany({
                  ...filterByCompany,
                  [group.company]: e.target.value as 'all' | 'active' | 'practice'
                })}
                className="px-4 py-2 font-medium cursor-pointer"
                style={{
                  backgroundColor: 'white',
                  color: colors.blue,
                  borderRadius: '6px',
                  border: 'none',
                  outline: 'none'
                }}
              >
                <option value="all">All Tests</option>
                <option value="active">Active Only</option>
                <option value="practice">Practice Only</option>
              </select>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Earned Badges */}
              {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                style={{ borderRadius: '8px', border: `2px solid ${colors.lightBlue}` }}
              >
                <div
                  className="h-40 flex items-center justify-center"
                  style={{
                    backgroundColor: colors.blue
                  }}
                >
                  <div className="text-white text-center">
                    <div className="text-4xl font-bold mb-2">NFT BADGE</div>
                    <p className="font-semibold text-sm">Certified Achievement</p>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="font-bold text-lg mb-2" style={{ color: colors.darkRed }}>
                    {badge.test?.title || 'Test Badge'}
                  </h4>

                  <div
                    className="p-3 mb-3"
                    style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
                  >
                    <p className="text-xs text-gray-500 mb-1">Earned On</p>
                    <p className="font-mono text-sm" style={{ color: colors.blue }}>
                      {new Date(badge.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {badge.nft_token_id && (
                    <div
                      className="p-3 mb-3"
                      style={{ backgroundColor: colors.lightMint, borderRadius: '6px' }}
                    >
                      <p className="text-xs text-gray-500 mb-1">NFT Token ID</p>
                      <p className="font-mono text-xs break-all" style={{ color: '#059669' }}>
                        {badge.nft_token_id}
                      </p>
                    </div>
                  )}

                  {badge.metadata_url && (
                    <div
                      className="p-3 mb-3"
                      style={{ backgroundColor: colors.lightBlue, borderRadius: '6px' }}
                    >
                      <p className="text-xs text-gray-500 mb-1">Metadata URI</p>
                      <p className="font-mono text-xs break-all" style={{ color: colors.blue }}>
                        {badge.metadata_url}
                      </p>
                    </div>
                  )}

                  {badge.mint_tx_hash && (
                    <button
                      className="w-full text-white font-semibold py-2 px-4 text-sm shadow-md hover:shadow-lg transition-all duration-200 mb-2"
                      style={{
                        backgroundColor: colors.blue,
                        borderRadius: '6px'
                      }}
                      onClick={() => {
                        window.open(`https://stellar.expert/explorer/testnet/tx/${badge.mint_tx_hash}`, '_blank');
                      }}
                    >
                      View on Stellar Explorer
                    </button>
                  )}

                  {badge.metadata_url && (
                    <button
                      className="w-full text-gray-700 font-semibold py-2 px-4 text-sm border-2 hover:bg-gray-50 transition-all duration-200 mb-2"
                      style={{
                        borderColor: colors.blue,
                        borderRadius: '6px'
                      }}
                      onClick={() => {
                        window.open(badge.metadata_url!, '_blank');
                      }}
                    >
                      View Metadata
                    </button>
                  )}

                  {badge.test_id && (
                    <button
                      className="w-full text-white font-semibold py-2 px-4 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      style={{
                        backgroundColor: colors.orange,
                        borderRadius: '6px'
                      }}
                      onClick={() => onViewTest(badge.test_id)}
                    >
                      View Test in Earn Tab
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Practice Attempts */}
            {filteredPractice.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                style={{ borderRadius: '8px', border: `2px dashed ${colors.orange}` }}
              >
                <div
                  className="h-40 flex items-center justify-center"
                  style={{
                    backgroundColor: colors.orange
                  }}
                >
                  <div className="text-white text-center">
                    <div className="text-4xl font-bold mb-2">PRACTICE</div>
                    <p className="font-semibold text-sm">Test Completed</p>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="font-bold text-lg mb-2" style={{ color: colors.orange }}>
                    {attempt.test?.title || 'Practice Test'}
                  </h4>

                  <div
                    className="p-3 mb-3"
                    style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
                  >
                    <p className="text-xs text-gray-500 mb-1">Completed On</p>
                    <p className="font-mono text-sm" style={{ color: colors.orange }}>
                      {new Date(attempt.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div
                    className="p-3 mb-3"
                    style={{ backgroundColor: colors.lightMint, borderRadius: '6px' }}
                  >
                    <p className="text-xs text-gray-500 mb-1">Score</p>
                    <p className="font-mono text-sm font-bold" style={{ color: '#059669' }}>
                      {attempt.percentage}%
                    </p>
                  </div>

                  <div
                    className="p-3 mb-3"
                    style={{ backgroundColor: colors.lightYellow, borderRadius: '6px' }}
                  >
                    <p className="text-xs text-gray-700">
                      <strong>Practice Mode:</strong> This test was completed after it ended.
                      No NFT badge is awarded for practice attempts.
                    </p>
                  </div>

                  {attempt.test_id && (
                    <button
                      className="w-full text-white font-semibold py-2 px-4 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      style={{
                        backgroundColor: colors.rose,
                        borderRadius: '6px'
                      }}
                      onClick={() => onViewTest(attempt.test_id)}
                    >
                      Retake Test
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      })}
    </div>
  );
};

export default BadgesTab;
