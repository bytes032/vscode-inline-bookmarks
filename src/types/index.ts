import * as vscode from 'vscode';

export interface IRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface IBookmark {
  id: string;
  text: string;
  range: vscode.Range;
  processed: boolean;
}

export interface IBookmarkMap {
  [fileUri: string]: {
    [category: string]: IBookmark[];
  };
}

export interface IBookmarkState {
  id: string;
  processed: boolean;
}

export interface IBookmarkStateDatabase {
  bookmarks: { [id: string]: IBookmarkState };
  lastUpdated: string;
}

export interface IDecorationStyle {
  type: vscode.TextEditorDecorationType;
  options: vscode.DecorationRenderOptions;
}

export interface IDecorationStyles {
  [style: string]: IDecorationStyle;
}

export interface IExportData {
  project: string;
  bookmarks: IExportBookmark[];
}

export interface IExportBookmark {
  text: string;
  deeplink: string;
  type: string;
}

export interface IApiResponse {
  status: number;
  data: string;
}

export enum BookmarkCategory {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
  Purple = 'purple',
  Default = 'default'
}

export interface IBookmarkToProcess {
  id: string;
  fileUri: string;
  category: string;
  bookmark: IBookmark;
}

export interface IExtensionConfig {
  enable: boolean;
  default: {
    words: {
      red: string;
      green: string;
      blue: string;
      purple: string;
    };
  };
  exceptions: {
    words: {
      ignore: string;
    };
    file: {
      extensions: {
        ignore: string;
      };
    };
  };
  expert: {
    custom: {
      styles: Record<string, vscode.DecorationRenderOptions>;
      words: {
        mapping: Record<string, string[]>;
      };
    };
  };
  search: {
    includes: string[];
    excludes: string[];
    maxFiles: number;
  };
  api: {
    url: string;
    key: string;
  };
  project: {
    name: string;
  };
}