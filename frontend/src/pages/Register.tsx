// 登録ページ

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登録に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>新規登録</h1>
          <p>LearnBuddyAIで効率的に学習しましょう</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">名前（任意）</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? '登録中...' : '無料で始める'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            すでにアカウントをお持ちですか？{' '}
            <Link to="/login">ログイン</Link>
          </p>
        </div>

        <div className="auth-notice">
          <p>登録すると、無料プランで以下の機能をご利用いただけます：</p>
          <ul>
            <li>1日5つの質問</li>
            <li>基本レッスン</li>
            <li>学習進捗の記録</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
