// レイアウトコンポーネント

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">LearnBuddyAI</span>
          </Link>

          <nav className="main-nav">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  ダッシュボード
                </Link>
                <Link
                  to="/learn"
                  className={`nav-link ${isActive('/learn') ? 'active' : ''}`}
                >
                  学習
                </Link>
                <Link
                  to="/quiz"
                  className={`nav-link ${isActive('/quiz') ? 'active' : ''}`}
                >
                  クイズ
                </Link>
                <Link
                  to="/plans"
                  className={`nav-link ${isActive('/plans') ? 'active' : ''}`}
                >
                  プラン
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                >
                  ログイン
                </Link>
                <Link
                  to="/register"
                  className={`nav-link ${isActive('/register') ? 'active' : ''}`}
                >
                  登録
                </Link>
              </>
            )}
          </nav>

          {isAuthenticated && user && (
            <div className="user-menu">
              <span className="user-info">
                <span className="user-name">{user.username || user.email}</span>
                <span className={`plan-badge plan-${user.plan}`}>{user.plan}</span>
              </span>
              <button onClick={handleLogout} className="logout-btn">
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 LearnBuddyAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
