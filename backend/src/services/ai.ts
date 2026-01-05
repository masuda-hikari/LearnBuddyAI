import OpenAI from 'openai';

/**
 * AIサービス - LLM APIとの連携
 */
export class AIService {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * 質問に回答
   */
  async answerQuestion(question: string, context?: string): Promise<string> {
    // APIキーがない場合はモック回答
    if (!this.client) {
      return this.getMockAnswer(question);
    }

    const systemPrompt = `あなたは親切で知識豊富な家庭教師です。
学生からの質問に対して、わかりやすく丁寧に回答してください。
必要に応じて例を挙げて説明してください。
回答は日本語で行ってください。`;

    const userPrompt = context
      ? `コンテキスト: ${context}\n\n質問: ${question}`
      : question;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '回答を生成できませんでした。';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI APIの呼び出しに失敗しました');
    }
  }

  /**
   * クイズの問題を生成
   */
  async generateQuiz(topic: string, difficulty: string = 'medium'): Promise<QuizQuestion[]> {
    if (!this.client) {
      return this.getMockQuiz(topic);
    }

    const prompt = `「${topic}」に関する${difficulty}難易度のクイズを3問作成してください。
各問題は以下のJSON形式で出力してください:
[
  {
    "question": "問題文",
    "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    "correctIndex": 0,
    "explanation": "正解の解説"
  }
]`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || '[]';
      return JSON.parse(content);
    } catch (error) {
      console.error('Quiz generation error:', error);
      return this.getMockQuiz(topic);
    }
  }

  /**
   * モック回答（開発・テスト用）
   */
  private getMockAnswer(question: string): string {
    return `【開発モード】
ご質問: "${question}"

これは開発モードでのモック回答です。
本番環境ではOpenAI APIを使用して回答を生成します。

環境変数 OPENAI_API_KEY を設定してください。`;
  }

  /**
   * モッククイズ（開発・テスト用）
   */
  private getMockQuiz(_topic: string): QuizQuestion[] {
    return [
      {
        question: 'サンプル問題です。これは開発モードのモックデータです。',
        options: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctIndex: 0,
        explanation: 'これはモック解説です。',
      },
    ];
  }
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
