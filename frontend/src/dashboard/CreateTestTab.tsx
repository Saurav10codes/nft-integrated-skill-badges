import { useState } from 'react';
import { colors } from '../config/colors';
import { supabase } from '../config/supabase';

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
}

interface CreateTestTabProps {
  walletAddress: string;
}

const CreateTestTab = ({ walletAddress }: CreateTestTabProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [passScore, setPassScore] = useState(70);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
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

  const addQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.option_a ||
        !currentQuestion.option_b || !currentQuestion.option_c || !currentQuestion.option_d) {
      setError('Please fill in all question fields');
      return;
    }

    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({
      question_text: '',
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

      // Insert test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{
          creator_wallet: walletAddress,
          title,
          description,
          company,
          difficulty,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          pass_score: passScore
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Insert questions
      const questionsToInsert = questions.map(q => ({
        test_id: testData.id,
        ...q
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      setSuccess('Test created successfully!');

      // Reset form
      setTitle('');
      setDescription('');
      setCompany('');
      setDifficulty('medium');
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
          className="p-4 mb-4 border-l-4"
          style={{
            backgroundColor: colors.lightPink,
            borderColor: colors.rose,
            color: colors.darkRed,
            borderRadius: '6px'
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="p-4 mb-4 border-l-4"
          style={{
            backgroundColor: colors.lightMint,
            borderColor: '#059669',
            color: '#059669',
            borderRadius: '6px'
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Test Details */}
        <div
          className="bg-white shadow-md p-6 mb-6"
          style={{ borderRadius: '8px' }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
            Test Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span style={{ color: colors.rose }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                placeholder="e.g., JavaScript Fundamentals"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                rows={3}
                placeholder="Brief description of the test"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pass Score (%) <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="number"
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date <span style={{ color: colors.rose }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Question */}
        <div
          className="bg-white shadow-md p-6 mb-6"
          style={{ borderRadius: '8px' }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
            Add Question
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question Text
              </label>
              <input
                type="text"
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                placeholder="Enter your question"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Option A
                </label>
                <input
                  type="text"
                  value={currentQuestion.option_a}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  placeholder="Option A"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Option B
                </label>
                <input
                  type="text"
                  value={currentQuestion.option_b}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  placeholder="Option B"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Option C
                </label>
                <input
                  type="text"
                  value={currentQuestion.option_c}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  placeholder="Option C"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Option D
                </label>
                <input
                  type="text"
                  value={currentQuestion.option_d}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  placeholder="Option D"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correct Answer
                </label>
                <select
                  value={currentQuestion.correct_answer}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-2"
                  style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
                  min="1"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="w-full text-white font-semibold py-3 px-6 shadow-md hover:shadow-lg transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.lightBlue} 100%)`,
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
            className="bg-white shadow-md p-6 mb-6"
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
                    <p className="font-semibold mb-2" style={{ color: colors.darkRed }}>
                      {index + 1}. {q.question_text}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>A: {q.option_a}</p>
                      <p>B: {q.option_b}</p>
                      <p>C: {q.option_c}</p>
                      <p>D: {q.option_d}</p>
                      <p className="font-semibold mt-2" style={{ color: colors.blue }}>
                        Correct: {q.correct_answer} | Points: {q.points}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="ml-4 px-3 py-1 text-white font-semibold text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${colors.darkRed} 0%, ${colors.rose} 100%)`,
                      borderRadius: '4px'
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
          className="w-full text-white font-semibold py-4 px-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.gold} 100%)`,
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
