import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase, type Test, type Question } from '../config/supabase';
import { generateBadgeMetadataUri, mintBadgeNFT } from '../utils/sorobanSimple';

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
          isCorrect = userAnswer.toLowerCase() === question.correct_answer.toLowerCase();
        } else if (question.question_type === 'one_word') {
          // Case-insensitive and trimmed comparison
          isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
        }
        
        if (isCorrect) {
          score += question.points;
        }
      });

      const percentage = totalScore > 0 ? (score / totalScore) * 100 : 0;
      
      // CRITICAL: Check if test is currently active (between start and end time)
      const now = new Date();
      const testStartTime = new Date(test!.start_time);
      const testEndTime = new Date(test!.end_time);
      const isTestActive = now >= testStartTime && now <= testEndTime;
      
      console.log('=== TEST SUBMISSION CHECK ===');
      console.log('Current time:', now.toISOString());
      console.log('Test start:', test!.start_time);
      console.log('Test end:', test!.end_time);
      console.log('Is test ACTIVE?', isTestActive);
      console.log('Score:', score, '/', totalScore, `(${percentage.toFixed(2)}%)`);
      
      // Only pass if test is ACTIVE and score meets threshold
      const passed = isTestActive && percentage >= (test?.pass_score || 70);
      
      console.log('Passed?', passed);
      console.log('Will create badge?', passed);

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
      console.log('✅ Attempt saved to database');

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
      if (passed && isTestActive) {
        console.log('🎖️ Creating badge entry (test is ACTIVE and user PASSED)...');
        
        const { data: badgeData, error: badgeError } = await supabase
          .from('badges')
          .insert([{
            test_id: testId,
            wallet_address: walletAddress,
          }])
          .select()
          .single();

        if (badgeError && !badgeError.message.includes('duplicate')) {
          console.error('❌ Error creating badge:', badgeError);
        } else if (badgeData) {
          console.log('✅ Badge entry created in database');
          
          // Auto-mint the badge NFT immediately
          try {
            console.log('🎖️ Auto-minting NFT badge...');
            
            const metadataUri = await generateBadgeMetadataUri(
              testId,
              walletAddress,
              test!.title,
              score,
              totalScore
            );

            console.log('📝 Metadata URI generated:', metadataUri);

            const mintResult = await mintBadgeNFT(
              walletAddress,
              testId,
              metadataUri
            );

            console.log('✅ Badge NFT auto-minted:', mintResult);

            // Update badge record with blockchain data
            await supabase
              .from('badges')
              .update({
                nft_token_id: mintResult.tokenId,
                mint_tx_hash: mintResult.txHash,
                metadata_url: metadataUri,
              })
              .eq('id', badgeData.id);

            console.log(`🎉 Badge successfully created! Token ID: ${mintResult.tokenId}`);
          } catch (mintError) {
            console.error('⚠️ Auto-mint failed, can mint later from My Badges:', mintError);
          }
        } else if (badgeError?.message.includes('duplicate')) {
          console.log('ℹ️ Badge already exists for this test');
        }
      } else {
        console.log('ℹ️ No badge created - Test is not active or user did not pass');
        if (!isTestActive) {
          console.log('  Reason: Test is not currently active (practice mode)');
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
            backgroundColor: colors.lightPink,
            borderColor: colors.rose,
            color: colors.darkRed,
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
          <h3 className="text-2xl font-bold mb-3" style={{ color: colors.darkRed }}>
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
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg p-8" style={{ borderRadius: '8px' }}>
          <div className="text-center mb-8">
            <div 
              className="w-24 h-24 mx-auto mb-4 flex items-center justify-center font-bold text-2xl"
              style={{
                backgroundColor: result.passed ? colors.lightBlue : colors.lightYellow,
                color: result.passed ? colors.blue : colors.orange,
                borderRadius: '50%'
              }}
            >
              {result.passed ? 'PASS' : isPracticeMode ? 'DONE' : 'FAIL'}
            </div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: colors.darkRed }}>
              {isPracticeMode ? 'Practice Test Complete' : result.passed ? 'Congratulations!' : 'Test Complete'}
            </h2>
            <p className="text-lg text-gray-600">
              {test!.title}
            </p>
            {isPracticeMode && (
              <p className="text-sm mt-2 px-4 py-2" style={{ 
                color: colors.orange,
                backgroundColor: colors.lightYellow,
                borderRadius: '6px'
              }}>
                Practice Mode: This test has ended. No NFT badge awarded for practice attempts.
              </p>
            )}
            {testEndedDuringTest && !isPracticeMode && (
              <p className="text-sm mt-2 px-4 py-2" style={{ 
                color: colors.orange,
                backgroundColor: colors.lightYellow,
                borderRadius: '6px'
              }}>
                The test ended while you were taking it. No badge awarded.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div
              className="p-6 text-center"
              style={{ backgroundColor: colors.lightBlue, borderRadius: '8px' }}
            >
              <p className="text-sm text-gray-600 mb-2">Score</p>
              <p className="text-3xl font-bold" style={{ color: colors.blue }}>
                {result.score}/{result.totalScore}
              </p>
            </div>

            <div
              className="p-6 text-center"
              style={{ backgroundColor: colors.lightYellow, borderRadius: '8px' }}
            >
              <p className="text-sm text-gray-600 mb-2">Percentage</p>
              <p className="text-3xl font-bold" style={{ color: colors.orange }}>
                {result.percentage.toFixed(1)}%
              </p>
            </div>

            <div
              className="p-6 text-center"
              style={{
                backgroundColor: result.passed ? colors.lightMint : colors.lightPink,
                borderRadius: '8px'
              }}
            >
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <p className="text-xl font-bold" style={{ color: result.passed ? '#059669' : colors.darkRed }}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </p>
            </div>
          </div>

          {result.passed && !isPracticeMode && (
            <div
              className="p-6 mb-6 text-center"
              style={{
                backgroundColor: colors.lightMint,
                borderRadius: '8px',
                border: `2px solid #059669`
              }}
            >
              <p className="text-lg font-semibold mb-2" style={{ color: '#059669' }}>
                Badge NFT Earned!
              </p>
              {canMintBadge ? (
                <p className="text-sm text-gray-600">
                  Your badge NFT has been automatically minted on the Stellar blockchain! Check "My Badges" tab to view it.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Note: This test has ended. Badge cannot be awarded for tests that have ended.
                </p>
              )}
            </div>
          )}

          {!result.passed && !testEndedDuringTest && (
            <div
              className="p-6 mb-6 text-center"
              style={{
                backgroundColor: colors.lightYellow,
                borderRadius: '8px'
              }}
            >
              <p className="text-sm text-gray-600">
                You need {test.pass_score}% to pass. Keep practicing!
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              style={{
                backgroundColor: colors.blue,
                borderRadius: '6px'
              }}
            >
              ← Back to Tests
            </button>
          </div>
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
        <div
          className="p-4 mb-4 border-l-4 flex items-center gap-3"
          style={{
            backgroundColor: colors.lightPink,
            borderColor: colors.rose,
            borderRadius: '6px'
          }}
        >
          <div className="text-3xl">⚠️</div>
          <div>
            <p className="font-bold" style={{ color: colors.darkRed }}>
              This test has already ended {testEndedAgo}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              You can still take it for practice, but <strong>no badge will be awarded</strong> for ended tests.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-md p-6 mb-6" style={{ borderRadius: '8px' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: colors.darkRed }}>
              {test.title}
            </h2>
            {test.company && (
              <p className="text-sm text-gray-500">By {test.company}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!wasAlreadyEnded && timeRemaining !== null && timeRemaining > 0 && (
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                <p className="text-lg font-bold" style={{ 
                  color: timeRemaining < 60000 ? colors.rose : timeRemaining < 300000 ? colors.orange : colors.blue 
                }}>
                  {formatTimeRemaining(timeRemaining)}
                </p>
              </div>
            )}
            {wasAlreadyEnded && (
              <div className="px-4 py-2" style={{ backgroundColor: colors.lightYellow, borderRadius: '6px' }}>
                <p className="text-xs text-gray-500">Practice Mode</p>
                <p className="text-sm font-semibold" style={{ color: colors.orange }}>
                  No Time Limit
                </p>
              </div>
            )}
            {testEnded && !wasAlreadyEnded && (
              <div className="px-4 py-2" style={{ backgroundColor: colors.lightPink, borderRadius: '6px' }}>
                <p className="text-xs text-gray-500">Test Ended</p>
                <p className="text-sm font-semibold" style={{ color: colors.darkRed }}>
                  Time's Up
                </p>
              </div>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              style={{ borderRadius: '6px' }}
            >
              ✕ Exit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="w-full bg-gray-200 h-2" style={{ borderRadius: '4px' }}>
            <div
              className="h-2 transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.blue,
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white shadow-md p-8 mb-6" style={{ borderRadius: '8px' }}>
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-4">
            <span
              className="px-3 py-1 text-sm font-bold"
              style={{
                backgroundColor: colors.lightBlue,
                color: colors.blue,
                borderRadius: '6px'
              }}
            >
              Q{currentQuestionIndex + 1}
            </span>
            <h3 className="text-xl font-semibold flex-1" style={{ color: colors.darkRed }}>
              {currentQuestion.question_text}
            </h3>
            <span className="text-sm text-gray-500">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
            </span>
          </div>
        </div>

        {/* Options */}
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
                    className={`w-full text-left p-4 border-2 transition-all duration-200 ${
                      isSelected ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      borderColor: isSelected ? colors.blue : '#E5E7EB',
                      backgroundColor: isSelected ? colors.lightBlue : 'white',
                      borderRadius: '8px'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                        style={{
                          backgroundColor: isSelected ? colors.blue : '#F3F4F6',
                          color: isSelected ? 'white' : '#6B7280'
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
              {['true', 'false'].map((option) => {
                const isSelected = answers[currentQuestion.id]?.toLowerCase() === option.toLowerCase();
                const label = option.charAt(0).toUpperCase() + option.slice(1);

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestion.id, label)}
                    className={`flex-1 py-4 px-6 font-semibold border-2 transition-all duration-200 ${
                      isSelected ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{
                      borderColor: isSelected ? colors.blue : '#E5E7EB',
                      backgroundColor: isSelected ? colors.lightBlue : 'white',
                      borderRadius: '8px',
                      color: isSelected ? colors.blue : '#6B7280'
                    }}
                  >
                    {label}
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
                onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-5 py-3 border-2 border-gray-300 focus:outline-none focus:border-2 transition-colors"
                style={{
                  borderRadius: '8px',
                  ...(answers[currentQuestion.id] && {
                    borderColor: colors.blue,
                    backgroundColor: colors.lightBlue
                  })
                }}
              />
              <p className="text-xs text-gray-500 mt-2">Answer is case-insensitive and spaces will be trimmed</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'white',
            color: colors.blue,
            border: `2px solid ${colors.blue}`,
            borderRadius: '6px'
          }}
        >
          ← Previous
        </button>

        <div className="flex gap-3">
          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={() => handleSubmitTest(false)}
              disabled={submitting}
              className="px-8 py-3 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: colors.orange,
                borderRadius: '6px'
              }}
            >
              {submitting ? '⏳ Submitting...' : '✓ Submit Test'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              style={{
                backgroundColor: colors.blue,
                borderRadius: '6px'
              }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeTestTab;
