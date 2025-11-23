import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test } from '../config/supabase';

interface EarnTabProps {
  walletAddress: string;
}

const EarnTab = ({ walletAddress }: EarnTabProps) => {
  const [activeTests, setActiveTests] = useState<Test[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [previousTests, setPreviousTests] = useState<Test[]>([]);
  const [filteredActiveTests, setFilteredActiveTests] = useState<Test[]>([]);
  const [filteredUpcomingTests, setFilteredUpcomingTests] = useState<Test[]>([]);
  const [filteredPreviousTests, setFilteredPreviousTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    // Filter tests based on search query
    if (searchQuery.trim() === '') {
      setFilteredActiveTests(activeTests);
      setFilteredUpcomingTests(upcomingTests);
      setFilteredPreviousTests(previousTests);
    } else {
      const query = searchQuery.toLowerCase();
      const filterFunc = (test: Test) =>
        test.title.toLowerCase().includes(query) ||
        (test.company && test.company.toLowerCase().includes(query)) ||
        (test.description && test.description.toLowerCase().includes(query));

      setFilteredActiveTests(activeTests.filter(filterFunc));
      setFilteredUpcomingTests(upcomingTests.filter(filterFunc));
      setFilteredPreviousTests(previousTests.filter(filterFunc));
    }
  }, [searchQuery, activeTests, upcomingTests, previousTests]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      // Fetch all tests
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('registration_count', { ascending: false });

      if (error) throw error;

      const allTests = data || [];

      // Separate active, upcoming, and previous tests
      const active: Test[] = [];
      const upcoming: Test[] = [];
      const previous: Test[] = [];

      allTests.forEach((test) => {
        const startTime = new Date(test.start_time);
        const endTime = new Date(test.end_time);
        const currentTime = new Date(now);

        // Check if test is currently active
        if (currentTime >= startTime && currentTime <= endTime) {
          active.push(test);
          console.log(`✅ Active test: "${test.title}" (${test.start_time} to ${test.end_time})`);
        } else if (currentTime < startTime) {
          // Test hasn't started yet
          upcoming.push(test);
          console.log(`⏳ Upcoming test: "${test.title}" (starts ${test.start_time})`);
        } else {
          // Test has ended
          previous.push(test);
          console.log(`⏱️ Previous test: "${test.title}" (ended ${test.end_time})`);
        }
      });

      // Sort active tests by registration count (highest first)
      active.sort((a, b) => b.registration_count - a.registration_count);

      // Sort upcoming tests by start time (soonest first)
      upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Limit previous tests to top 20 by registration count
      const topPrevious = previous.slice(0, 20);

      setActiveTests(active);
      setUpcomingTests(upcoming);
      setPreviousTests(topPrevious);
      setFilteredActiveTests(active);
      setFilteredUpcomingTests(upcoming);
      setFilteredPreviousTests(topPrevious);

      console.log(`📊 Found ${active.length} active, ${upcoming.length} upcoming, and ${topPrevious.length} previous tests (showing top 20)`);
    } catch (err: any) {
      console.error('Error fetching tests:', err);
      setError(err.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return colors.lightMint;
      case 'medium':
        return colors.lightYellow;
      case 'hard':
        return colors.lightPink;
      default:
        return colors.cream;
    }
  };

  const getDifficultyTextColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return '#059669';
      case 'medium':
        return colors.orange;
      case 'hard':
        return colors.darkRed;
      default:
        return '#4B5563';
    }
  };

  const renderTestCard = (test: Test, status: 'active' | 'upcoming' | 'previous') => (
    <div
      key={test.id}
      className="bg-white shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
      style={{
        borderRadius: '8px',
        opacity: status === 'active' ? 1 : 0.85,
        borderLeft: status === 'active' ? `4px solid ${colors.blue}` :
                   status === 'upcoming' ? `4px solid ${colors.gold}` :
                   `4px solid ${colors.rose}`
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold" style={{ color: colors.darkRed }}>
              {test.title}
            </h3>
            {status === 'upcoming' && (
              <span
                className="px-2 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: colors.lightYellow,
                  color: colors.orange,
                  borderRadius: '4px'
                }}
              >
                UPCOMING
              </span>
            )}
            {status === 'previous' && (
              <span
                className="px-2 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: colors.peach,
                  color: colors.darkRed,
                  borderRadius: '4px'
                }}
              >
                ENDED
              </span>
            )}
          </div>
          {test.company && (
            <p className="text-sm text-gray-500 mb-2">
              By {test.company}
            </p>
          )}
          <p className="text-gray-600 mb-3">
            {test.description || 'No description available'}
          </p>
        </div>
        {test.difficulty && (
          <div
            className="px-3 py-1 text-xs font-semibold uppercase ml-4"
            style={{
              backgroundColor: getDifficultyColor(test.difficulty),
              color: getDifficultyTextColor(test.difficulty),
              borderRadius: '4px'
            }}
          >
            {test.difficulty}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          className="p-2 text-center"
          style={{ backgroundColor: colors.lightBlue, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Registrations</p>
          <p className="font-bold text-lg" style={{ color: colors.blue }}>
            {test.registration_count}
          </p>
        </div>

        <div
          className="p-2 text-center"
          style={{ backgroundColor: colors.lightYellow, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Attempts</p>
          <p className="font-bold text-lg" style={{ color: colors.orange }}>
            {test.attempt_count}
          </p>
        </div>

        <div
          className="p-2 text-center"
          style={{ backgroundColor: colors.lightMint, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Pass Rate</p>
          <p className="font-bold text-lg" style={{ color: '#059669' }}>
            {test.attempt_count > 0 ? Math.round((test.pass_count / test.attempt_count) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div
          className="p-3"
          style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Questions</p>
          <p className="font-bold" style={{ color: colors.blue }}>
            {test.total_questions}
          </p>
        </div>

        <div
          className="p-3"
          style={{ backgroundColor: colors.lightMint, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Pass Score</p>
          <p className="font-bold" style={{ color: '#059669' }}>
            {test.pass_score}%
          </p>
        </div>

        <div
          className="p-3"
          style={{ backgroundColor: colors.lightBlue, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">Start Time</p>
          <p className="font-mono text-xs" style={{ color: colors.blue }}>
            {new Date(test.start_time).toLocaleDateString()}
          </p>
        </div>

        <div
          className="p-3"
          style={{ backgroundColor: colors.peach, borderRadius: '6px' }}
        >
          <p className="text-xs text-gray-500 mb-1">End Time</p>
          <p className="font-mono text-xs" style={{ color: colors.darkRed }}>
            {new Date(test.end_time).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          className="w-full text-white font-semibold py-3 px-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          style={{
            background: status === 'active'
              ? `linear-gradient(135deg, ${colors.orange} 0%, ${colors.gold} 100%)`
              : status === 'upcoming'
              ? `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 100%)`
              : `linear-gradient(135deg, ${colors.rose} 0%, ${colors.pink} 100%)`,
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (status === 'active') {
              // TODO: Navigate to test page
              alert(`Taking test: ${test.title}\nNote: You can earn a badge by passing!`);
            } else if (status === 'upcoming') {
              // TODO: Register for test
              alert(`Register for test: ${test.title}`);
            } else {
              // TODO: Navigate to test page (practice mode)
              alert(`Taking test: ${test.title}\nNote: This test has ended. You can take it for practice, but no badge will be awarded.`);
            }
          }}
        >
          {status === 'active' ? 'Take Test & Earn Badge' : status === 'upcoming' ? 'Register' : 'Take for Practice (No Badge)'}
        </button>
        {status === 'previous' && (
          <p className="text-xs text-center text-gray-500 italic">
            Test ended - practice mode only, no badge awarded
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading tests...</div>
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

  const totalTests = filteredActiveTests.length + filteredUpcomingTests.length + filteredPreviousTests.length;

  if (totalTests === 0 && !searchQuery) {
    return (
      <div
        className="bg-white shadow-md p-8 text-center"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
          No Tests Available
        </h3>
        <p className="text-gray-600 mb-6">
          There are no tests available at the moment. Check back later!
        </p>
        <div
          className="inline-block px-6 py-3 font-medium"
          style={{
            backgroundColor: colors.lightYellow,
            color: colors.orange,
            borderRadius: '6px'
          }}
        >
          Stay tuned
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by test title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pr-12 border-2 focus:outline-none focus:border-2 transition-colors"
            style={{
              borderRadius: '8px',
              borderColor: searchQuery ? colors.blue : colors.lightBlue,
            }}
          />
          <div
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xl"
            style={{ color: colors.blue }}
          >
            🔍
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            Found {totalTests} test{totalTests !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {filteredActiveTests.length > 0 && ` (${filteredActiveTests.length} active)`}
            {filteredUpcomingTests.length > 0 && ` (${filteredUpcomingTests.length} upcoming)`}
            {filteredPreviousTests.length > 0 && ` (${filteredPreviousTests.length} previous)`}
          </div>
        )}
      </div>

      {/* No Results Message */}
      {totalTests === 0 && searchQuery && (
        <div
          className="bg-white shadow-md p-8 text-center"
          style={{ borderRadius: '8px' }}
        >
          <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
            No Tests Found
          </h3>
          <p className="text-gray-600 mb-6">
            No tests match your search for "{searchQuery}". Try a different search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-6 py-3 font-medium text-white shadow-md hover:shadow-lg transition-all"
            style={{
              backgroundColor: colors.blue,
              borderRadius: '6px',
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Active Tests Section */}
      {filteredActiveTests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.blue }}>
            Active Tests ({filteredActiveTests.length})
          </h3>
          <div className="space-y-4">
            {filteredActiveTests.map((test) => renderTestCard(test, 'active'))}
          </div>
        </div>
      )}

      {/* Upcoming Tests Section */}
      {filteredUpcomingTests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.orange }}>
            Upcoming Tests - Register Now ({filteredUpcomingTests.length})
          </h3>
          <div className="space-y-4">
            {filteredUpcomingTests.map((test) => renderTestCard(test, 'upcoming'))}
          </div>
        </div>
      )}

      {/* Previous Tests Section */}
      {filteredPreviousTests.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.rose }}>
            Previous Tests - Top by Registrations ({filteredPreviousTests.length})
          </h3>
          <div className="space-y-4">
            {filteredPreviousTests.map((test) => renderTestCard(test, 'previous'))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarnTab;
