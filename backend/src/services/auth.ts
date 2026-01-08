import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService, DbUser } from './database';

/**
 * トークンペイロード型定義
 */
export interface TokenPayload {
  userId: string;
  email: string;
  plan: string;
  type: 'access' | 'refresh';
}

/**
 * トークンペア型定義
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * リフレッシュトークンDB型
 */
interface DbRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked: number;
}

/**
 * 認証サービス - JWT認証の中核
 * 収益化観点：認証システムはサブスクリプション課金の必須基盤
 */
export class AuthService {
  private db = DatabaseService.getInstance().getDb();
  private readonly JWT_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15分
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7日
  private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
  private readonly REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
  private readonly BCRYPT_ROUNDS = 10;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.initializeRefreshTokenTable();
  }

  /**
   * リフレッシュトークンテーブル初期化
   */
  private initializeRefreshTokenTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        revoked INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // インデックス作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    `);
  }

  /**
   * パスワードをハッシュ化（bcrypt使用）
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * パスワードを検証
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * アクセストークン生成
   */
  generateAccessToken(userId: string, email: string, plan: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      plan,
      type: 'access',
    };

    const options: SignOptions = {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256',
    };

    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  /**
   * リフレッシュトークン生成
   */
  async generateRefreshToken(userId: string, email: string, plan: string): Promise<string> {
    const payload: TokenPayload = {
      userId,
      email,
      plan,
      type: 'refresh',
    };

    const options: SignOptions = {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    };

    const token = jwt.sign(payload, this.JWT_SECRET, options);

    // リフレッシュトークンをDBに保存
    const tokenHash = await bcrypt.hash(token, this.BCRYPT_ROUNDS);
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

    this.db
      .prepare(
        `
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(id, userId, tokenHash, expiresAt.toISOString(), now.toISOString());

    return token;
  }

  /**
   * トークンペア生成
   */
  async generateTokenPair(userId: string, email: string, plan: string): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, email, plan);
    const refreshToken = await this.generateRefreshToken(userId, email, plan);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * トークン検証
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload & TokenPayload;
      return {
        userId: decoded.userId,
        email: decoded.email,
        plan: decoded.plan,
        type: decoded.type,
      };
    } catch {
      return null;
    }
  }

  /**
   * アクセストークン検証
   */
  verifyAccessToken(token: string): TokenPayload | null {
    const payload = this.verifyToken(token);
    if (!payload || payload.type !== 'access') {
      return null;
    }
    return payload;
  }

  /**
   * リフレッシュトークン検証
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    const payload = this.verifyToken(token);
    if (!payload || payload.type !== 'refresh') {
      return null;
    }

    // DBに保存されたトークンと照合
    const storedTokens = this.db
      .prepare(
        `
      SELECT * FROM refresh_tokens
      WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
    `
      )
      .all(payload.userId) as DbRefreshToken[];

    // いずれかのトークンと一致するか確認
    for (const storedToken of storedTokens) {
      const isValid = await bcrypt.compare(token, storedToken.token_hash);
      if (isValid) {
        return payload;
      }
    }

    return null;
  }

  /**
   * トークンリフレッシュ
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    // ユーザー情報を最新に取得
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as
      | DbUser
      | undefined;

    if (!user) {
      return null;
    }

    // 古いリフレッシュトークンを無効化
    await this.revokeUserRefreshTokens(payload.userId);

    // 新しいトークンペアを生成
    return this.generateTokenPair(user.id, user.email, user.plan);
  }

  /**
   * ユーザーのリフレッシュトークンを無効化
   */
  async revokeUserRefreshTokens(userId: string): Promise<void> {
    this.db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId);
  }

  /**
   * 特定のリフレッシュトークンを無効化
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    const payload = this.verifyToken(token);
    if (!payload) {
      return false;
    }

    const storedTokens = this.db
      .prepare('SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked = 0')
      .all(payload.userId) as DbRefreshToken[];

    for (const storedToken of storedTokens) {
      const isValid = await bcrypt.compare(token, storedToken.token_hash);
      if (isValid) {
        this.db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(storedToken.id);
        return true;
      }
    }

    return false;
  }

  /**
   * 期限切れトークンのクリーンアップ
   */
  cleanupExpiredTokens(): number {
    const result = this.db
      .prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1")
      .run();
    return result.changes;
  }

  /**
   * ユーザー登録（bcryptハッシュ使用）
   */
  async registerUser(
    username: string,
    email: string,
    password: string
  ): Promise<{ userId: string; tokens: TokenPair }> {
    // メールアドレスの重複チェック
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(password);

    // ユーザー作成
    this.db
      .prepare(
        `
      INSERT INTO users (id, username, email, password_hash, plan, daily_questions_used, created_at)
      VALUES (?, ?, ?, ?, 'free', 0, ?)
    `
      )
      .run(id, username, email, passwordHash, now);

    // 進捗データ初期化
    this.db
      .prepare(
        `
      INSERT INTO user_progress (user_id, total_lessons_completed, total_questions_asked, words_learned, streak)
      VALUES (?, 0, 0, 0, 0)
    `
      )
      .run(id);

    // トークン生成
    const tokens = await this.generateTokenPair(id, email, 'free');

    return { userId: id, tokens };
  }

  /**
   * ログイン認証
   */
  async authenticateUser(
    email: string,
    password: string
  ): Promise<{ userId: string; user: DbUser; tokens: TokenPair } | null> {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | DbUser
      | undefined;

    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.plan);

    return { userId: user.id, user, tokens };
  }

  /**
   * ログアウト（リフレッシュトークン無効化）
   */
  async logout(refreshToken: string): Promise<boolean> {
    return this.revokeRefreshToken(refreshToken);
  }

  /**
   * 全デバイスからログアウト
   */
  async logoutAllDevices(userId: string): Promise<void> {
    await this.revokeUserRefreshTokens(userId);
  }
}
