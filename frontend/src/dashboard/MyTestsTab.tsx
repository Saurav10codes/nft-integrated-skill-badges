import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test, type Attempt } from '../config/supabase';

interface MyTestsTabProps {
  walletAddress: string;
}

interface TestWithStats extends Test {
  uniqueAttempts: number;
}

const MyTestsTab = ({ walletAddress }: MyTestsTabProps) => {
  const [tests, setTests] = useState<TestWithStats[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestWithStats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');

  useEffect(() => {
    fetchMyTests();
  }, [walletAddress]);

  const fetchMyTests = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('creator_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate unique attempts per test
      const testsWithStats = await Promise.all(
        (data || []).map(async (test) => {
          const { data: attemptsData } = await supabase
            .from('attempts')
            .select('candidate_wallet')
            .eq('test_id', test.id);

          const uniqueUsers = new Set(attemptsData?.map(a => a.candidate_wallet) || []);

          return {
            ...test,
            uniqueAttempts: uniqueUsers.size
          };
        })
      );

      setTests(testsWithStats);
    } catch (err: any) {
      console.error('Error fetching my tests:', err);
      setError(err.message || 'Failed to load your tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestAnalytics = async (test: TestWithStats) => {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('test_id', test.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAttempts(data || []);
      setSelectedTest(test);
      setViewMode('analytics');
    } catch (err: any) {
      console.error('Error fetching test analytics:', err);
      alert('Failed to load test analytics');
    }
  };

  const getTestStatus = (test: Test) => {
    const now = new Date();
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);

    if (now < startTime) return { label: 'Upcoming', color: colors.lightYellow, textColor: colors.orange };
    if (now >= startTime && now <= endTime) return { label: 'Active', color: colors.lightMint, textColor: '#059669' };
    return { label: 'Ended', color: colors.lightPink, textColor: colors.darkRed };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading your tests...</div>
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

  if (tests.length === 0) {
    return (
      <div
        className="bg-white shadow-md p-8 text-center"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
          No Tests Created Yet
        </h3>
        <p className="text-gray-600 mb-6">
          You haven't created any tests yet. Go to the Create Test tab to get started!
        </p>
      </div>
    );
  }

  if (viewMode === 'analytics' && selectedTest) {
    const status = getTestStatus(selectedTest);
    const passRate = selectedTest.attempt_count > 0
      ? ((selectedTest.pass_count / selectedTest.attempt_count) * 100).toFixed(1)
      : '0';

    return (
      <div>
        {/* Back Button */}
        <button
          onClick={() => {
            setViewMode('list');
            setSelectedTest(null);
          }}
          className="mb-4 px-4 py-2 font-medium text-white shadow-md hover:shadow-lg transition-all"
          style={{
            backgroundColor: colors.blue,
            borderRadius: '6px'
          }}
        >
          ← Back to My Tests
        </button>

        {/* Test Header */}
        <div
          className="bg-white shadow-md p-6 mb-6"
          style={{ borderRadius: '8px' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: colors.darkRed }}>
                {selectedTest.title}
              </h2>
              {selectedTest.company && (
                <p className="text-sm text-gray-500">By {selectedTest.company}</p>
              )}
            </div>
            <div
              className="px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: status.color,
                color: status.textColor,
                borderRadius: '4px'
              }}
            >
              {status.label}
            </div>
          </div>
          <p className="text-gray-600">{selectedTest.description}</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightBlue, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Total Registrations</p>
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              {selectedTest.registration_count}
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightYellow, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Total Attempts</p>
            <p className="text-3xl font-bold" style={{ color: colors.orange }}>
              {selectedTest.attempt_count}
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightMint, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Pass Count</p>
            <p className="text-3xl font-bold" style={{ color: '#059669' }}>
              {selectedTest.pass_count}
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.peach, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Pass Rate</p>
            <p className="text-3xl font-bold" style={{ color: colors.darkRed }}>
              {passRate}%
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.cream, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Unique Test Takers</p>
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              {selectedTest.uniqueAttempts}
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightPink, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
            <p className="text-3xl font-bold" style={{ color: colors.darkRed }}>
              {selectedTest.registration_count > 0
                ? ((selectedTest.completion_count / selectedTest.registration_count) * 100).toFixed(1)
                : '0'}%
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightBlue, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Questions</p>
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              {selectedTest.total_questions}
            </p>
          </div>

          <div
            className="p-5 text-center shadow-md"
            style={{ backgroundColor: colors.lightMint, borderRadius: '8px' }}
          >
            <p className="text-sm text-gray-600 mb-2">Pass Score</p>
            <p className="text-3xl font-bold" style={{ color: '#059669' }}>
              {selectedTest.pass_score}%
            </p>
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div
          className="bg-white shadow-md p-6"
          style={{ borderRadius: '8px' }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
            Recent Attempts ({attempts.length})
          </h3>

          {attempts.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No attempts yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: colors.lightBlue }}>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Candidate</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Percentage</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Result</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-b hover:bg-gray-50"
                      style={{ borderColor: colors.cream }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">
                          {attempt.candidate_wallet.substring(0, 8)}...
                          {attempt.candidate_wallet.substring(attempt.candidate_wallet.length - 6)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold" style={{ color: colors.blue }}>
                          {attempt.score}/{attempt.total_score}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold" style={{ color: colors.orange }}>
                          {attempt.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: attempt.passed ? colors.lightMint : colors.lightPink,
                            color: attempt.passed ? '#059669' : colors.darkRed,
                            borderRadius: '4px'
                          }}
                        >
                          {attempt.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(attempt.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold" style={{ color: colors.darkRed }}>
          Your Created Tests ({tests.length})
        </h3>
        <p className="text-gray-600 mt-1">
          Manage and view analytics for your tests
        </p>
      </div>

      <div className="space-y-4">
        {tests.map((test) => {
          const status = getTestStatus(test);
          const passRate = test.attempt_count > 0
            ? ((test.pass_count / test.attempt_count) * 100).toFixed(1)
            : '0';

          return (
            <div
              key={test.id}
              className="bg-white shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
              style={{ borderRadius: '8px' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold" style={{ color: colors.darkRed }}>
                      {test.title}
                    </h3>
                    <span
                      className="px-2 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: status.color,
                        color: status.textColor,
                        borderRadius: '4px'
                      }}
                    >
                      {status.label}
                    </span>
                    {test.difficulty && (
                      <span
                        className="px-2 py-1 text-xs font-semibold uppercase"
                        style={{
                          backgroundColor: test.difficulty === 'easy' ? colors.lightMint :
                                         test.difficulty === 'medium' ? colors.lightYellow : colors.lightPink,
                          color: test.difficulty === 'easy' ? '#059669' :
                                test.difficulty === 'medium' ? colors.orange : colors.darkRed,
                          borderRadius: '4px'
                        }}
                      >
                        {test.difficulty}
                      </span>
                    )}
                  </div>
                  {test.company && (
                    <p className="text-sm text-gray-500 mb-2">By {test.company}</p>
                  )}
                  <p className="text-gray-600 mb-3">
                    {test.description || 'No description'}
                  </p>
                </div>
              </div>

              {/* Test Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div
                  className="p-3 text-center"
                  style={{ backgroundColor: colors.lightBlue, borderRadius: '6px' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Registrations</p>
                  <p className="font-bold text-lg" style={{ color: colors.blue }}>
                    {test.registration_count}
                  </p>
                </div>

                <div
                  className="p-3 text-center"
                  style={{ backgroundColor: colors.lightYellow, borderRadius: '6px' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Attempts</p>
                  <p className="font-bold text-lg" style={{ color: colors.orange }}>
                    {test.attempt_count}
                  </p>
                </div>

                <div
                  className="p-3 text-center"
                  style={{ backgroundColor: colors.lightMint, borderRadius: '6px' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Passed</p>
                  <p className="font-bold text-lg" style={{ color: '#059669' }}>
                    {test.pass_count}
                  </p>
                </div>

                <div
                  className="p-3 text-center"
                  style={{ backgroundColor: colors.peach, borderRadius: '6px' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Pass Rate</p>
                  <p className="font-bold text-lg" style={{ color: colors.darkRed }}>
                    {passRate}%
                  </p>
                </div>

                <div
                  className="p-3 text-center"
                  style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Unique Users</p>
                  <p className="font-bold text-lg" style={{ color: colors.blue }}>
                    {test.uniqueAttempts}
                  </p>
                </div>
              </div>

              {/* Time Information */}
              <div className="flex gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Start: </span>
                  <span className="font-mono" style={{ color: colors.blue }}>
                    {new Date(test.start_time).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">End: </span>
                  <span className="font-mono" style={{ color: colors.darkRed }}>
                    {new Date(test.end_time).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => fetchTestAnalytics(test)}
                  className="flex-1 text-white font-semibold py-3 px-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 100%)`,
                    borderRadius: '6px'
                  }}
                >
                  View Analytics
                </button>

                <button
                  onClick={() => alert('Edit functionality coming soon!')}
                  className="flex-1 text-white font-semibold py-3 px-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.gold} 100%)`,
                    borderRadius: '6px'
                  }}
                >
                  Edit Test
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyTestsTab;
