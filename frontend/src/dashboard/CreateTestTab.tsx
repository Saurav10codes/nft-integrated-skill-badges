import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase } from '../config/supabase';
import { registerTestOnChain, generateTestMetadataUri, getContractExplorerUrl, CONTRACT_IDS } from '../utils/sorobanSimple';

interface Question {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'one_word';
  num_options?: 4 | 3 | 2; // For multiple choice
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  points: number;
}

interface CustomBadge {
  id: string;
  badge_name: string;
  svg_url: string;
  is_default?: boolean;
}

interface CreateTestTabProps {
  walletAddress: string;
}

const CreateTestTab = ({ walletAddress }: CreateTestTabProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [badgeType, setBadgeType] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [customBadgeId, setCustomBadgeId] = useState<string>('');
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [passScore, setPassScore] = useState(70);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    question_type: 'multiple_choice',
    num_options: 4,
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    points: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user's custom badges
  useEffect(() => {
    fetchUserBadges();
  }, [walletAddress]);

  const fetchUserBadges = async () => {
    try {
      // Get user ID from wallet address
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userData) {
        // Fetch ALL badges (default + custom)
        const { data: badgesData } = await supabase
          .from('custom_badges')
          .select('id, badge_name, svg_url, is_default')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false });

        setCustomBadges(badgesData || []);
      }
    } catch (err) {
      console.error('Error fetching custom badges:', err);
    }
  };

  const handleDeleteBadge = async (badgeId: string, svgUrl: string) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;

    try {
      setLoading(true);
      setError('');

      // Extract file path from URL if it's from storage (not data URL)
      if (svgUrl.startsWith('http')) {
        const urlParts = svgUrl.split('/stellar/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('stellar').remove([filePath]);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('custom_badges')
        .delete()
        .eq('id', badgeId);

      if (deleteError) throw deleteError;

      setSuccess('Badge deleted successfully');
      
      // Refresh badges
      await fetchUserBadges();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting badge:', err);
      setError(err.message || 'Failed to delete badge');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    // Validate based on question type
    if (!currentQuestion.question_text) {
      setError('Please fill in question text');
      return;
    }

    if (currentQuestion.question_type === 'multiple_choice') {
      const optionsNeeded = currentQuestion.num_options || 4;
      const options = [currentQuestion.option_a, currentQuestion.option_b];
      if (optionsNeeded >= 3) options.push(currentQuestion.option_c || '');
      if (optionsNeeded === 4) options.push(currentQuestion.option_d || '');
      
      if (options.some(opt => !opt)) {
        setError(`Please fill in all ${optionsNeeded} option fields`);
        return;
      }
    } else if (currentQuestion.question_type === 'true_false') {
      if (!currentQuestion.correct_answer || !['true', 'false'].includes(currentQuestion.correct_answer.toLowerCase())) {
        setError('Please select True or False as the correct answer');
        return;
      }
    } else if (currentQuestion.question_type === 'one_word') {
      if (!currentQuestion.correct_answer) {
        setError('Please fill in the correct answer');
        return;
      }
    }

    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      num_options: 4,
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      points: 1
    });
    setError('');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    try {
      setLoading(true);

      // Insert test into Supabase
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{
          creator_wallet: walletAddress,
          title,
          description,
          company,
          difficulty: badgeType,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          pass_score: passScore,
          total_questions: questions.length
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Insert questions
      const questionsToInsert = questions.map(q => ({
        test_id: testData.id,
        ...q
      }));

      console.log('=== INSERTING QUESTIONS ===');
      console.log('Test ID:', testData.id);
      console.log('Questions to insert:', questionsToInsert.length);
      console.log('Questions data:', questionsToInsert);

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error inserting questions:', questionsError);
        throw questionsError;
      }

      console.log('✅ Questions inserted successfully');

      // Register test on Stellar blockchain
      try {
        console.log('🚀 Registering test on Stellar blockchain...');
        const metadataUri = generateTestMetadataUri(testData.id, testData);
        const blockchainResult = await registerTestOnChain(
          testData.id,
          walletAddress,
          metadataUri
        );

        console.log('✅ Test registered on blockchain:', blockchainResult);
        console.log(`📝 View on Stellar Explorer: ${getContractExplorerUrl(CONTRACT_IDS.TEST_REGISTRY!)}`);

        // Update test with blockchain metadata
        await supabase
          .from('tests')
          .update({
            metadata_cid: metadataUri,
            // You could also store the transaction hash if you add a column
          })
          .eq('id', testData.id);

        setSuccess(`Test created successfully and registered on Stellar blockchain! Transaction: ${blockchainResult.txHash}`);
      } catch (blockchainError: any) {
        console.error('⚠️ Failed to register on blockchain:', blockchainError);
        setSuccess('Test created successfully in database (blockchain registration failed - you can retry later)');
      }

      // Reset form
      setTitle('');
      setDescription('');
      setCompany('');
      setBadgeType('medium');
      setPassScore(70);
      setStartTime('');
      setEndTime('');
      setQuestions([]);
    } catch (err: any) {
      console.error('Error creating test:', err);
      setError(err.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {error && (
        <div
          className="p-5 mb-5 border-l-4 shadow-sm"
          style={{
            backgroundColor: colors.lightPink,
            borderColor: colors.rose,
            color: colors.darkRed,
            borderRadius: '16px'
          }}
        >
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div
          className="p-5 mb-5 border-l-4 shadow-sm"
          style={{
            backgroundColor: colors.lightMint,
            borderColor: '#059669',
            color: '#059669',
            borderRadius: '16px'
          }}
        >
          <p className="font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Test Details */}
        <div
          className="bg-white shadow-sm p-6 mb-4"
          style={{ borderRadius: '8px', border: `1px solid ${colors.lightBlue}` }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
            Test Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span style={{ color: colors.rose }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                placeholder="e.g., JavaScript Fundamentals"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                rows={3}
                placeholder="Brief description of the test"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                  style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Badge Type
                </label>
                <div className="flex gap-2">
                  <select
                    value={customBadgeId}
                    onChange={(e) => setCustomBadgeId(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                    style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  >
                    <option value="">Select a badge</option>
                    {customBadges.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.badge_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowBadgeManager(!showBadgeManager)}
                    className="px-4 py-2.5 text-white font-medium shadow-sm hover:shadow-md transition-all"
                    style={{
                      backgroundColor: colors.rose,
                      borderRadius: '6px'
                    }}
                    title="Manage Badges"
                  >
                    {showBadgeManager ? 'Close' : 'Manage'}
                  </button>
                </div>
                {customBadges.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No badges found. Default badges will be created on first login.
                  </p>
                )}
              </div>
            </div>

            {/* Badge Manager Section */}
            {showBadgeManager && customBadges.length > 0 && (
              <div
                className="p-4 mb-4"
                style={{ backgroundColor: colors.cream, borderRadius: '6px', border: `1px solid ${colors.lightBlue}` }}
              >
                <h4 className="text-lg font-bold mb-3" style={{ color: colors.darkRed }}>
                  Manage Badges
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {customBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-white p-3 border shadow-sm"
                      style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                    >
                      <div
                        className="h-24 flex items-center justify-center mb-2"
                        style={{ backgroundColor: colors.cream, borderRadius: '4px' }}
                      >
                        <img
                          src={badge.svg_url}
                          alt={badge.badge_name}
                          className="max-w-full max-h-full"
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                      <p className="text-xs font-medium text-center mb-1 truncate" style={{ color: colors.darkRed }}>
                        {badge.badge_name}
                      </p>
                      {badge.is_default ? (
                        <p className="text-xs text-center text-gray-400">Default</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteBadge(badge.id, badge.svg_url)}
                          disabled={loading}
                          className="w-full text-white font-medium py-1.5 px-2 text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                          style={{
                            backgroundColor: colors.rose,
                            borderRadius: '4px'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pass Score (%) <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="number"
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                  style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Start Date <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                  style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                  style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Question */}
        <div
          className="bg-white shadow-sm p-6 mb-4"
          style={{ borderRadius: '8px', border: `1px solid ${colors.lightYellow}` }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
            Add Question
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Question Text
              </label>
              <input
                type="text"
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-yellow-400 transition-colors"
                style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                placeholder="Enter your question"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Question Type <span style={{ color: colors.rose }}>*</span>
                </label>
                <select
                  value={currentQuestion.question_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'multiple_choice' | 'true_false' | 'one_word';
                    setCurrentQuestion({
                      ...currentQuestion,
                      question_type: newType,
                      correct_answer: newType === 'true_false' ? 'true' : newType === 'one_word' ? '' : 'A'
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                  style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="one_word">One Word Answer</option>
                </select>
              </div>

              {currentQuestion.question_type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Number of Options <span style={{ color: colors.rose }}>*</span>
                  </label>
                  <select
                    value={currentQuestion.num_options || 4}
                    onChange={(e) => {
                      const newNum = parseInt(e.target.value) as 2 | 3 | 4;
                      setCurrentQuestion({
                        ...currentQuestion,
                        num_options: newNum
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-pink-400 transition-colors"
                    style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                  >
                    <option value="2">2 Options</option>
                    <option value="3">3 Options</option>
                    <option value="4">4 Options</option>
                  </select>
                </div>
              )}
            </div>

            {currentQuestion.question_type === 'multiple_choice' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Option A
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.option_a}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                      placeholder="Option A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Option B
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.option_b}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                      placeholder="Option B"
                    />
                  </div>

                  {(currentQuestion.num_options || 4) >= 3 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Option C
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.option_c || ''}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                        style={{ borderRadius: '6px' }}
                        placeholder="Option C"
                      />
                    </div>
                  )}

                  {(currentQuestion.num_options || 4) === 4 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Option D
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.option_d || ''}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                        style={{ borderRadius: '6px' }}
                        placeholder="Option D"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Correct Answer
                    </label>
                    <select
                      value={currentQuestion.correct_answer}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      {(currentQuestion.num_options || 4) >= 3 && <option value="C">C</option>}
                      {(currentQuestion.num_options || 4) === 4 && <option value="D">D</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Points
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                      min="1"
                    />
                  </div>
                </div>
              </>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Correct Answer <span style={{ color: colors.rose }}>*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion({ ...currentQuestion, correct_answer: 'true' })}
                        className={`flex-1 py-2.5 px-4 font-medium transition-all ${
                          currentQuestion.correct_answer === 'true'
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{
                          borderRadius: '6px',
                          ...(currentQuestion.correct_answer === 'true' && {
                            backgroundColor: colors.blue
                          })
                        }}
                      >
                        True
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion({ ...currentQuestion, correct_answer: 'false' })}
                        className={`flex-1 py-2.5 px-4 font-medium transition-all ${
                          currentQuestion.correct_answer === 'false'
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{
                          borderRadius: '6px',
                          ...(currentQuestion.correct_answer === 'false' && {
                            backgroundColor: colors.rose
                          })
                        }}
                      >
                        False
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Points
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                      min="1"
                    />
                  </div>
                </div>
              </>
            )}

            {currentQuestion.question_type === 'one_word' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Correct Answer <span style={{ color: colors.rose }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.correct_answer}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 focus:outline-none focus:border-yellow-300 transition-colors"
                      style={{ borderRadius: '6px', backgroundColor: colors.cream }}
                      placeholder="Enter the correct answer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Answer will be case-insensitive and trimmed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Points
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                      style={{ borderRadius: '6px' }}
                      min="1"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={addQuestion}
              className="w-full text-white font-medium py-2.5 px-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              style={{
                backgroundColor: colors.pink,
                borderRadius: '6px'
              }}
            >
              Add Question
            </button>
          </div>
        </div>

        {/* Questions List */}
        {questions.length > 0 && (
          <div
            className="bg-white shadow-md p-6 mb-4"
            style={{ borderRadius: '8px' }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
              Questions ({questions.length})
            </h3>

            <div className="space-y-3">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="p-4 flex justify-between items-start"
                  style={{ backgroundColor: colors.cream, borderRadius: '6px' }}
                >
                  <div className="flex-1">
                    <p className="font-medium mb-1.5" style={{ color: colors.darkRed }}>
                      {index + 1}. {q.question_text}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>A: {q.option_a}</p>
                      <p>B: {q.option_b}</p>
                      <p>C: {q.option_c}</p>
                      <p>D: {q.option_d}</p>
                      <p className="font-medium mt-2" style={{ color: colors.blue }}>
                        Correct: {q.correct_answer} | Points: {q.points}
                      </p>
                    </div>
                  </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="ml-4 px-3 py-1 text-white font-medium text-sm shadow-sm hover:shadow-md transition-all"
                      style={{
                        backgroundColor: colors.rose,
                        borderRadius: '6px'
                      }}
                    >
                      Remove
                    </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full text-white font-medium py-3 px-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.blue,
            borderRadius: '6px'
          }}
        >
          {loading ? 'Creating Test...' : 'Create Test'}
        </button>
      </form>
    </div>
  );
};

export default CreateTestTab;
