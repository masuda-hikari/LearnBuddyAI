// 学習ページ（Q&A）

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import learningApi from '../api/learning';
import type { AskResponse } from '../api/learning';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Learn: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionsToday, setQuestionsToday] = useState(0);

  const dailyLimit = user?.plan === 'free' ? 5 : -1;
  const isLimitReached = dailyLimit !== -1 && questionsToday >= dailyLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading || isLimitReached) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const response: AskResponse = await learningApi.ask({ question: userMessage.content });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setQuestionsToday((prev) => prev + 1);
    } catch (err) {
      console.error('質問エラー:', err);
      setError('回答の取得に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="learn-page">
      <div className="learn-header">
        <h1>AIに質問</h1>
        <p>英語学習に関する質問に何でもお答えします</p>

        {dailyLimit !== -1 && (
          <div className="usage-info">
            <span>
              今日の質問: {questionsToday} / {dailyLimit}
            </span>
            {isLimitReached && (
              <span className="limit-warning">
                制限に達しました。
                <a href="/plans">アップグレード</a>で無制限に
              </span>
            )}
          </div>
        )}
      </div>

      <div className="chat-container">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>学習を始めましょう</h3>
              <p>英語学習に関する質問を入力してください</p>
              <div className="example-questions">
                <h4>質問の例：</h4>
                <ul>
                  <li>「effect」と「affect」の違いは？</li>
                  <li>現在完了形の使い方を教えて</li>
                  <li>ビジネスメールでよく使う表現は？</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="message assistant-message">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLimitReached ? '質問制限に達しました' : '質問を入力...'}
            disabled={isLoading || isLimitReached}
          />
          <button type="submit" disabled={isLoading || !input.trim() || isLimitReached}>
            {isLoading ? '送信中...' : '送信'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Learn;
