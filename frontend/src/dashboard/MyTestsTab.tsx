import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test, type Attempt, type Question } from '../config/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getContractExplorerUrl, formatContractAddress } from '../utils/sorobanSimple';

interface CustomBadge {
  id: string;
  badge_name: string;
  svg_url: string;
}

interface MyTestsTabProps {
  walletAddress: string;
  onSwitchTab?: (tab: string) => void;
}

interface TestWithStats extends Test {
  uniqueAttempts: number;
  custom_badge?: CustomBadge | null;
}

const MyTestsTab = ({ walletAddress, onSwitchTab }: MyTestsTabProps) => {
  const [tests, setTests] = useState<TestWithStats[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestWithStats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metadata' | 'questions'>('metadata');

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

      // Fetch custom badges separately for tests that have them
      const customBadgeIds = (data || []).map(test => test.custom_badge_id).filter(Boolean);
      
      let customBadgesMap: Record<string, any> = {};
      if (customBadgeIds.length > 0) {
        const { data: badgesData } = await supabase
          .from('custom_badges')
          .select('id, badge_name, svg_url')
          .in('id', customBadgeIds);
        
        if (badgesData) {
          customBadgesMap = badgesData.reduce((acc, badge) => {
            acc[badge.id] = badge;
            return acc;
          }, {} as Record<string, any>);
        }
      }

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
            uniqueAttempts: uniqueUsers.size,
            custom_badge: test.custom_badge_id ? customBadgesMap[test.custom_badge_id] : null
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWallet(text);
      setTimeout(() => setCopiedWallet(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fetchTestAnalytics = async (test: TestWithStats) => {
    try {
      // Fetch attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select('*')
        .eq('test_id', test.id)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Fetch questions for this test
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', test.id)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      setAttempts(attemptsData || []);
      setQuestions(questionsData || []);
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

    if (now < startTime) return { label: 'Upcoming', color: colors.yellowLight, textColor: colors.orange };
    if (now >= startTime && now <= endTime) return { label: 'Active', color: colors.greenLight, textColor: '#059669' };
    return { label: 'Ended', color: colors.pinkLight, textColor: colors.red };
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
          backgroundColor: colors.pinkLight,
          borderColor: colors.red,
          color: colors.red,
          borderRadius: '6px'
        }}
      >
        {error}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <Card style={{ backgroundColor: colors.blueLight, borderColor: colors.blue }} className="border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle style={{ color: colors.blue }}>No Tests Created Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/70 mb-4 text-sm">
            You haven't created any tests yet. Go to the Create Test tab to get started!
          </p>
          <Button 
            onClick={() => onSwitchTab?.('create')}
            style={{ backgroundColor: colors.greenLight, borderColor: colors.green, color: colors.green }}
          >
            Create Your First Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'analytics' && selectedTest) {
    const status = getTestStatus(selectedTest);
    const passRate = selectedTest.attempt_count > 0
      ? ((selectedTest.pass_count / selectedTest.attempt_count) * 100).toFixed(1)
      : '0';

    return (
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          onClick={() => {
            setViewMode('list');
            setSelectedTest(null);
          }}
          className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150"
          style={{
            backgroundColor: colors.blue,
            borderColor: colors.blue,
            color: colors.white,
          }}
        >
          ← Back to My Tests
        </Button>

        {/* Test Header */}
        <Card
          className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: colors.purpleLight }}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-xl font-bold mb-1.5" style={{ color: colors.purple }}>
                  {selectedTest.title}
                </h2>
                {selectedTest.company && (
                  <p className="text-sm text-gray-600">By {selectedTest.company}</p>
                )}
                {selectedTest.contract_address && (
                  <button
                    onClick={() => window.open(getContractExplorerUrl(selectedTest.contract_address!), '_blank')}
                    className="text-xs font-mono font-medium mt-1 px-2 py-1 border-2 border-black rounded-base bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                    style={{ color: colors.purple }}
                  >
                    <span>Contract: {formatContractAddress(selectedTest.contract_address)}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                )}
              </div>
              <span
                className="px-2 py-1 text-xs font-bold rounded-base border-2 border-black"
                style={{
                  backgroundColor: status.color,
                  color: status.textColor,
                }}
              >
                {status.label}
              </span>
            </div>
            <p className="text-gray-700 text-sm">{selectedTest.description}</p>
          </CardContent>
        </Card>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('metadata')}
            className="flex-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
            style={{
              backgroundColor: activeTab === 'metadata' ? colors.purple : colors.white,
              color: activeTab === 'metadata' ? colors.white : colors.purple,
            }}
          >
            Metadata & Statistics
          </Button>
          <Button
            onClick={() => setActiveTab('questions')}
            className="flex-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
            style={{
              backgroundColor: activeTab === 'questions' ? colors.purple : colors.white,
              color: activeTab === 'questions' ? colors.white : colors.purple,
            }}
          >
            Questions & Answers ({questions.length})
          </Button>
        </div>

        {/* Metadata Tab */}
        {activeTab === 'metadata' && (
          <div className="space-y-4">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.white }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Registered</p>
              <p className="text-2xl font-bold" style={{ color: colors.purple }}>
                {selectedTest.registration_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.white }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Total Attempts</p>
              <p className="text-2xl font-bold" style={{ color: colors.purple }}>
                {selectedTest.attempt_count}
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.white }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Pass Count</p>
              <p className="text-2xl font-bold" style={{ color: colors.purple }}>
                {selectedTest.pass_count}
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.white }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Pass Rate</p>
              <p className="text-2xl font-bold" style={{ color: colors.purple }}>
                {passRate}%
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.white }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Unique Users</p>
              <p className="text-2xl font-bold" style={{ color: colors.purple }}>
                {selectedTest.uniqueAttempts}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attempts Table */}
        <Card
          className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: colors.yellowLight }}
        >
          <CardHeader>
            <CardTitle style={{ color: colors.yellow }}>
              Recent Attempts ({attempts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-gray-600 text-center py-6">No attempts yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 px-3 font-bold text-sm">Candidate</th>
                      <th className="text-left py-2 px-3 font-bold text-sm">Score</th>
                      <th className="text-left py-2 px-3 font-bold text-sm">Percentage</th>
                      <th className="text-left py-2 px-3 font-bold text-sm">Result</th>
                      <th className="text-left py-2 px-3 font-bold text-sm">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        className="border-b border-black/20 hover:bg-white/50 transition-colors"
                      >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {attempt.candidate_wallet.substring(0, 8)}...
                            {attempt.candidate_wallet.substring(attempt.candidate_wallet.length - 6)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(attempt.candidate_wallet)}
                            className="p-1 rounded border border-black hover:bg-black hover:text-white transition-colors"
                            title="Copy wallet address"
                          >
                            {copiedWallet === attempt.candidate_wallet ? (
                              <span className="text-xs">Copied</span>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-sm" style={{ color: colors.yellow }}>
                          {attempt.score}/{attempt.total_score}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-sm" style={{ color: colors.yellow }}>
                          {attempt.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="px-2 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                          style={{
                            backgroundColor: attempt.passed ? colors.greenLight : colors.redLight,
                            color: attempt.passed ? colors.green : colors.red,
                          }}
                        >
                          {attempt.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-gray-600">
                          {new Date(attempt.created_at).toLocaleString('en-US', {
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
          </CardContent>
        </Card>
          </div>
        )}

        {/* Questions & Answers Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <Card
              className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{ backgroundColor: colors.greenLight }}
            >
              <CardHeader>
                <CardTitle style={{ color: colors.green }}>
                  Questions & Answers ({questions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">No questions found</p>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card
                        key={question.id}
                        className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        style={{ backgroundColor: colors.white }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <span
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-base border-2 border-black font-bold"
                              style={{ backgroundColor: colors.greenLight, color: colors.green }}
                            >
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-bold text-base mb-2">{question.question_text}</p>
                              <div className="flex items-center gap-2 mb-3">
                                <span
                                  className="px-2 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                                  style={{
                                    backgroundColor: question.question_type === 'multiple_choice' 
                                      ? colors.blueLight 
                                      : question.question_type === 'true_false' 
                                      ? colors.yellowLight 
                                      : colors.pinkLight,
                                    color: question.question_type === 'multiple_choice' 
                                      ? colors.blue 
                                      : question.question_type === 'true_false' 
                                      ? colors.orange 
                                      : colors.pink,
                                  }}
                                >
                                  {question.question_type === 'multiple_choice' ? 'Multiple Choice' : question.question_type === 'true_false' ? 'True/False' : 'One Word'}
                                </span>
                                <span
                                  className="px-2 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                                  style={{ backgroundColor: colors.purpleLight, color: colors.purple }}
                                >
                                  {question.points} {question.points === 1 ? 'point' : 'points'}
                                </span>
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                {question.question_type !== 'one_word' && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="px-2 py-1 text-sm font-mono font-bold border-2 border-black rounded-base"
                                        style={{
                                          backgroundColor: question.correct_answer === 'A' ? colors.greenLight : colors.white,
                                          color: question.correct_answer === 'A' ? colors.green : 'black',
                                        }}
                                      >
                                        A
                                      </span>
                                      <span className="text-sm">{question.option_a}</span>
                                      {question.correct_answer === 'A' && (
                                        <span className="text-xs font-bold" style={{ color: colors.green }}>✓ Correct</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="px-2 py-1 text-sm font-mono font-bold border-2 border-black rounded-base"
                                        style={{
                                          backgroundColor: question.correct_answer === 'B' ? colors.greenLight : colors.white,
                                          color: question.correct_answer === 'B' ? colors.green : 'black',
                                        }}
                                      >
                                        B
                                      </span>
                                      <span className="text-sm">{question.option_b}</span>
                                      {question.correct_answer === 'B' && (
                                        <span className="text-xs font-bold" style={{ color: colors.green }}>✓ Correct</span>
                                      )}
                                    </div>
                                    {question.option_c && (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="px-2 py-1 text-sm font-mono font-bold border-2 border-black rounded-base"
                                          style={{
                                            backgroundColor: question.correct_answer === 'C' ? colors.greenLight : colors.white,
                                            color: question.correct_answer === 'C' ? colors.green : 'black',
                                          }}
                                        >
                                          C
                                        </span>
                                        <span className="text-sm">{question.option_c}</span>
                                        {question.correct_answer === 'C' && (
                                          <span className="text-xs font-bold" style={{ color: colors.green }}>✓ Correct</span>
                                        )}
                                      </div>
                                    )}
                                    {question.option_d && (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="px-2 py-1 text-sm font-mono font-bold border-2 border-black rounded-base"
                                          style={{
                                            backgroundColor: question.correct_answer === 'D' ? colors.greenLight : colors.white,
                                            color: question.correct_answer === 'D' ? colors.green : 'black',
                                          }}
                                        >
                                          D
                                        </span>
                                        <span className="text-sm">{question.option_d}</span>
                                        {question.correct_answer === 'D' && (
                                          <span className="text-xs font-bold" style={{ color: colors.green }}>✓ Correct</span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                                {question.question_type === 'one_word' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">Correct Answer:</span>
                                    <span
                                      className="px-3 py-1 text-sm font-mono font-bold border-2 border-black rounded-base"
                                      style={{ backgroundColor: colors.greenLight, color: colors.green }}
                                    >
                                      {question.correct_answer}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xl font-bold" style={{ color: colors.red }}>
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
            <Card
              key={test.id}
              className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
              style={{ backgroundColor: colors.blueLight }}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold" style={{ color: colors.blue }}>
                        {test.title}
                      </h3>
                      <span
                        className="px-1.5 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                        style={{
                          backgroundColor: status.color,
                          color: status.textColor,
                        }}
                      >
                        {status.label}
                      </span>
                      {test.custom_badge ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 border-2 border-black rounded-base bg-white">
                          <img src={test.custom_badge.svg_url} alt={test.custom_badge.badge_name} className="w-4 h-4" />
                          <span className="text-xs font-bold">{test.custom_badge.badge_name}</span>
                        </div>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 text-xs font-bold uppercase rounded-base border-2 border-black bg-gray-100 text-gray-500"
                        >
                          No Badge
                        </span>
                      )}
                    </div>
                    {test.company && (
                      <p className="text-xs text-gray-600 mb-1.5">By {test.company}</p>
                    )}
                    {test.contract_address && (
                      <button
                        onClick={() => window.open(getContractExplorerUrl(test.contract_address!), '_blank')}
                        className="text-xs font-mono font-medium mb-1.5 px-2 py-1 border-2 border-black rounded-base bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                        style={{ color: colors.purple }}
                      >
                        <span>Contract: {formatContractAddress(test.contract_address)}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    )}
                    <p className="text-sm text-gray-700 mb-2">
                      {test.description || 'No description'}
                    </p>
                  </div>
                  
                  {/* Test Duration */}
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 mb-0.5">Duration</span>
                    <div className="px-2 py-1 rounded-base border-2 border-black bg-white">
                      <span className="text-sm font-bold font-mono" style={{ color: colors.purple }}>
                        {(() => {
                          const start = new Date(test.start_time).getTime();
                          const end = new Date(test.end_time).getTime();
                          const diffMs = end - start;
                          const diffMins = Math.floor(diffMs / 60000);
                          const hours = Math.floor(diffMins / 60);
                          const mins = diffMins % 60;
                          return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Test Statistics - Unified Color */}
                <div className="grid grid-cols-4 gap-2">
                  <div
                    className="p-1.5 text-center border-2 border-black rounded-base"
                    style={{ backgroundColor: colors.white }}
                  >
                    <p className="text-xs text-gray-600">Registered</p>
                    <p className="font-bold text-sm" style={{ color: colors.blue }}>
                      {test.registration_count || 0}
                    </p>
                  </div>

                  <div
                    className="p-1.5 text-center border-2 border-black rounded-base"
                    style={{ backgroundColor: colors.white }}
                  >
                    <p className="text-xs text-gray-600">Attempts</p>
                    <p className="font-bold text-sm" style={{ color: colors.blue }}>
                      {test.attempt_count}
                    </p>
                  </div>

                  <div
                    className="p-1.5 text-center border-2 border-black rounded-base"
                    style={{ backgroundColor: colors.white }}
                  >
                    <p className="text-xs text-gray-600">Passed</p>
                    <p className="font-bold text-sm" style={{ color: colors.blue }}>
                      {test.pass_count}
                    </p>
                  </div>

                  <div
                    className="p-1.5 text-center border-2 border-black rounded-base"
                    style={{ backgroundColor: colors.white }}
                  >
                    <p className="text-xs text-gray-600">Pass Rate</p>
                    <p className="font-bold text-sm" style={{ color: colors.blue }}>
                      {passRate}%
                    </p>
                  </div>
                </div>

                {/* Time Information */}
                <div className="flex gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Start: </span>
                    <span className="font-mono font-bold" style={{ color: colors.blue }}>
                      {new Date(test.start_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">End: </span>
                    <span className="font-mono font-bold" style={{ color: colors.blue }}>
                      {new Date(test.end_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div>
                  <Button
                    onClick={() => fetchTestAnalytics(test)}
                    className="w-full text-sm py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150"
                    style={{
                      backgroundColor: colors.blue,
                      borderColor: colors.blue,
                      color: colors.white,
                    }}
                  >
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MyTestsTab;
