import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

// 文章生成
export const generateStoryText = async (
  apiKey: string,
  theme: string,
  pageNumber: number,
  totalPages: number,
  previousContent: string[],
  modelName: string = "gemini-2.0-flash"
): Promise<string> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const previousContext =
    previousContent.length > 0
      ? `\n\nこれまでのストーリー:\n${previousContent.join("\n\n")}`
      : "";

  const prompt = `あなたは子供向け絵本の作家です。以下の条件で絵本のページの文章を作成してください。

テーマ: ${theme}
現在のページ: ${pageNumber}ページ目（全${totalPages}ページ）
${previousContext}

条件:
- 子供が理解しやすいシンプルな言葉を使う
- 1ページあたり2〜4文程度
- ${
    pageNumber === 1
      ? "物語の始まり（導入）"
      : pageNumber === totalPages
      ? "物語の結末（ハッピーエンド）"
      : "物語の展開"
  }を書く
- 情景が目に浮かぶような描写を含める
- 日本語で書く

文章のみを出力してください（説明や注釈は不要）:`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

// 画像生成用のプロンプト作成
export const generateImagePrompt = async (
  apiKey: string,
  theme: string,
  storyText: string,
  baseImageDescriptions: string[],
  modelName: string = "gemini-2.0-flash"
): Promise<string> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const baseContext =
    baseImageDescriptions.length > 0
      ? `\n\n参考画像のスタイル・雰囲気: ${baseImageDescriptions.join(", ")}`
      : "";

  const prompt = `以下のストーリーシーンに合う絵本のイラストを生成するための英語プロンプトを作成してください。

テーマ: ${theme}
ストーリーテキスト: ${storyText}
${baseContext}

条件:
- 子供向け絵本にふさわしい可愛らしいイラストスタイル
- 明るく温かみのある色使い
- キャラクターは愛らしくデフォルメされたデザイン
- 背景も含めた完成されたイラスト
- 100語以内の簡潔なプロンプト

英語のプロンプトのみを出力してください（日本語や説明は不要）:`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

// Gemini 2.5 Flash Image / Gemini 3 Pro Image Preview (NanoBanana Pro) で画像生成
export const generateImage = async (
  apiKey: string,
  prompt: string,
  modelName: string = "gemini-2.5-flash-image"
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = `Children's book illustration, cute and colorful style: ${prompt}. Style: watercolor, soft colors, child-friendly, storybook art, warm and gentle atmosphere.`;

  // モデルに応じた設定
  const modelConfig: {
    model: string;
    contents: string;
    config: {
      responseModalities: string[];
      imageConfig?: {
        aspectRatio?: string;
        imageSize?: string;
      };
    };
  } = {
    model: modelName,
    contents: fullPrompt,
    config: {
      responseModalities: ["Text", "Image"],
    },
  };

  // Gemini 3 Pro Image Preview (NanoBanana Pro) の場合の追加設定
  if (modelName === "gemini-3-pro-image-preview") {
    modelConfig.config.imageConfig = {
      aspectRatio: "1:1",
      imageSize: "1K", // デフォルトは1Kだが明示的に指定
    };
  }

  const response = await ai.models.generateContent(modelConfig);

  // レスポンスから画像データを取得
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        return `data:${mimeType};base64,${imageData}`;
      }
    }
  }

  throw new Error("画像データが見つかりません");
};

// ベース画像を分析
export const analyzeBaseImages = async (
  apiKey: string,
  images: string[],
  modelName: string = "gemini-2.0-flash"
): Promise<string[]> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const descriptions: string[] = [];

  for (const imageData of images) {
    try {
      // Base64データからMIMEタイプとデータを分離
      const matches = imageData.match(/^data:(.+);base64,(.+)$/);
      if (!matches) continue;

      const mimeType = matches[1];
      const base64Data = matches[2];

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: "この画像のスタイル、色使い、雰囲気を簡潔に英語で説明してください（50語以内）:",
        },
      ]);

      const response = await result.response;
      descriptions.push(response.text());
    } catch (error) {
      console.error("Image analysis failed:", error);
    }
  }

  return descriptions;
};
