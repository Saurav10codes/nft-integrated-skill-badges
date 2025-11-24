import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test, type Question } from '../config/supabase';
import { mintNFTOnBlockchain } from '../utils/realBlockchain';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getContractExplorerUrl, formatContractAddress } from '../utils/sorobanSimple';

interface TakeTestTabProps {
  testId: string;
  walletAddress: string;
  onBack: () => void;
}

const TakeTestTab = ({ testId, walletAddress, onBack }: TakeTestTabProps) => {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    score: number;
    totalScore: number;
    percentage: number;
    passed: boolean;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [testEnded, setTestEnded] = useState(false);
  const [testEndedAgo, setTestEndedAgo] = useState<string>('');
  const [wasAlreadyEnded, setWasAlreadyEnded] = useState(false);

  useEffect(() => {
    fetchTestAndQuestions();
  }, [testId]);

  // Auto-submit when user leaves the page or switches tabs
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!result && !submitting && questions.length > 0) {
        // Try to submit before leaving
        handleSubmitTest(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !result && !submitting && questions.length > 0) {
        // Auto-submit when user switches tabs
        handleSubmitTest(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [result, submitting, questions, answers]);

  // Timer effect to auto-submit when test ends (only for active tests, not practice)
  useEffect(() => {
    if (!test || result || wasAlreadyEnded) return; // Don't run timer for practice tests

    const checkTime = () => {
      const now = new Date().getTime();
      const endTime = new Date(test.end_time).getTime();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTestEnded(true);
        setTimeRemaining(0);
        
        // Auto-submit if test time has ended and not already submitted
        if (!result && !submitting) {
          handleSubmitTest(true);
        }
      } else {
        setTimeRemaining(remaining);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);

    return () => clearInterval(interval);
  }, [test, result, submitting, wasAlreadyEnded]);

  const fetchTestAndQuestions = async () => {
    try {
      setLoading(true);

      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Check if test has already ended
      const now = new Date().getTime();
      const endTime = new Date(testData.end_time).getTime();
      if (now > endTime) {
        setTestEnded(true);
        setWasAlreadyEnded(true);
        
        // Calculate how long ago the test ended
        const endedAgo = now - endTime;
        const days = Math.floor(endedAgo / (1000 * 60 * 60 * 24));
        const hours = Math.floor((endedAgo % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((endedAgo % (1000 * 60 * 60)) / (1000 * 60));
        
        let agoText = '';
        if (days > 0) {
          agoText = `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
          agoText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
          agoText = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
          agoText = 'just now';
        }
        setTestEndedAgo(agoText);
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;
      
      console.log('=== QUESTIONS DEBUG ===');
      console.log('Test ID:', testId);
      console.log('Questions fetched:', questionsData?.length || 0);
      console.log('Questions data:', questionsData);
      
      setQuestions(questionsData || []);

      // Update view count
      await supabase
        .from('tests')
        .update({ view_count: (testData.view_count || 0) + 1 })
        .eq('id', testId);

    } catch (err: any) {
      console.error('Error fetching test:', err);
      setError(err.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = async (autoSubmit: boolean = false) => {
    // Prevent duplicate submissions
    if (submitting || result) {
      console.log('Submission already in progress or completed, skipping');
      return;
    }

    if (!autoSubmit && Object.keys(answers).length < questions.length) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (!confirm(`You have ${unanswered} unanswered question(s). Do you want to submit anyway?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);

      // Calculate score
      let score = 0;
      let totalScore = 0;

      questions.forEach((question) => {
        totalScore += question.points;
        
        // Validate answer based on question type
        let isCorrect = false;
        const userAnswer = answers[question.id] || '';
        
        if (question.question_type === 'multiple_choice') {
          isCorrect = userAnswer === question.correct_answer;
        } else if (question.question_type === 'true_false') {
          // For true/false, correct_answer is 'A' or 'B'
          isCorrect = userAnswer === question.correct_answer;
        } else if (question.question_type === 'one_word') {
          // For one_word, compare with option_a (case-insensitive and trimmed)
          const correctAnswer = question.option_a || '';
          isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        }
        
        if (isCorrect) {
          score += question.points;
        }
      });

      const percentage = totalScore > 0 ? (score / totalScore) * 100 : 0;
      
      // Check if user passed based on score (independent of test timing)
      const passed = percentage >= (test?.pass_score || 70);
      
      // Badge should only be awarded if:
      // 1. Test was NOT already ended when user started (wasAlreadyEnded = false)
      // 2. User passed the test
      const shouldAwardBadge = !wasAlreadyEnded && passed;
      
      console.log('=== TEST SUBMISSION CHECK ===');
      console.log('Was test already ended when started?', wasAlreadyEnded);
      console.log('Score:', score, '/', totalScore, `(${percentage.toFixed(2)}%)`);
      console.log('Passed?', passed);
      console.log('Will create badge?', shouldAwardBadge);

      // Save ONE attempt to database
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert([{
          test_id: testId,
          candidate_wallet: walletAddress,
          score,
          total_score: totalScore,
          percentage,
          passed,
          answers,
        }]);

      if (attemptError) throw attemptError;
      console.log('Attempt saved to database');

      // Update test statistics
      await supabase
        .from('tests')
        .update({
          attempt_count: (test?.attempt_count || 0) + 1,
          completion_count: (test?.completion_count || 0) + 1,
          pass_count: passed ? (test?.pass_count || 0) + 1 : test?.pass_count,
        })
        .eq('id', testId);

      // ONLY create badge if test is ACTIVE and user passed
      if (shouldAwardBadge) {
        console.log('Creating badge entry (test is ACTIVE and user PASSED)...');
        
        const { data: badgeData, error: badgeError } = await supabase
          .from('badges')
          .insert([{
            test_id: testId,
            wallet_address: walletAddress,
          }])
          .select()
          .single();

        if (badgeError && !badgeError.message.includes('duplicate')) {
          console.error('Error creating badge:', badgeError);
        } else if (badgeData) {
          console.log('Badge entry created in database');
          
          // Auto-mint the badge NFT immediately
          try {
            console.log('Auto-minting NFT badge on blockchain...');
            
            const mintResult = await mintNFTOnBlockchain(
              walletAddress,
              testId,
              test!.title,
              score,
              totalScore
            );

            console.log('Badge NFT minted:', mintResult);

            // Update badge record with blockchain data
            await supabase
              .from('badges')
              .update({
                nft_token_id: `badge_${testId}_${Date.now()}`,
                mint_tx_hash: mintResult.txHash,
                metadata_url: mintResult.metadataUrl,
              })
              .eq('id', badgeData.id);

            console.log(`Badge successfully created! TX: ${mintResult.txHash}`);
          } catch (mintError) {
            console.error('Auto-mint failed, can mint later from My Badges:', mintError);
          }
        } else if (badgeError?.message.includes('duplicate')) {
          console.log('Badge already exists for this test');
        }
      } else {
        console.log('ℹ️ No badge created - Test was already ended or user did not pass');
        if (wasAlreadyEnded) {
          console.log('  Reason: Test was already ended when user started (practice mode)');
        }
        if (!passed) {
          console.log('  Reason: Did not meet pass score threshold');
        }
      }

      setResult({
        score,
        totalScore,
        percentage,
        passed,
      });

    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading test...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div
          className="p-4 border-l-4 mb-4"
          style={{
            backgroundColor: colors.pinkLight,
            borderColor: colors.red,
            color: colors.red,
            borderRadius: '6px'
          }}
        >
          {error}
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2 text-white font-semibold"
          style={{
            backgroundColor: colors.blue,
            borderRadius: '6px'
          }}
        >
          ← Back to Tests
        </button>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div>
        <div className="bg-white shadow-md p-8 text-center" style={{ borderRadius: '8px' }}>
          <h3 className="text-2xl font-bold mb-3" style={{ color: colors.red }}>
            No Questions Available
          </h3>
          <p className="text-gray-600 mb-4">
            This test doesn't have any questions yet.
          </p>
          {test && (
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md mb-4">
              <p><strong>Test:</strong> {test.title}</p>
              <p><strong>Test ID:</strong> {testId}</p>
              <p className="mt-2 text-left">
                <strong>Troubleshooting:</strong>
                <br />• Check if questions exist in the database for this test
                <br />• Ensure the test_id in the questions table matches: {testId}
                <br />• Verify questions table has data with: SELECT * FROM questions WHERE test_id = '{testId}'
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 text-white font-semibold"
          style={{
            backgroundColor: colors.blue,
            borderRadius: '6px'
          }}
        >
          ← Back to Tests
        </button>
      </div>
    );
  }

  // Show results screen
  if (result) {
    const isPracticeMode = wasAlreadyEnded;
    const testEndedDuringTest = !isPracticeMode && new Date() > new Date(test!.end_time);
    const canMintBadge = result.passed && !isPracticeMode && !testEndedDuringTest;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: 'white' }}>
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-block px-6 py-3 border-4 border-black mb-4"
              style={{
                backgroundColor: result.passed ? colors.green : colors.red,
                transform: 'rotate(-2deg)'
              }}
            >
              <h2 className="text-3xl font-black text-white">
                {result.passed ? '✓ TEST PASSED!' : '✗ TEST FAILED'}
              </h2>
            </div>
            <p className="text-xl font-bold mt-4">
              {test!.title}
            </p>
            
            {/* Warning Messages */}
            {isPracticeMode && (
              <div className="mt-4 p-4 border-4 border-black" style={{ backgroundColor: colors.yellowLight }}>
                <p className="font-bold" style={{ color: colors.orange }}>
                  ⚠ Practice Mode
                </p>
                <p className="text-sm mt-1">
                  This test has ended. No NFT badge awarded for practice attempts.
                </p>
              </div>
            )}
            {testEndedDuringTest && !isPracticeMode && (
              <div className="mt-4 p-4 border-4 border-black" style={{ backgroundColor: colors.yellowLight }}>
                <p className="font-bold" style={{ color: colors.orange }}>
                  ⚠ Test Ended
                </p>
                <p className="text-sm mt-1">
                  The test ended while you were taking it. No badge awarded.
                </p>
              </div>
            )}
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Score */}
            <div
              className="p-6 text-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{ backgroundColor: colors.blueLight }}
            >
              <p className="text-sm font-bold mb-2 uppercase tracking-wide">Score</p>
              <p className="text-4xl font-black" style={{ color: colors.blue }}>
                {result.score}
              </p>
              <p className="text-sm font-bold mt-1">/ {result.totalScore}</p>
            </div>

            {/* Percentage */}
            <div
              className="p-6 text-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{ backgroundColor: colors.yellowLight }}
            >
              <p className="text-sm font-bold mb-2 uppercase tracking-wide">Percentage</p>
              <p className="text-4xl font-black" style={{ color: colors.orange }}>
                {result.percentage.toFixed(0)}
              </p>
              <p className="text-sm font-bold mt-1">%</p>
            </div>

            {/* Status */}
            <div
              className="p-6 text-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{
                backgroundColor: result.passed ? colors.greenLight : colors.pinkLight
              }}
            >
              <p className="text-sm font-bold mb-2 uppercase tracking-wide">Status</p>
              <p className="text-2xl font-black" style={{ color: result.passed ? colors.green : colors.red }}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </p>
              <p className="text-sm font-bold mt-1">
                {result.passed ? 'Great job!' : 'Try again'}
              </p>
            </div>
          </div>

          {/* Badge Earned Message */}
          {result.passed && !isPracticeMode && (
            <div
              className="p-6 mb-8 text-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              style={{ backgroundColor: colors.greenLight }}
            >
              <p className="text-2xl font-black mb-2" style={{ color: colors.green }}>
                Badge NFT Earned!
              </p>
              {canMintBadge ? (
                <p className="text-sm font-semibold">
                  Your badge NFT has been automatically minted on the Stellar blockchain!<br />
                  Check the "My Badges" tab to view it.
                </p>
              ) : (
                <p className="text-sm font-semibold">
                  Note: This test has ended. Badge cannot be awarded for tests that have ended.
                </p>
              )}
            </div>
          )}

          {/* Failed Message */}
          {!result.passed && !testEndedDuringTest && (
            <div
              className="p-6 mb-8 text-center border-4 border-black"
              style={{ backgroundColor: colors.yellowLight }}
            >
              <p className="text-lg font-bold mb-2">
                Keep Practicing!
              </p>
              <p className="text-sm font-semibold">
                You need {test.pass_score}% to pass this test.
              </p>
              <p className="text-xs mt-2 text-gray-600">
                Review the material and try again when ready.
              </p>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={onBack}
            className="w-full px-6 py-4 text-white font-black text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150 uppercase tracking-wide"
            style={{ backgroundColor: colors.blue }}
          >
            ← Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Warning Banner for Ended Tests */}
      {testEnded && (
        <Card
          className="mb-4 border-4"
          style={{ backgroundColor: colors.pinkLight, borderColor: colors.red }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-3xl">!</div>
            <div>
              <p className="font-bold" style={{ color: colors.red }}>
                This test has already ended {testEndedAgo}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                You can still take it for practice, but <strong>no badge will be awarded</strong> for ended tests.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card
        className="mb-4 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        style={{ backgroundColor: colors.purpleLight }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: colors.purple }}>
                {test.title}
              </h2>
              {test.company && (
                <p className="text-sm text-gray-600">By {test.company}</p>
              )}
              {test.contract_address && (
                <button
                  onClick={() => window.open(getContractExplorerUrl(test.contract_address!), '_blank')}
                  className="text-xs font-mono font-medium mt-1 px-2 py-1 border-2 border-black rounded-base bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                  style={{ color: colors.purple }}
                >
                  <span>Contract: {formatContractAddress(test.contract_address)}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!wasAlreadyEnded && timeRemaining !== null && timeRemaining > 0 && (
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                <p className="text-lg font-bold" style={{ 
                  color: timeRemaining < 60000 ? colors.red : timeRemaining < 300000 ? colors.orange : colors.blue 
                }}>
                  {formatTimeRemaining(timeRemaining)}
                </p>
              </div>
              )}
            {wasAlreadyEnded && (
              <div
                className="px-4 py-2 border-2 border-black rounded-base"
                style={{ backgroundColor: colors.yellowLight }}
              >
                <p className="text-xs text-gray-600">Practice Mode</p>
                <p className="text-sm font-semibold" style={{ color: colors.orange }}>
                  No Time Limit
                </p>
              </div>
            )}
            {testEnded && !wasAlreadyEnded && (
              <div className="px-4 py-2 border-2 border-black rounded-base" style={{ backgroundColor: colors.pinkLight }}>
                <p className="text-xs text-gray-600">Test Ended</p>
                <p className="text-sm font-semibold" style={{ color: colors.red }}>
                  Time's Up
                </p>
              </div>
            )}
            <Button
              onClick={onBack}
              variant="outline"
              className="text-sm"
            >
              Exit
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="w-full bg-gray-200 h-2 border-2 border-black rounded-base">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.purple
              }}
            />
          </div>
        </div>
      </CardContent>
      </Card>

      {/* Question */}
      <Card
        className="mb-4 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        style={{ backgroundColor: colors.white }}
      >
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="flex items-start gap-3 mb-4">
              <span
                className="px-3 py-1 text-sm font-bold border-2 border-black rounded-base"
                style={{
                  backgroundColor: colors.purpleLight,
                  color: colors.purple
                }}
              >
                Q{currentQuestionIndex + 1}
              </span>
              <h3 className="text-xl font-semibold flex-1" style={{ color: colors.purple }}>
                {currentQuestion.question_text}
              </h3>
              <span className="text-sm font-bold px-2 py-1 border-2 border-black rounded-base" style={{ backgroundColor: colors.yellowLight, color: colors.orange }}>
                {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
              </span>
            </div>
          </div>        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.question_type === 'multiple_choice' && (
            <>
              {[
                { letter: 'A', text: currentQuestion.option_a },
                { letter: 'B', text: currentQuestion.option_b },
                ...(currentQuestion.num_options && currentQuestion.num_options >= 3 ? [{ letter: 'C', text: currentQuestion.option_c || '' }] : []),
                ...(currentQuestion.num_options && currentQuestion.num_options === 4 ? [{ letter: 'D', text: currentQuestion.option_d || '' }] : [])
              ].map((option) => {
                const isSelected = answers[currentQuestion.id] === option.letter;

                return (
                  <button
                    key={option.letter}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.letter)}
                    className={`w-full text-left p-4 border-2 border-black rounded-base transition-all duration-200 ${
                      isSelected ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? colors.purpleLight : colors.white
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-black"
                        style={{
                          backgroundColor: isSelected ? colors.purple : colors.white,
                          color: isSelected ? 'white' : colors.purple
                        }}
                      >
                        {option.letter}
                      </div>
                      <span className={isSelected ? 'font-semibold' : ''}>
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="flex gap-4">
              {[
                { value: 'A', label: 'True' },
                { value: 'B', label: 'False' }
              ].map((option) => {
                const isSelected = answers[currentQuestion.id] === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
                    className={`flex-1 py-4 px-6 font-semibold border-2 border-black rounded-base transition-all duration-200 ${
                      isSelected ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? colors.purpleLight : colors.white,
                      color: isSelected ? colors.purple : '#6B7280'
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.question_type === 'one_word' && (
            <div>
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => {
                  console.log('One-word input changed:', e.target.value);
                  handleAnswerSelect(currentQuestion.id, e.target.value);
                }}
                placeholder="Type your answer here..."
                className="w-full px-5 py-3 border-2 border-black rounded-base focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                style={{
                  ...(answers[currentQuestion.id] && {
                    backgroundColor: colors.purpleLight
                  })
                }}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-2">Answer is case-insensitive and spaces will be trimmed</p>
            </div>
          )}
        </div>
      </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          Previous
        </Button>

        <div className="flex gap-3">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={() => handleSubmitTest(false)}
              disabled={submitting}
              className="px-8"
              style={{
                backgroundColor: colors.orange,
                color: colors.white
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              style={{
                backgroundColor: colors.purple,
                color: colors.white
              }}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeTestTab;
