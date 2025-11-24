import { useState, useEffect } from 'react';
import { colors } from '../config/colors';
import { supabase } from '../config/supabase';
import { getContractExplorerUrl, CONTRACT_IDS } from '../utils/sorobanSimple';
import { registerTestOnBlockchain } from '../utils/realBlockchain';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { AccountStatusBanner } from '../components/AccountStatusBanner';

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

      // Validate correct_answer is within valid range
      const validAnswers = optionsNeeded === 2 ? ['A', 'B'] : optionsNeeded === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
      if (!validAnswers.includes(currentQuestion.correct_answer)) {
        setError(`Correct answer must be one of: ${validAnswers.join(', ')}`);
        return;
      }
    } else if (currentQuestion.question_type === 'true_false') {
      // For true/false, correct_answer should be 'A' (True) or 'B' (False)
      if (!['A', 'B'].includes(currentQuestion.correct_answer)) {
        setError('Please select True or False as the correct answer');
        return;
      }
    } else if (currentQuestion.question_type === 'one_word') {
      // For one_word, option_a should contain the answer and correct_answer should be 'A'
      if (!currentQuestion.option_a || !currentQuestion.option_a.trim()) {
        setError('Please fill in the correct answer');
        return;
      }
      if (currentQuestion.correct_answer !== 'A') {
        setError('One word answer must have correct_answer set to A');
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

    // Validate date/time
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Check if start time is in the past
    if (start < now) {
      setError('Start time cannot be in the past');
      return;
    }
    
    // Check if end time is before start time
    if (end <= start) {
      setError('End time must be after start time');
      return;
    }
    
    // Check if test duration is at least 2 minutes
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 2) {
      setError('Test duration must be at least 2 minutes');
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
          custom_badge_id: customBadgeId || null,
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

      console.log('Questions inserted successfully');

      // Register test on Stellar blockchain
      let blockchainSuccess = false;
      let txHash = '';
      
      try {
        console.log('=== STARTING BLOCKCHAIN REGISTRATION ===');
        console.log('Registering test on Stellar blockchain...');
        const metadataUri = `${testData.id}.json`; // Simplified metadata reference
        
        const blockchainResult = await registerTestOnBlockchain(
          testData.id,
          walletAddress,
          metadataUri
        );

        console.log('✅ SUCCESS: Test registered on blockchain:', blockchainResult);
        console.log(`View on Stellar Explorer: ${getContractExplorerUrl(CONTRACT_IDS.TEST_REGISTRY!)}`);

        blockchainSuccess = true;
        txHash = blockchainResult.txHash;

        // Update test with blockchain metadata and contract address
        try {
          console.log('Updating database with blockchain metadata...');
          const { error: updateError } = await supabase
            .from('tests')
            .update({
              metadata_cid: metadataUri,
              contract_address: CONTRACT_IDS.TEST_REGISTRY,
            })
            .eq('id', testData.id);

          if (updateError) {
            console.error('⚠️ Database update error:', updateError);
          } else {
            console.log('✅ Blockchain metadata updated in database');
          }
        } catch (updateError) {
          console.error('⚠️ Failed to update blockchain metadata in database:', updateError);
          // Non-critical error, blockchain registration still succeeded
        }
        
        console.log('=== BLOCKCHAIN REGISTRATION COMPLETE ===');
        setSuccess(`✅ Test created successfully and registered on Stellar blockchain! Transaction: ${txHash}`);
      } catch (blockchainError: any) {
        console.error('❌ BLOCKCHAIN REGISTRATION FAILED:', blockchainError);
        console.error('Error details:', {
          message: blockchainError.message,
          stack: blockchainError.stack,
          response: blockchainError.response
        });
        
        // Check if it's an account not found error
        if (blockchainError.message && blockchainError.message.includes('Account not found')) {
          setError(`Blockchain Error: ${blockchainError.message}`);
          return; // Don't reset form on account error
        } else {
          // Test was created in database, but blockchain registration failed
          setSuccess('⚠️ Test created successfully in database (blockchain registration failed - you can retry later)');
        }
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
      {/* Account Status Banner */}
      <AccountStatusBanner walletAddress={walletAddress} />
      
      {error && (
        <Card className="mb-4 border-4" style={{ backgroundColor: colors.pinkLight, borderColor: colors.red }}>
          <CardContent className="py-4">
            <p className="font-bold" style={{ color: colors.red }}>{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="mb-4 border-4" style={{ backgroundColor: colors.cyanLight, borderColor: colors.cyan }}>
          <CardContent className="py-4">
            <p className="font-bold" style={{ color: colors.cyan }}>{success}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        {/* Test Details */}
        <Card className="mb-4 border-2 shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: colors.blueLight, borderColor: '#000' }}>
          <CardHeader>
            <CardTitle style={{ color: colors.blue }}>Test Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., JavaScript Fundamentals"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-border bg-background focus:outline-none focus:border-main transition-all duration-200"
                style={{ borderRadius: '5px' }}
                rows={3}
                placeholder="Brief description of the test"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company/Organization</Label>
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <Label>Badge Type</Label>
                <div className="flex gap-2">
                  <select
                    value={customBadgeId}
                    onChange={(e) => setCustomBadgeId(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-border bg-background focus:outline-none focus:border-main transition-all duration-200 font-heading"
                    style={{ borderRadius: '5px' }}
                  >
                    <option value="">Select a badge</option>
                    {customBadges.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.badge_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowBadgeManager(!showBadgeManager)}
                    variant="reverse"
                  >
                    {showBadgeManager ? 'Close' : 'Manage'}
                  </Button>
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
              <Card className="border-2 shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: colors.purpleLight, borderColor: '#000' }}>
                <CardHeader>
                  <CardTitle style={{ color: colors.purple }}>Manage Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {customBadges.map((badge) => (
                      <Card key={badge.id} className="border-2 shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.5)]" style={{ borderColor: '#000' }}>
                        <CardContent className="p-3">
                          <div
                            className="h-24 flex items-center justify-center mb-2 bg-background"
                            style={{ borderRadius: '5px' }}
                          >
                            <img
                              src={badge.svg_url}
                              alt={badge.badge_name}
                              className="max-w-full max-h-full"
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                          <p className="text-xs font-bold text-center mb-1 truncate" style={{ color: colors.purple }}>
                            {badge.badge_name}
                          </p>
                          <Button
                            type="button"
                            onClick={() => handleDeleteBadge(badge.id, badge.svg_url)}
                            disabled={loading}
                            variant="reverse"
                            className="w-full text-xs py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[-2px_-2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150"
                          >
                            Delete
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Pass Score (%) *</Label>
                <Input
                  type="number"
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div>
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              <div>
                <Label>End Date *</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Add Question */}
        <Card className="mb-4 border-2 shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: colors.cyanLight, borderColor: '#000' }}>
          <CardHeader>
            <CardTitle style={{ color: colors.cyan }}>Add Question</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label>Question Text</Label>
              <Input
                type="text"
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                placeholder="Enter your question"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Question Type *</Label>
                <select
                  value={currentQuestion.question_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'multiple_choice' | 'true_false' | 'one_word';
                    setCurrentQuestion({
                      ...currentQuestion,
                      question_type: newType,
                      // For all question types, correct_answer should be A, B, C, or D
                      correct_answer: 'A',
                      // For true_false, set option_a='True' and option_b='False'
                      option_a: newType === 'true_false' ? 'True' : currentQuestion.option_a,
                      option_b: newType === 'true_false' ? 'False' : currentQuestion.option_b,
                      // Reset num_options to 4 when switching to multiple_choice
                      num_options: newType === 'multiple_choice' ? 4 : currentQuestion.num_options
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-border bg-background focus:outline-none focus:border-main transition-all duration-200 font-heading"
                  style={{ borderRadius: '5px' }}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="one_word">One Word Answer</option>
                </select>
              </div>

              {currentQuestion.question_type === 'multiple_choice' && (
                <div>
                  <Label>Number of Options *</Label>
                  <select
                    value={currentQuestion.num_options || 4}
                    onChange={(e) => {
                      const newNum = parseInt(e.target.value) as 2 | 3 | 4;
                      const validAnswers = newNum === 2 ? ['A', 'B'] : newNum === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
                      const currentAnswer = currentQuestion.correct_answer;
                      
                      setCurrentQuestion({
                        ...currentQuestion,
                        num_options: newNum,
                        // Reset correct_answer to 'A' if current answer is no longer valid
                        correct_answer: validAnswers.includes(currentAnswer) ? currentAnswer : 'A'
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-border bg-background focus:outline-none focus:border-main transition-all duration-200 font-heading"
                    style={{ borderRadius: '5px' }}
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
                    <Label>Option A</Label>
                    <Input
                      type="text"
                      value={currentQuestion.option_a}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                      placeholder="Option A"
                    />
                  </div>

                  <div>
                    <Label>Option B</Label>
                    <Input
                      type="text"
                      value={currentQuestion.option_b}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                      placeholder="Option B"
                    />
                  </div>

                  {(currentQuestion.num_options || 4) >= 3 && (
                    <div>
                      <Label>Option C</Label>
                      <Input
                        type="text"
                        value={currentQuestion.option_c || ''}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                        placeholder="Option C"
                      />
                    </div>
                  )}

                  {(currentQuestion.num_options || 4) === 4 && (
                    <div>
                      <Label>Option D</Label>
                      <Input
                        type="text"
                        value={currentQuestion.option_d || ''}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                        placeholder="Option D"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Correct Answer</Label>
                    <select
                      value={currentQuestion.correct_answer}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-border bg-background focus:outline-none focus:border-main transition-all duration-200 font-heading"
                      style={{ borderRadius: '5px' }}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      {(currentQuestion.num_options || 4) >= 3 && <option value="C">C</option>}
                      {(currentQuestion.num_options || 4) === 4 && <option value="D">D</option>}
                    </select>
                  </div>

                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
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
                    <Label>Correct Answer *</Label>
                    <div className="flex gap-3 mt-2">
                      <Button
                        type="button"
                        onClick={() => setCurrentQuestion({ ...currentQuestion, correct_answer: 'A', option_a: 'True', option_b: 'False' })}
                        variant={currentQuestion.correct_answer === 'A' ? 'default' : 'neutral'}
                        className="flex-1"
                        style={{
                          backgroundColor: currentQuestion.correct_answer === 'A' ? colors.cyanLight : undefined,
                          borderColor: currentQuestion.correct_answer === 'A' ? colors.cyan : undefined,
                          color: currentQuestion.correct_answer === 'A' ? colors.cyan : undefined
                        }}
                      >
                        True
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setCurrentQuestion({ ...currentQuestion, correct_answer: 'B', option_a: 'True', option_b: 'False' })}
                        variant={currentQuestion.correct_answer === 'B' ? 'default' : 'neutral'}
                        className="flex-1"
                        style={{
                          backgroundColor: currentQuestion.correct_answer === 'B' ? colors.redLight : undefined,
                          borderColor: currentQuestion.correct_answer === 'B' ? colors.red : undefined,
                          color: currentQuestion.correct_answer === 'B' ? colors.red : undefined
                        }}
                      >
                        False
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      min="1"
                    />
                  </div>
                </div>
              </>
            )}

            {currentQuestion.question_type === 'one_word' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Correct Answer *</Label>
                    <Input
                      type="text"
                      value={currentQuestion.option_a}
                      onChange={(e) => setCurrentQuestion({ 
                        ...currentQuestion, 
                        option_a: e.target.value,
                        correct_answer: 'A' // Always set to 'A' for one_word type
                      })}
                      placeholder="Enter the correct answer"
                    />
                    <p className="text-xs text-gray-500 mt-1 font-heading">Answer will be case-insensitive and trimmed</p>
                  </div>

                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      min="1"
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="button"
              onClick={addQuestion}
              className="w-full"
              style={{ backgroundColor: colors.orangeLight, borderColor: colors.orange, color: colors.orange }}
            >
              Add Question
            </Button>
          </CardContent>
        </Card>


        {/* Questions List */}
        {questions.length > 0 && (
          <Card className="mb-4 border-2 shadow-[-4px_-4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: colors.yellowLight, borderColor: '#000' }}>
            <CardHeader>
              <CardTitle style={{ color: colors.yellow }}>Questions ({questions.length})</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {questions.map((q, index) => (
                <Card key={index} className="border-2 shadow-[-2px_-2px_0px_0px_rgba(0,0,0,0.5)]" style={{ borderColor: '#000' }}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold mb-1 text-sm" style={{ color: colors.yellow }}>
                          {index + 1}. {q.question_text}
                        </p>
                        <div className="text-sm text-gray-700 space-y-1 font-heading">
                          {q.question_type === 'multiple_choice' && (
                            <>
                              <p>A: {q.option_a}</p>
                              <p>B: {q.option_b}</p>
                              {q.option_c && <p>C: {q.option_c}</p>}
                              {q.option_d && <p>D: {q.option_d}</p>}
                            </>
                          )}
                          {q.question_type === 'true_false' && (
                            <>
                              <p>A: {q.option_a}</p>
                              <p>B: {q.option_b}</p>
                            </>
                          )}
                          {q.question_type === 'one_word' && (
                            <p>Answer: {q.option_a}</p>
                          )}
                          <p className="font-bold mt-2" style={{ color: colors.blue }}>
                            Correct: {
                              q.question_type === 'one_word' 
                                ? q.option_a 
                                : q.question_type === 'true_false'
                                  ? (q.correct_answer === 'A' ? 'True' : 'False')
                                  : q.correct_answer
                            } | Points: {q.points}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        variant="reverse"
                        className="ml-4"
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[-6px_-6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[12px] active:translate-y-[12px] transition-all duration-150"
          style={{ 
            backgroundColor: colors.pinkLight, 
            borderColor: colors.pink, 
            color: colors.pink 
          }}
        >
          {loading ? 'Creating Test...' : 'Create Test'}
        </Button>
      </form>
    </div>
  );
};

export default CreateTestTab;
