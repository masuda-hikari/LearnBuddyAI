// メインアプリケーション

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Quiz from './pages/Quiz';
import Plans from './pages/Plans';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* 公開ルート */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/plans" element={<Plans />} />

              {/* 認証必須ルート */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learn"
                element={
                  <ProtectedRoute>
                    <Learn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ask"
                element={
                  <ProtectedRoute>
                    <Learn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz"
                element={
                  <ProtectedRoute>
                    <Quiz />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
