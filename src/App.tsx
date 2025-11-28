import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { Editor } from './components/Editor';
import { BookViewer } from './components/BookViewer';
import { AIGenerator } from './components/AIGenerator';
import type { StoryPage, AppMode, CoverData, Book } from './types';
import { Book as BookIcon, Save, Home as HomeIcon } from 'lucide-react';

const STORAGE_KEY = 'storybook-creator-books';

// ローカルストレージから本を読み込む
const loadBooks = (): Book[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// ローカルストレージに本を保存
const saveBooks = (books: Book[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    console.error('Failed to save books:', e);
  }
};

function App() {
  const [mode, setMode] = useState<AppMode>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [title, setTitle] = useState('');
  const [coverData, setCoverData] = useState<CoverData>({
    image: null,
    imageScale: 1
  });

  // 初期読み込み
  useEffect(() => {
    setBooks(loadBooks());
  }, []);

  // 現在の編集データを本として保存
  const handleSaveBook = () => {
    const now = Date.now();
    
    if (currentBookId) {
      // 既存の本を更新
      const updatedBooks = books.map(book => 
        book.id === currentBookId 
          ? { ...book, title, coverData, pages, updatedAt: now }
          : book
      );
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
    } else {
      // 新しい本を作成
      const newBook: Book = {
        id: now.toString(),
        title: title || '無題の本',
        coverData,
        pages,
        createdAt: now,
        updatedAt: now
      };
      const updatedBooks = [newBook, ...books];
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
      setCurrentBookId(newBook.id);
    }
    
    alert('保存しました！');
  };

  const handleAddPage = (image: string | null, imageScale: number, text: string) => {
    const newPage: StoryPage = {
      id: Date.now().toString(),
      image,
      imageScale,
      text
    };
    setPages([...pages, newPage]);
  };

  const handleDeletePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleUpdatePage = (id: string, updates: Partial<StoryPage>) => {
    setPages(pages.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleReorderPages = (newPages: StoryPage[]) => {
    setPages(newPages);
  };

  const handleCreateNew = () => {
    setCurrentBookId(null);
    setTitle('');
    setCoverData({ image: null, imageScale: 1 });
    setPages([]);
    setMode('edit');
  };

  const handleAIGenerate = () => {
    setCurrentBookId(null);
    setTitle('');
    setCoverData({ image: null, imageScale: 1 });
    setPages([]);
    setMode('ai-generate');
  };

  const handleAIGenerateComplete = (generatedTitle: string, generatedCover: CoverData, generatedPages: StoryPage[]) => {
    setTitle(generatedTitle);
    setCoverData(generatedCover);
    setPages(generatedPages);
    
    // 自動保存
    const now = Date.now();
    const newBook: Book = {
      id: now.toString(),
      title: generatedTitle || '無題の本',
      coverData: generatedCover,
      pages: generatedPages,
      createdAt: now,
      updatedAt: now
    };
    const updatedBooks = [newBook, ...books];
    setBooks(updatedBooks);
    saveBooks(updatedBooks);
    setCurrentBookId(newBook.id);
    
    setMode('edit');
  };

  const handleOpenBook = (book: Book) => {
    setCurrentBookId(book.id);
    setTitle(book.title);
    setCoverData(book.coverData);
    setPages(book.pages);
    setMode('view');
  };

  const handleDeleteBook = (id: string) => {
    const updatedBooks = books.filter(b => b.id !== id);
    setBooks(updatedBooks);
    saveBooks(updatedBooks);
  };

  const handleCloseViewer = () => {
    if (mode === 'preview') {
      setMode('edit');
    } else {
      // 完了モードからホームに戻る
      setMode('home');
    }
  };

  const handleBackToEdit = () => {
    setMode('edit');
  };

  const handleBackToHome = () => {
    if (pages.length > 0 || title) {
      if (window.confirm('保存していない変更があります。ホームに戻りますか？')) {
        setMode('home');
      }
    } else {
      setMode('home');
    }
  };

  const handleFinish = () => {
    // 完了時に自動保存
    const now = Date.now();
    
    if (currentBookId) {
      const updatedBooks = books.map(book => 
        book.id === currentBookId 
          ? { ...book, title, coverData, pages, updatedAt: now }
          : book
      );
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
    } else if (pages.length > 0) {
      const newBook: Book = {
        id: now.toString(),
        title: title || '無題の本',
        coverData,
        pages,
        createdAt: now,
        updatedAt: now
      };
      const updatedBooks = [newBook, ...books];
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
      setCurrentBookId(newBook.id);
    }
    
    setMode('view');
  };

  // 本のリストを更新して保存
  const handleUpdateBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    saveBooks(newBooks);
  };

  // ホーム画面
  if (mode === 'home') {
    return (
      <Home
        books={books}
        onCreateNew={handleCreateNew}
        onAIGenerate={handleAIGenerate}
        onOpenBook={handleOpenBook}
        onDeleteBook={handleDeleteBook}
        onUpdateBooks={handleUpdateBooks}
      />
    );
  }

  // AI生成画面
  if (mode === 'ai-generate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMode('home')}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-400 rounded-lg transition-colors"
                title="ホームに戻る"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="hidden sm:inline">ホーム</span>
              </button>
              <div className="flex items-center space-x-2">
                <BookIcon className="w-6 h-6" />
                <h1 className="text-xl font-bold tracking-wide">
                  AI絵本ジェネレーター
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <AIGenerator
            onGenerate={handleAIGenerateComplete}
            onCancel={() => setMode('home')}
          />
        </main>
      </div>
    );
  }

  // ビューワー画面
  if (mode === 'preview' || mode === 'view') {
    return (
      <BookViewer
        pages={pages}
        title={title}
        coverData={coverData}
        onClose={handleCloseViewer}
        onBackToEdit={handleBackToEdit}
        isPreview={mode === 'preview'}
      />
    );
  }

  // 編集画面
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* ヘッダー */}
      <header className="bg-indigo-700 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              title="ホームに戻る"
            >
              <HomeIcon className="w-5 h-5" />
              <span className="hidden sm:inline">ホーム</span>
            </button>
            <div className="flex items-center space-x-2">
              <BookIcon className="w-6 h-6" />
              <h1 className="text-xl font-bold tracking-wide">
                Create Book Generator
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveBook}
              disabled={pages.length === 0 && !title}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              <span className="hidden sm:inline">保存</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <Editor
          title={title}
          setTitle={setTitle}
          coverData={coverData}
          setCoverData={setCoverData}
          onAddPage={handleAddPage}
          onPreview={() => setMode('preview')}
          onFinish={handleFinish}
          pages={pages}
          onDeletePage={handleDeletePage}
          onUpdatePage={handleUpdatePage}
          onReorderPages={handleReorderPages}
        />
      </main>
    </div>
  );
}

export default App;
