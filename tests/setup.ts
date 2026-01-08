/**
 * テスト用セットアップ
 * インメモリSQLiteデータベースを使用
 */

// テスト用環境変数設定（モジュール読み込み前に設定必須）
process.env.DATABASE_URL = ':memory:';
process.env.FREE_DAILY_QUESTIONS = '5';
process.env.NODE_ENV = 'test';

import { DatabaseService } from '../backend/src/services/database';

// 各テストファイルの実行前にDBをリセット
beforeEach(() => {
  DatabaseService.resetForTest();
});

// 全テスト終了後にクリーンアップ
afterAll(() => {
  DatabaseService.resetForTest();
});
