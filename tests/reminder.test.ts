import { ReminderService } from '../backend/src/services/reminder';
import { UserService } from '../backend/src/services/user';

describe('ReminderService', () => {
  let reminderService: ReminderService;
  let userService: UserService;
  let testUserId: string;

  beforeEach(async () => {
    reminderService = new ReminderService();
    userService = new UserService();

    // テスト用ユーザー作成
    const user = await userService.register(
      'remindertest',
      `remindertest${Date.now()}@example.com`,
      'password'
    );
    testUserId = user.id;
  });

  describe('getSettings / updateSettings', () => {
    it('新規ユーザーのデフォルト設定を作成できる', async () => {
      const settings = await reminderService.updateSettings(testUserId, {});

      expect(settings.userId).toBe(testUserId);
      expect(settings.enabled).toBe(true);
      expect(settings.preferredTime).toBe('09:00');
      expect(settings.timezone).toBe('Asia/Tokyo');
      expect(settings.frequency).toBe('daily');
      expect(settings.lastReminderSent).toBeNull();
    });

    it('リマインダー設定を更新できる', async () => {
      // まず作成
      await reminderService.updateSettings(testUserId, {});

      // 更新
      const updated = await reminderService.updateSettings(testUserId, {
        enabled: false,
        preferredTime: '18:00',
        frequency: 'weekdays',
      });

      expect(updated.enabled).toBe(false);
      expect(updated.preferredTime).toBe('18:00');
      expect(updated.frequency).toBe('weekdays');
    });

    it('getSettingsで設定を取得できる', async () => {
      await reminderService.updateSettings(testUserId, { preferredTime: '12:00' });

      const settings = await reminderService.getSettings(testUserId);

      expect(settings).not.toBeNull();
      expect(settings?.preferredTime).toBe('12:00');
    });

    it('存在しないユーザーの設定はnullを返す', async () => {
      const settings = await reminderService.getSettings('nonexistent-user');

      expect(settings).toBeNull();
    });
  });

  describe('学習セッション管理', () => {
    it('セッションを開始できる', async () => {
      const session = await reminderService.startSession(testUserId, false);

      expect(session.userId).toBe(testUserId);
      expect(session.startedAt).toBeDefined();
      expect(session.endedAt).toBeNull();
      expect(session.wordsReviewed).toBe(0);
      expect(session.quizCompleted).toBe(0);
      expect(session.fromReminder).toBe(false);
    });

    it('リマインダーからのセッション開始を記録できる', async () => {
      const session = await reminderService.startSession(testUserId, true);

      expect(session.fromReminder).toBe(true);
    });

    it('セッションを更新できる', async () => {
      const session = await reminderService.startSession(testUserId, false);

      await reminderService.updateSession(session.id, { wordsReviewed: 5 });
      await reminderService.updateSession(session.id, { quizCompleted: 2 });

      const sessions = await reminderService.getRecentSessions(testUserId, 1);
      expect(sessions[0].wordsReviewed).toBe(5);
      expect(sessions[0].quizCompleted).toBe(2);
    });

    it('セッションを終了できる', async () => {
      const session = await reminderService.startSession(testUserId, false);

      await reminderService.endSession(session.id);

      const sessions = await reminderService.getRecentSessions(testUserId, 1);
      expect(sessions[0].endedAt).not.toBeNull();
    });

    it('最近のセッションを取得できる', async () => {
      await reminderService.startSession(testUserId, false);
      await reminderService.startSession(testUserId, true);
      await reminderService.startSession(testUserId, false);

      const sessions = await reminderService.getRecentSessions(testUserId, 2);

      expect(sessions.length).toBe(2);
    });
  });

  describe('getLearningStatus', () => {
    it('学習状況サマリーを取得できる', async () => {
      const status = await reminderService.getLearningStatus(testUserId);

      expect(status.dueWordsCount).toBeDefined();
      expect(status.totalWordsLearned).toBeDefined();
      expect(status.masteredWordsCount).toBeDefined();
      expect(status.masteryPercentage).toBeDefined();
      expect(status.weeklySessionCount).toBeDefined();
      expect(status.currentStreak).toBeDefined();
      expect(Array.isArray(status.wordsPreview)).toBe(true);
    });
  });

  describe('getUsersForReminder', () => {
    it('リマインダー対象ユーザー取得が動作する', async () => {
      // リマインダー設定を有効化
      await reminderService.updateSettings(testUserId, { enabled: true });

      const targets = await reminderService.getUsersForReminder();

      // 復習対象の単語がないので空の可能性が高い
      expect(Array.isArray(targets)).toBe(true);
    });
  });

  describe('initializeForUser', () => {
    it('新規ユーザーの初期化が動作する', async () => {
      await reminderService.initializeForUser(testUserId);

      const settings = await reminderService.getSettings(testUserId);
      expect(settings).not.toBeNull();
    });

    it('既存ユーザーは重複作成しない', async () => {
      await reminderService.updateSettings(testUserId, { preferredTime: '15:00' });
      await reminderService.initializeForUser(testUserId);

      const settings = await reminderService.getSettings(testUserId);
      expect(settings?.preferredTime).toBe('15:00');
    });
  });
});
