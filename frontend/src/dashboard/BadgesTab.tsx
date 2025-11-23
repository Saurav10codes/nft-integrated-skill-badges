import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Badge, type Test } from '../config/supabase';

interface BadgeWithTest extends Badge {
  test?: Test;
}

interface BadgesTabProps {
  walletAddress: string;
}

const BadgesTab = ({ walletAddress }: BadgesTabProps) => {
  const [badges, setBadges] = useState<BadgeWithTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchUserBadges();
  }, [walletAddress]);

  const fetchUserBadges = async () => {
    try {
      setLoading(true);

      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (badgesError) throw badgesError;

      if (badgesData && badgesData.length > 0) {
        const testIds = badgesData.map(b => b.test_id);

        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .in('id', testIds);

        if (testsError) throw testsError;

        const badgesWithTests = badgesData.map(badge => ({
          ...badge,
          test: testsData?.find(t => t.id === badge.test_id)
        }));

        setBadges(badgesWithTests);
      } else {
        setBadges([]);
      }
    } catch (err: any) {
      console.error('Error fetching badges:', err);
      setError(err.message || 'Failed to load badges');
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

  if (badges.length === 0) {
    return (
      <div
        className="bg-white shadow-md p-8 text-center"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
          No Badges Yet
        </h3>
        <p className="text-gray-600 mb-6">
          You haven't earned any badges yet. Take tests to earn your first badge!
        </p>
        <div
          className="inline-block px-6 py-3 font-medium"
          style={{
            backgroundColor: colors.lightYellow,
            color: colors.orange,
            borderRadius: '6px'
          }}
        >
          Start earning badges
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="bg-white shadow-md p-6 mb-6"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-xl font-bold mb-2" style={{ color: colors.darkRed }}>
          Your Badge Collection
        </h3>
        <p className="text-gray-600">
          You have earned {badges.length} badge{badges.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="bg-white shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            style={{ borderRadius: '8px' }}
          >
            <div
              className="h-40 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 100%)`
              }}
            >
              <div className="text-white text-center">
                <div className="text-6xl mb-2">🏆</div>
                <p className="font-bold text-lg">Badge</p>
              </div>
            </div>

            <div className="p-5">
              <h4 className="font-bold text-lg mb-2" style={{ color: colors.darkRed }}>
                {badge.test?.title || 'Test Badge'}
              </h4>

              {badge.test?.company && (
                <p className="text-sm text-gray-500 mb-3">
                  Issued by {badge.test.company}
                </p>
              )}

              <div
                className="p-3 mb-3"
                style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
              >
                <p className="text-xs text-gray-500 mb-1">Earned On</p>
                <p className="font-mono text-sm" style={{ color: colors.blue }}>
                  {new Date(badge.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
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

              {badge.mint_tx_hash && (
                <button
                  className="w-full text-white font-semibold py-2 px-4 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 100%)`,
                    borderRadius: '6px'
                  }}
                  onClick={() => {
                    window.open(`https://stellar.expert/explorer/testnet/tx/${badge.mint_tx_hash}`, '_blank');
                  }}
                >
                  View on Explorer
                </button>
              )}

              {!badge.nft_token_id && (
                <div
                  className="p-3 text-center text-sm"
                  style={{
                    backgroundColor: colors.lightYellow,
                    color: colors.orange,
                    borderRadius: '6px'
                  }}
                >
                  Badge minting pending
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgesTab;
