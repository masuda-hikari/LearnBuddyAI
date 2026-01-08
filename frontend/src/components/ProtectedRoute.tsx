// 認証ガード付きルート

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPlan?: 'premium' | 'education';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPlan }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // プラン制限チェック
  if (requiredPlan && user) {
    const planHierarchy = ['free', 'premium', 'education'];
    const userPlanIndex = planHierarchy.indexOf(user.plan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

    if (userPlanIndex < requiredPlanIndex) {
      return <Navigate to="/plans" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
