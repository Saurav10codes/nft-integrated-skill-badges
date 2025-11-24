import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test } from '../config/supabase';
import { logContractInfo, getContractExplorerUrl, formatContractAddress } from '../utils/sorobanSimple';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface EarnTabProps {
  walletAddress: string;
  onTakeTest: (testId: string) => void;
}

const EarnTab = ({ walletAddress, onTakeTest }: EarnTabProps) => {
  const [activeTests, setActiveTests] = useState<Test[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [previousTests, setPreviousTests] = useState<Test[]>([]);
  const [registeredTests, setRegisteredTests] = useState<Test[]>([]);
  const [filteredActiveTests, setFilteredActiveTests] = useState<Test[]>([]);
  const [filteredUpcomingTests, setFilteredUpcomingTests] = useState<Test[]>([]);
  const [filteredPreviousTests, setFilteredPreviousTests] = useState<Test[]>([]);
  const [filteredRegisteredTests, setFilteredRegisteredTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userAttempts, setUserAttempts] = useState<Set<string>>(new Set());
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  
  // Collapsible states
  const [registeredSectionOpen, setRegisteredSectionOpen] = useState(true);
  const [activeSectionOpen, setActiveSectionOpen] = useState(true);
  const [upcomingSectionOpen, setUpcomingSectionOpen] = useState(true);
  const [previousSectionOpen, setPreviousSectionOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const userRegs = await fetchUserData();
      await fetchTests(userRegs);
    };
    loadData();
    // Log contract info on component mount
    logContractInfo();
  }, [walletAddress]);

  useEffect(() => {
    // Filter tests based on search query
    if (searchQuery.trim() === '') {
      setFilteredActiveTests(activeTests);
      setFilteredUpcomingTests(upcomingTests);
      setFilteredPreviousTests(previousTests);
      setFilteredRegisteredTests(registeredTests);
    } else {
      const query = searchQuery.toLowerCase();
      const filterFunc = (test: Test) =>
        test.title.toLowerCase().includes(query) ||
        (test.company && test.company.toLowerCase().includes(query)) ||
        (test.description && test.description.toLowerCase().includes(query));

      setFilteredActiveTests(activeTests.filter(filterFunc));
      setFilteredUpcomingTests(upcomingTests.filter(filterFunc));
      setFilteredPreviousTests(previousTests.filter(filterFunc));
      setFilteredRegisteredTests(registeredTests.filter(filterFunc));
    }
  }, [searchQuery, activeTests, upcomingTests, previousTests, registeredTests]);

  const fetchTests = async (userRegs?: Set<string>) => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      
      // Use provided registrations or fall back to state
      const registrations = userRegs || userRegistrations;

      // Fetch all tests
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('registration_count', { ascending: false });

      if (error) throw error;

      const allTests = data || [];

      // Fetch custom badges separately for tests that have them
      const customBadgeIds = allTests.map(test => test.custom_badge_id).filter(Boolean);
      
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

      // Attach custom badge data to tests
      const testsWithBadges = allTests.map(test => ({
        ...test,
        custom_badge: test.custom_badge_id ? customBadgesMap[test.custom_badge_id] : null
      }));

      // For tests with total_questions = 0, fetch actual question count
      const testsWithQuestionCounts = await Promise.all(
        testsWithBadges.map(async (test) => {
          if (test.total_questions === 0 || test.total_questions === null) {
            const { count } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('test_id', test.id);
            
            return { ...test, total_questions: count || 0 };
          }
          return test;
        })
      );

      // Separate active, upcoming, and previous tests
      const active: Test[] = [];
      const upcoming: Test[] = [];
      const previous: Test[] = [];
      const registered: Test[] = [];

      testsWithQuestionCounts.forEach((test) => {
        const startTime = new Date(test.start_time);
        const endTime = new Date(test.end_time);
        const currentTime = new Date(now);
        
        // Check if user is registered for this test
        const isRegistered = registrations.has(test.id);
        console.log(`Test "${test.title}" (ID: ${test.id}): isRegistered = ${isRegistered}`);

        // If registered, only add to registered section
        if (isRegistered) {
          registered.push(test);
          console.log(`✓ Registered test: "${test.title}"`);
        } else {
          // Not registered - categorize by timing
          if (currentTime >= startTime && currentTime <= endTime) {
            active.push(test);
            console.log(`Active test: "${test.title}" (${test.start_time} to ${test.end_time})`);
          } else if (currentTime < startTime) {
            upcoming.push(test);
            console.log(`Upcoming test: "${test.title}" (starts ${test.start_time})`);
          } else {
            previous.push(test);
            console.log(`Previous test: "${test.title}" (ended ${test.end_time})`);
          }
        }
      });

      // Sort active tests by registration count (highest first)
      active.sort((a, b) => b.registration_count - a.registration_count);

      // Sort upcoming tests by start time (soonest first)
      upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Limit previous tests to top 20 by registration count
      const topPrevious = previous.slice(0, 20);
      
      // Sort registered tests by start time
      registered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setActiveTests(active);
      setUpcomingTests(upcoming);
      setPreviousTests(topPrevious);
      setRegisteredTests(registered);
      setFilteredActiveTests(active);
      setFilteredUpcomingTests(upcoming);
      setFilteredPreviousTests(topPrevious);
      setFilteredRegisteredTests(registered);

      console.log(`Found ${active.length} active, ${upcoming.length} upcoming, ${topPrevious.length} previous, and ${registered.length} registered tests`);
      console.log(`Current user wallet: ${walletAddress}`);
    } catch (err: any) {
      console.error('Error fetching tests:', err);
      setError(err.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (): Promise<Set<string>> => {
    try {
      console.log('Fetching user data for wallet:', walletAddress);
      
      // Fetch user's attempts to check which tests they've already taken
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('test_id')
        .eq('candidate_wallet', walletAddress);

      if (attemptsData) {
        setUserAttempts(new Set(attemptsData.map(a => a.test_id)));
        console.log('User attempts:', attemptsData);
      }

      // Fetch user's registrations
      const { data: regsData, error: regsError } = await supabase
        .from('test_registrations')
        .select('test_id')
        .eq('wallet_address', walletAddress);

      if (regsError) {
        console.error('Error fetching registrations:', regsError);
      }

      if (regsData) {
        const regSet = new Set(regsData.map(r => r.test_id));
        setUserRegistrations(regSet);
        console.log('User registrations data:', regsData);
        console.log('User registrations Set:', Array.from(regSet));
        return regSet; // Return the fresh Set
      } else {
        console.log('No registration data found');
        return new Set(); // Return empty Set
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      return new Set(); // Return empty Set on error
    }
  };

  const handleRegister = async (testId: string) => {
    try {
      // Insert registration
      const { error: regError } = await supabase
        .from('test_registrations')
        .insert([{
          test_id: testId,
          wallet_address: walletAddress
        }]);

      if (regError) {
        if (regError.message.includes('duplicate')) {
          alert('You are already registered for this test!');
        } else {
          throw regError;
        }
        return;
      }

      // Update test registration count
      const test = upcomingTests.find(t => t.id === testId);
      if (test) {
        await supabase
          .from('tests')
          .update({ registration_count: (test.registration_count || 0) + 1 })
          .eq('id', testId);
      }

      // Refresh data
      const userRegs = await fetchUserData();
      await fetchTests(userRegs);
      
      alert('Successfully registered for the test!');
    } catch (err: any) {
      console.error('Error registering for test:', err);
      alert(`Failed to register: ${err.message}`);
    }
  };

  const renderTestCard = (test: Test, status: 'active' | 'upcoming' | 'previous') => {
    const cardBgColors = {
      active: colors.purpleLight,
      upcoming: colors.yellowLight,
      previous: colors.pinkLight,
    };
    
    return (
      <Card
        key={test.id}
        id={`test-${test.id}`}
        style={{ backgroundColor: cardBgColors[status] }}
        className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-base font-bold">
                  {test.title}
                </h3>
                {status === 'upcoming' && (
                  <span
                    className="px-1.5 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                    style={{
                      backgroundColor: colors.yellowLight,
                      color: colors.yellow,
                    }}
                  >
                    UPCOMING
                  </span>
                )}
                {status === 'previous' && (
                  <span
                    className="px-1.5 py-0.5 text-xs font-bold rounded-base border-2 border-black"
                    style={{
                      backgroundColor: colors.redLight,
                      color: colors.red,
                    }}
                  >
                    ENDED
                  </span>
                )}
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
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  By {test.company}
                </p>
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
                {test.description || 'No description available'}
              </p>
            </div>
            
            {/* Test Duration */}
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mb-0.5">Duration</span>
              <div className="px-2 py-1 rounded-base border-2 border-black bg-white">
                <span className="text-sm font-bold font-mono" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
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

          {/* Statistics - Simplified with unified color */}
          <div className="grid grid-cols-4 gap-2">
            <div
              className="p-1.5 text-center border-2 border-black rounded-base"
              style={{ backgroundColor: colors.white }}
            >
              <p className="text-xs text-gray-600">Questions</p>
              <p className="font-bold text-sm" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
                {test.total_questions}
              </p>
            </div>

            <div
              className="p-1.5 text-center border-2 border-black rounded-base"
              style={{ backgroundColor: colors.white }}
            >
              <p className="text-xs text-gray-600">Pass Score</p>
              <p className="font-bold text-sm" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
                {test.pass_score}%
              </p>
            </div>

            <div
              className="p-1.5 text-center border-2 border-black rounded-base"
              style={{ backgroundColor: colors.white }}
            >
              <p className="text-xs text-gray-600">Registered</p>
              <p className="font-bold text-sm" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
                {test.registration_count || 0}
              </p>
            </div>

            <div
              className="p-1.5 text-center border-2 border-black rounded-base"
              style={{ backgroundColor: colors.white }}
            >
              <p className="text-xs text-gray-600">Attempts</p>
              <p className="font-bold text-sm" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
                {test.attempt_count}
              </p>
            </div>
          </div>

          {/* Time Information - Compact */}
          <div className="flex gap-3 text-xs">
            <div>
              <span className="text-gray-500">Start: </span>
              <span className="font-mono font-bold" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
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
              <span className="font-mono font-bold" style={{ color: status === 'active' ? colors.purple : status === 'upcoming' ? colors.yellow : colors.pink }}>
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

          {/* Action Button */}
          <div>
            {status === 'active' && userAttempts.has(test.id) ? (
              <div
                className="w-full text-center py-2 px-4 font-bold rounded-base border-2 border-black text-sm"
                style={{
                  backgroundColor: colors.greenLight,
                  color: colors.green,
                }}
              >
                Already Completed
              </div>
            ) : (
              <Button
                className="w-full font-bold text-sm py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150"
                style={{
                  backgroundColor: status === 'active'
                    ? colors.purple
                    : status === 'upcoming'
                    ? colors.yellow
                    : colors.pink,
                  borderColor: status === 'active'
                    ? colors.purple
                    : status === 'upcoming'
                    ? colors.yellow
                    : colors.pink,
                  color: colors.white,
                }}
                disabled={status === 'upcoming' && userRegistrations.has(test.id)}
                onClick={() => {
                  if (status === 'active') {
                    onTakeTest(test.id);
                  } else if (status === 'upcoming') {
                    handleRegister(test.id);
                  } else {
                    onTakeTest(test.id);
                  }
                }}
              >
                {status === 'active' 
                  ? 'Take Test & Earn Badge' 
                  : status === 'upcoming' 
                    ? (userRegistrations.has(test.id) ? 'Registered' : 'Register for Test')
                    : 'Take for Practice (No Badge)'}
              </Button>
            )}
            {status === 'previous' && (
              <p className="text-xs text-center text-gray-600 font-medium italic">
                Test ended - practice mode only, no badge awarded
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600 text-lg font-medium">Loading tests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ backgroundColor: colors.redLight }}>
        <CardContent className="py-5 text-center">
          <p className="text-xl font-bold" style={{ color: colors.red }}>
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalTests = filteredActiveTests.length + filteredUpcomingTests.length + filteredPreviousTests.length + filteredRegisteredTests.length;

  if (totalTests === 0 && !searchQuery) {
    return (
      <Card style={{ backgroundColor: colors.blueLight, borderColor: colors.blue }} className="border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle style={{ color: colors.blue }}>No Tests Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/70 text-sm">
            There are no tests available at the moment. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card style={{ backgroundColor: colors.purpleLight }}>
        <CardContent>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by test title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 text-base"
            />
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mt-3 text-sm font-medium text-gray-700">
              Found <strong>{totalTests}</strong> test{totalTests !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
              {filteredRegisteredTests.length > 0 && ` (${filteredRegisteredTests.length} registered)`}
              {filteredActiveTests.length > 0 && ` (${filteredActiveTests.length} active)`}
              {filteredUpcomingTests.length > 0 && ` (${filteredUpcomingTests.length} upcoming)`}
              {filteredPreviousTests.length > 0 && ` (${filteredPreviousTests.length} previous)`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Results Message */}
      {totalTests === 0 && searchQuery && (
        <Card style={{ backgroundColor: colors.orangeLight }}>
          <CardContent className="py-12 text-center space-y-4">
            <h3 className="text-2xl font-bold">
              No Tests Found
            </h3>
            <p className="text-gray-700 text-lg mb-6">
              No tests match your search for "<strong>{searchQuery}</strong>". Try a different search term.
            </p>
            <Button
              onClick={() => setSearchQuery('')}
              style={{
                backgroundColor: colors.orange,
                color: colors.white,
              }}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My Registered Tests Section */}
      {filteredRegisteredTests.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setRegisteredSectionOpen(!registeredSectionOpen)}
            className="w-full px-4 py-3 rounded-base border-2 border-black font-bold text-xl flex items-center justify-between transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.greenLight, color: colors.green }}
          >
            <span>My Registered Tests ({filteredRegisteredTests.length})</span>
            <span className="text-2xl transition-transform duration-200" style={{ transform: registeredSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          {registeredSectionOpen && (
            <div className="space-y-4">
              {filteredRegisteredTests.map((test) => {
                const now = new Date();
                const startTime = new Date(test.start_time);
                const endTime = new Date(test.end_time);
                const status = now >= startTime && now <= endTime ? 'active' : now < startTime ? 'upcoming' : 'previous';
                return renderTestCard(test, status);
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Tests Section */}
      {filteredActiveTests.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setActiveSectionOpen(!activeSectionOpen)}
            className="w-full px-4 py-3 rounded-base border-2 border-black font-bold text-xl flex items-center justify-between transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.blueLight, color: colors.blue }}
          >
            <span>Active Tests ({filteredActiveTests.length})</span>
            <span className="text-2xl transition-transform duration-200" style={{ transform: activeSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          {activeSectionOpen && (
            <div className="space-y-4">
              {filteredActiveTests.map((test) => renderTestCard(test, 'active'))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Tests Section */}
      {filteredUpcomingTests.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setUpcomingSectionOpen(!upcomingSectionOpen)}
            className="w-full px-4 py-3 rounded-base border-2 border-black font-bold text-xl flex items-center justify-between transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.yellowLight, color: colors.yellow }}
          >
            <span>Upcoming Tests - Register Now ({filteredUpcomingTests.length})</span>
            <span className="text-2xl transition-transform duration-200" style={{ transform: upcomingSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          {upcomingSectionOpen && (
            <div className="space-y-4">
              {filteredUpcomingTests.map((test) => renderTestCard(test, 'upcoming'))}
            </div>
          )}
        </div>
      )}

      {/* Previous Tests Section */}
      {filteredPreviousTests.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setPreviousSectionOpen(!previousSectionOpen)}
            className="w-full px-4 py-3 rounded-base border-2 border-black font-bold text-xl flex items-center justify-between transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: colors.pinkLight, color: colors.pink }}
          >
            <span>Previous Tests - Top by Registrations ({filteredPreviousTests.length})</span>
            <span className="text-2xl transition-transform duration-200" style={{ transform: previousSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          {previousSectionOpen && (
            <div className="space-y-4">
              {filteredPreviousTests.map((test) => renderTestCard(test, 'previous'))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EarnTab;
