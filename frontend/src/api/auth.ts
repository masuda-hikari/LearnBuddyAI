// 認証API

import apiClient from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    plan: string;
    createdAt: string;
  };
}

export const authApi = {
  // ユーザー登録
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  // ログイン
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/login', data);
    return response.data;
  },

  // ログアウト
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    await apiClient.post('/api/auth/logout', { refreshToken });
  },

  // トークンリフレッシュ
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },
};

export default authApi;
