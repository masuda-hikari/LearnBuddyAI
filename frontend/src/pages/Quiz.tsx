// クイズページ

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import learningApi from '../api/learning';
import type { Quiz as QuizType, QuizSubmitResponse } from '../api/learning';

const QUIZ_TOPICS = [
  { id: 'vocabulary', name: '語彙', icon: '📝' },
  { id: 'grammar', name: '文法', icon: '📖' },
  { id: 'idioms', name: 'イディオム', icon: '💬' },
  { id: 'business', name: 'ビジネス英語', icon: '💼' },
];

const Quiz: React.FC = () => {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const fetchQuiz = async (topic: string) => {
    setIsLoading(true);
    setError('');
    setSelectedAnswer(null);
    setResult(null);

    try {
      const data = await learningApi.getQuiz(topic);
      setQuiz(data);
    } catch (err) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    fetchQuiz(topic);
  };

  const handleAnswerSelect = (index: number) => {
    if (result !== null) return; // 既に回答済み
    setSelectedAnswer(index);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !quiz) return;

    setIsLoading(true);
    try {
      const response = await learningApi.submitQuiz({
        quizId: quiz.id,
        answer: selectedAnswer,
      });

      setResult(response);
      setScore((prev) => ({
        correct: prev.correct + (response.correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error('回答送信エラー:', err);
      setError('回答の送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuiz = () => {
    if (selectedTopic) {
      fetchQuiz(selectedTopic);
    }
  };

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <h1>クイズ</h1>
        <p>知識をテストして、学習を深めましょう</p>

        {score.total > 0 && (
          <div className="score-display">
            スコア: {score.correct} / {score.total} (
            {Math.round((score.correct / score.total) * 100)}%)
          </div>
        )}
      </div>

      {!selectedTopic ? (
        <div className="topic-selection">
          <h2>トピックを選択</h2>
          <div className="topics-grid">
            {QUIZ_TOPICS.map((topic) => (
              <button
                key={topic.id}
                className="topic-card"
                onClick={() => handleTopicSelect(topic.id)}
              >
                <span className="topic-icon">{topic.icon}</span>
                <span className="topic-name">{topic.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="quiz-container">
          <div className="quiz-topic-info">
            <button className="back-btn" onClick={() => setSelectedTopic(null)}>
              ← トピック選択に戻る
            </button>
            <span className="current-topic">
              {QUIZ_TOPICS.find((t) => t.id === selectedTopic)?.name}
            </span>
          </div>

          {error && <div className="error-message">{error}</div>}

          {isLoading && !quiz ? (
            <div className="loading">クイズを読み込み中...</div>
          ) : quiz ? (
            <div className="quiz-card">
              <div className="quiz-question">
                <h3>{quiz.question}</h3>
              </div>

              <div className="quiz-options">
                {quiz.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-btn ${
                      selectedAnswer === index ? 'selected' : ''
                    } ${
                      result !== null
                        ? index === result.correctAnswer
                          ? 'correct'
                          : selectedAnswer === index
                          ? 'incorrect'
                          : ''
                        : ''
                    }`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={result !== null}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                  </button>
                ))}
              </div>

              {result === null ? (
                <button
                  className="btn btn-primary submit-btn"
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null || isLoading}
                >
                  {isLoading ? '送信中...' : '回答する'}
                </button>
              ) : (
                <div className="quiz-result">
                  <div
                    className={`result-banner ${result.correct ? 'correct' : 'incorrect'}`}
                  >
                    {result.correct ? '🎉 正解！' : '❌ 不正解'}
                  </div>

                  <div className="explanation">
                    <h4>解説</h4>
                    <p>{result.explanation}</p>
                  </div>

                  <button className="btn btn-primary" onClick={handleNextQuiz}>
                    次の問題
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {user?.plan === 'free' && (
        <div className="upgrade-hint">
          <p>
            Premiumプランでは、より多くのクイズと詳細な分析が利用できます。
            <a href="/plans">アップグレード</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default Quiz;
