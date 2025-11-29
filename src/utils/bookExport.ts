import type { Book } from '../types';

// 本棚全体をエクスポート用のデータ形式
export interface BookshelfExport {
  version: string;
  exportedAt: number;
  books: Book[];
}

// 本単体をエクスポート用のデータ形式
export interface SingleBookExport {
  version: string;
  exportedAt: number;
  book: Book;
}

const EXPORT_VERSION = '1.0';

// 本棚全体をダウンロード
export const downloadBookshelf = (books: Book[]) => {
  const exportData: BookshelfExport = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    books
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `本棚バックアップ_${date}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 本単体をダウンロード
export const downloadSingleBook = (book: Book) => {
  const exportData: SingleBookExport = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    book
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // ファイル名から使えない文字を除去
  const safeTitle = (book.title || '無題の本').replace(/[/\\?%*:|"<>]/g, '-');
  const filename = `${safeTitle}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ファイルを読み込む
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
};

// 本のデータを検証
const validateBook = (book: unknown): book is Book => {
  if (!book || typeof book !== 'object') return false;
  const b = book as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.title === 'string' &&
    b.coverData !== undefined &&
    Array.isArray(b.pages) &&
    typeof b.createdAt === 'number' &&
    typeof b.updatedAt === 'number'
  );
};

// 本棚をアップロード（復元）
export const uploadBookshelf = async (
  file: File,
  existingBooks: Book[],
  mode: 'replace' | 'merge'
): Promise<{ books: Book[]; importedCount: number }> => {
  const text = await readFileAsText(file);
  const data = JSON.parse(text);
  
  // 本棚データかどうか確認
  if (!data.books || !Array.isArray(data.books)) {
    throw new Error('本棚データの形式が正しくありません');
  }
  
  const validBooks: Book[] = data.books.filter(validateBook);
  
  if (validBooks.length === 0) {
    throw new Error('有効な本のデータが見つかりませんでした');
  }
  
  if (mode === 'replace') {
    return { books: validBooks, importedCount: validBooks.length };
  } else {
    // merge: IDが重複する場合は新しいIDを付与
    const existingIds = new Set(existingBooks.map(b => b.id));
    const mergedBooks = validBooks.map((book: Book) => {
      if (existingIds.has(book.id)) {
        return { ...book, id: Date.now().toString() + Math.random().toString(36).slice(2) };
      }
      return book;
    });
    return { books: [...existingBooks, ...mergedBooks], importedCount: mergedBooks.length };
  }
};

// 本単体をアップロード（追加）
export const uploadSingleBook = async (
  file: File,
  existingBooks: Book[]
): Promise<{ books: Book[]; importedBook: Book }> => {
  const text = await readFileAsText(file);
  const data = JSON.parse(text);
  
  // 本棚データの中の一冊目を取り込む場合
  let book: unknown;
  if (data.book) {
    book = data.book;
  } else if (data.books && Array.isArray(data.books) && data.books.length > 0) {
    book = data.books[0];
  } else {
    throw new Error('本のデータが見つかりませんでした');
  }
  
  if (!validateBook(book)) {
    throw new Error('本のデータ形式が正しくありません');
  }
  
  // IDが重複する場合は新しいIDを付与
  const existingIds = new Set(existingBooks.map(b => b.id));
  let importedBook = book as Book;
  if (existingIds.has(importedBook.id)) {
    importedBook = { 
      ...importedBook, 
      id: Date.now().toString() + Math.random().toString(36).slice(2) 
    };
  }
  
  return { 
    books: [importedBook, ...existingBooks], 
    importedBook 
  };
};

