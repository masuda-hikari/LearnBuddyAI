import { AIService } from '../backend/src/services/ai';

describe('AIService - Quiz', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  describe('generateQuiz', () => {
    it('クイズを生成できる（モックモード）', async () => {
      const questions = await aiService.generateQuiz('英語', 'easy');

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('各問題に必要なフィールドがある', async () => {
      const questions = await aiService.generateQuiz('数学', 'medium');
      const question = questions[0];

      expect(question.question).toBeDefined();
      expect(question.options).toBeDefined();
      expect(Array.isArray(question.options)).toBe(true);
      expect(typeof question.correctIndex).toBe('number');
      expect(question.explanation).toBeDefined();
    });
  });
});

describe('Quiz採点ロジック', () => {
  it('全問正解で100%', () => {
    const questions = [
      { correctIndex: 0 },
      { correctIndex: 1 },
      { correctIndex: 2 },
    ];
    const answers = [0, 1, 2];

    const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
    const percentage = Math.round((correct / questions.length) * 100);

    expect(percentage).toBe(100);
  });

  it('部分正解で適切なスコア', () => {
    const questions = [
      { correctIndex: 0 },
      { correctIndex: 1 },
      { correctIndex: 2 },
    ];
    const answers = [0, 0, 2]; // 2問正解

    const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
    const percentage = Math.round((correct / questions.length) * 100);

    expect(correct).toBe(2);
    expect(percentage).toBe(67);
  });

  it('全問不正解で0%', () => {
    const questions = [
      { correctIndex: 0 },
      { correctIndex: 1 },
    ];
    const answers = [1, 0]; // 全て間違い

    const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
    const percentage = Math.round((correct / questions.length) * 100);

    expect(correct).toBe(0);
    expect(percentage).toBe(0);
  });
});
