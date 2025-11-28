import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Trash2, Loader2, BookOpen, AlertCircle, Settings2 } from 'lucide-react';
import { getApiKey } from '../utils/crypto';
import { generateStoryText, generateImage, generateImagePrompt, analyzeBaseImages } from '../services/geminiService';
import type { StoryPage, CoverData } from '../types';

interface AIGeneratorProps {
  onGenerate: (title: string, coverData: CoverData, pages: StoryPage[]) => void;
  onCancel: () => void;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ onGenerate, onCancel }) => {
  const [theme, setTheme] = useState('');
  const [pageCount, setPageCount] = useState(5);
  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  
  // Model selection state
  const [textModel, setTextModel] = useState('gemini-2.0-flash');
  const [imageModel, setImageModel] = useState('gemini-2.5-flash-image');
  const [showModelSettings, setShowModelSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (baseImages.length >= 3) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImages(prev => [...prev.slice(0, 2), reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setBaseImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }

    if (!theme.trim()) {
      setError('テーマを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: pageCount + 2, message: '準備中...' });

    try {
      const pages: StoryPage[] = [];
      const storyTexts: string[] = [];
      let baseImageDescriptions: string[] = [];

      // ベース画像を分析
      if (baseImages.length > 0) {
        setProgress({ current: 0, total: pageCount + 2, message: '参考画像を分析中...' });
        baseImageDescriptions = await analyzeBaseImages(apiKey, baseImages, textModel);
      }

      // 各ページを生成
      for (let i = 1; i <= pageCount; i++) {
        setProgress({ 
          current: i, 
          total: pageCount + 2, 
          message: `ページ ${i}/${pageCount} のストーリーを生成中...` 
        });

        // 文章を生成
        const storyText = await generateStoryText(apiKey, theme, i, pageCount, storyTexts, textModel);
        storyTexts.push(storyText);

        setProgress({ 
          current: i, 
          total: pageCount + 2, 
          message: `ページ ${i}/${pageCount} のイラストを生成中...` 
        });

        // 画像プロンプトを生成
        const imagePrompt = await generateImagePrompt(apiKey, theme, storyText, baseImageDescriptions, textModel);
        
        // 画像を生成
        let imageData: string | null = null;
        try {
          imageData = await generateImage(apiKey, imagePrompt, imageModel);
        } catch (imgError) {
          console.error('Image generation failed, continuing without image:', imgError);
        }

        pages.push({
          id: Date.now().toString() + i,
          image: imageData,
          imageScale: 1,
          text: storyText
        });
      }

      // 表紙を生成
      setProgress({ 
        current: pageCount + 1, 
        total: pageCount + 2, 
        message: '表紙を生成中...' 
      });

      let coverImage: string | null = null;
      try {
        const coverPrompt = await generateImagePrompt(
          apiKey, 
          theme, 
          `表紙: ${theme}の物語`, 
          baseImageDescriptions,
          textModel
        );
        coverImage = await generateImage(apiKey, coverPrompt, imageModel);
      } catch {
        console.error('Cover generation failed');
      }

      const coverData: CoverData = {
        image: coverImage,
        imageScale: 1
      };

      // タイトルを生成
      setProgress({ 
        current: pageCount + 2, 
        total: pageCount + 2, 
        message: '完了!' 
      });

      const title = theme;

      onGenerate(title, coverData, pages);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'AI生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 shadow-xl border border-purple-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI絵本ジェネレーター</h2>
            <p className="text-sm text-gray-600">テーマを入力するだけで絵本を自動生成</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* テーマ入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              絵本のテーマ・内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: 勇気ある小さなウサギが森の仲間たちと冒険する物語"
              className="w-full h-32 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* ページ数選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ページ数
            </label>
            <div className="flex gap-3">
              {[3, 5, 7, 10].map(count => (
                <button
                  key={count}
                  onClick={() => setPageCount(count)}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    pageCount === count
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border hover:border-purple-300'
                  } disabled:opacity-50`}
                >
                  {count}ページ
                </button>
              ))}
            </div>
          </div>

          {/* モデル設定（トグル式） */}
          <div className="border-t border-b border-gray-200 py-4">
            <button
              onClick={() => setShowModelSettings(!showModelSettings)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              詳細設定（モデル変更）
            </button>
            
            {showModelSettings && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    テキスト生成モデル
                  </label>
                  <select
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (推奨)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="NanoBanana Pro">NanoBanana Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    画像生成モデル
                  </label>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (推奨)</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    <option value="NanoBanana Pro">NanoBanana Pro</option>
                  </select>
                </div>
                <p className="col-span-full text-xs text-gray-400">
                  ※ NanoBanana Proなどの外部モデルを使用する場合は、APIキーの権限や互換性をご確認ください。
                </p>
              </div>
            )}
          </div>

          {/* ベース画像アップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参考画像（任意・最大3枚）
            </label>
            <p className="text-xs text-gray-500 mb-3">
              アップロードした画像のスタイルや雰囲気を参考に絵本を生成します
            </p>
            
            <div className="flex gap-4 flex-wrap">
              {baseImages.map((img, index) => (
                <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-purple-300">
                  <img src={img} alt={`Base ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    disabled={isGenerating}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {baseImages.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-xs">追加</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* 進捗表示 */}
          {isGenerating && (
            <div className="bg-white rounded-lg p-6 border">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="font-medium text-gray-800">{progress.message}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className="flex-1 px-6 py-4 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !theme.trim()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  絵本を生成
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

