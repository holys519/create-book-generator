import React, { useState, useEffect, useRef } from 'react';
import { Plus, Book, BookOpen, Trash2, Calendar, FileText, Sparkles, Settings, Download, Upload, FolderDown, FolderUp } from 'lucide-react';
import type { Book as BookType } from '../types';
import { ApiKeySettings } from './ApiKeySettings';
import { getApiKey } from '../utils/crypto';
import { downloadBookshelf, downloadSingleBook, uploadBookshelf, uploadSingleBook } from '../utils/bookExport';

interface HomeProps {
  books: BookType[];
  onCreateNew: () => void;
  onAIGenerate: () => void;
  onOpenBook: (book: BookType) => void;
  onDeleteBook: (id: string) => void;
  onUpdateBooks: (books: BookType[]) => void;
}

export const Home: React.FC<HomeProps> = ({ books, onCreateNew, onAIGenerate, onOpenBook, onDeleteBook, onUpdateBooks }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const bookshelfFileRef = useRef<HTMLInputElement>(null);
  const singleBookFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasApiKey(!!getApiKey());
  }, []);

  // 本棚全体をダウンロード
  const handleDownloadBookshelf = () => {
    if (books.length === 0) {
      alert('ダウンロードする本がありません');
      return;
    }
    downloadBookshelf(books);
  };

  // 本棚をアップロード（復元）
  const handleUploadBookshelf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const mode = window.confirm(
        '現在の本棚を置き換えますか？\n\n[OK] 置き換える（既存の本は削除されます）\n[キャンセル] 追加する（既存の本はそのまま）'
      ) ? 'replace' as const : 'merge' as const;
      
      const { books: newBooks, importedCount } = await uploadBookshelf(file, books, mode);
      onUpdateBooks(newBooks);
      alert(`${importedCount}冊の本をインポートしました`);
    } catch (error) {
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
    
    // ファイル選択をリセット
    e.target.value = '';
    setShowImportMenu(false);
  };

  // 本単体をアップロード
  const handleUploadSingleBook = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { books: newBooks, importedBook } = await uploadSingleBook(file, books);
      onUpdateBooks(newBooks);
      alert(`「${importedBook.title}」をインポートしました`);
    } catch (error) {
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
    
    // ファイル選択をリセット
    e.target.value = '';
    setShowImportMenu(false);
  };

  // 本単体をダウンロード
  const handleDownloadBook = (book: BookType, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadSingleBook(book);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Book className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Create Book Generator</h1>
              <p className="text-amber-100 text-sm mt-1">あなたの物語を、一冊の本に。</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 本棚ダウンロード */}
            <button
              onClick={handleDownloadBookshelf}
              className="p-3 rounded-full hover:bg-white/10 transition-colors"
              title="本棚をダウンロード"
            >
              <FolderDown className="w-6 h-6" />
            </button>
            
            {/* インポートメニュー */}
            <div className="relative">
              <button
                onClick={() => setShowImportMenu(!showImportMenu)}
                className={`p-3 rounded-full transition-colors ${
                  showImportMenu ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
                title="インポート"
              >
                <FolderUp className="w-6 h-6" />
              </button>
              
              {showImportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50">
                  <button
                    onClick={() => bookshelfFileRef.current?.click()}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-amber-50 flex items-center gap-3"
                  >
                    <Upload className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="font-medium">本棚をインポート</div>
                      <div className="text-xs text-gray-500">バックアップから復元</div>
                    </div>
                  </button>
                  <button
                    onClick={() => singleBookFileRef.current?.click()}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-amber-50 flex items-center gap-3"
                  >
                    <Upload className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="font-medium">本を追加</div>
                      <div className="text-xs text-gray-500">1冊の本をインポート</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            
            {/* 隠しファイル入力 */}
            <input
              ref={bookshelfFileRef}
              type="file"
              accept=".json"
              onChange={handleUploadBookshelf}
              className="hidden"
            />
            <input
              ref={singleBookFileRef}
              type="file"
              accept=".json"
              onChange={handleUploadSingleBook}
              className="hidden"
            />
            
            {/* 設定ボタン */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-colors ${
                showSettings ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="API設定"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-8">
        {/* API設定パネル */}
        {showSettings && (
          <div className="mb-8">
            <ApiKeySettings onApiKeySet={setHasApiKey} />
          </div>
        )}

        {/* 作成ボタン */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 手動作成ボタン */}
          <button
            onClick={onCreateNew}
            className="group flex items-center gap-4 px-8 py-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-dashed border-amber-300 hover:border-amber-500"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <span className="text-xl font-bold text-gray-800 block">手動で作成</span>
              <span className="text-sm text-gray-500">自分で画像とテキストを入力</span>
            </div>
          </button>

          {/* AI生成ボタン */}
          <button
            onClick={() => {
              if (!hasApiKey) {
                setShowSettings(true);
                return;
              }
              onAIGenerate();
            }}
            className="group flex items-center gap-4 px-8 py-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <span className="text-xl font-bold text-gray-800 block">AIで自動生成</span>
              <span className="text-sm text-gray-500">
                {hasApiKey ? 'テーマを入力するだけで絵本を生成' : 'APIキーを設定してください'}
              </span>
            </div>
            {!hasApiKey && (
              <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                要設定
              </span>
            )}
          </button>
        </div>

        {/* 本の一覧 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            保存された本 ({books.length}冊)
          </h2>

          {books.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">まだ本がありません</p>
              <p className="text-gray-400 text-sm mt-2">上のボタンから新しい本を作りましょう！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => onOpenBook(book)}
                >
                  {/* 表紙プレビュー */}
                  <div className="h-48 bg-gradient-to-br from-amber-700 to-amber-900 relative overflow-hidden">
                    {book.coverData.image ? (
                      <img
                        src={book.coverData.image}
                        alt={book.title}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Book className="w-16 h-16 text-amber-200/50" />
                      </div>
                    )}
                    {/* オーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* タイトル */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-bold text-lg truncate drop-shadow-lg">
                        {book.title || "無題の本"}
                      </h3>
                    </div>

                    {/* アクションボタン */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* ダウンロードボタン */}
                      <button
                        onClick={(e) => handleDownloadBook(book, e)}
                        className="p-2 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full"
                        title="この本をダウンロード"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {/* 削除ボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`「${book.title || '無題の本'}」を削除しますか？`)) {
                            onDeleteBook(book.id);
                          }
                        }}
                        className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 本の情報 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <FileText className="w-4 h-4" />
                      <span>{book.pages.length} ページ</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>更新: {formatDate(book.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
