// 学習API

import apiClient from './client';

// Q&A
export interface AskRequest {
  question: string;
  context?: string;
}

export interface AskResponse {
  answer: string;
  sources?: string[];
}

// クイズ
export interface Quiz {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizSubmitRequest {
  quizId: string;
  answer: number;
}

export interface QuizSubmitResponse {
  correct: boolean;
  correctAnswer: number;
  explanation: string;
}

// レッスン
export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  completed?: boolean;
}

// 進捗
export interface Progress {
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  correctQuizzes: number;
  streakDays: number;
  lastStudyDate: string;
}

export const learningApi = {
  // Q&A
  async ask(data: AskRequest): Promise<AskResponse> {
    const response = await apiClient.post('/api/ask', data);
    return response.data;
  },

  // クイズ取得
  async getQuiz(topic: string): Promise<Quiz> {
    const response = await apiClient.get(`/api/quiz/${topic}`);
    return response.data;
  },

  // クイズ回答
  async submitQuiz(data: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const response = await apiClient.post('/api/quiz/submit', data);
    return response.data;
  },

  // レッスン一覧
  async getLessons(): Promise<Lesson[]> {
    const response = await apiClient.get('/api/lessons');
    return response.data;
  },

  // レッスン詳細
  async getLesson(id: string): Promise<Lesson> {
    const response = await apiClient.get(`/api/lessons/${id}`);
    return response.data;
  },

  // レッスン完了
  async completeLesson(id: string): Promise<void> {
    await apiClient.post(`/api/lessons/${id}/complete`);
  },

  // 進捗取得
  async getProgress(): Promise<Progress> {
    const response = await apiClient.get('/api/users/progress');
    return response.data;
  },
};

export default learningApi;
