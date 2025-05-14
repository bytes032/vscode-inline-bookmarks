import * as vscode from 'vscode';
import { IBookmarkMap } from '../types';
import { BookmarkUtils } from '../utils/bookmarkUtils';
import { DecorationUtils } from '../utils/decorationUtils';
import { WorkspaceStorage } from '../persistence/workspaceStorage';
import { BookmarkStateManager } from '../persistence/stateManager';
import { getExtensionConfig, commaSeparatedStringToUniqueList, arrayToSearchGlobPattern } from '../config/settings';
import { Bookmark } from '../models/bookmark';

/**
 * Core controller for bookmark management
 */
export class BookmarkManager {
  private _stateManager: BookmarkStateManager | null = null;
  private _workspaceStorage: WorkspaceStorage;
  private _decorationUtils: DecorationUtils;
  private _styles: ReturnType<DecorationUtils['loadDecorationStyles']>;
  private _words: Record<string, string[]>;
  
  /**
   * Bookmarks storage
   * bookmark: {range, text, id}
   * this.bookmarks[uri][style] = [bookmark];
   */
  public bookmarks: IBookmarkMap = {};
  
  /**
   * Creates a new BookmarkManager
   * @param context The VS Code extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this._workspaceStorage = new WorkspaceStorage(context);
    this._decorationUtils = new DecorationUtils(context);
    this._styles = this._decorationUtils.loadDecorationStyles();
    this._words = this.loadWords();
    
    // Initialize the state manager
    this.initStateManager();
    
    // Load workspace bookmarks
    this.loadFromWorkspace();
  }
  
  /**
   * Initialize the bookmark state manager
   */
  private initStateManager(): void {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      this._stateManager = new BookmarkStateManager(workspaceRoot);
      console.log('Bookmark state manager initialized with workspace root:', workspaceRoot);
    } else {
      console.log('No workspace folder available, bookmark states will not be persisted');
    }
  }
  
  /**
   * Loads trigger words from settings
   */
  private loadWords(): Record<string, string[]> {
    // Load default words from settings
    const config = getExtensionConfig();
    const defaultWords: Record<string, string[]> = {
      "blue": commaSeparatedStringToUniqueList(config.default.words.blue),
      "purple": commaSeparatedStringToUniqueList(config.default.words.purple),
      "green": commaSeparatedStringToUniqueList(config.default.words.green),
      "red": commaSeparatedStringToUniqueList(config.default.words.red)
    };
    
    // Merge with custom word mappings
    return { ...defaultWords, ...config.expert.custom.words.mapping };
  }
  
  /**
   * Reset the workspace state
   */
  public resetWorkspace(): void {
    this._workspaceStorage.resetWorkspace();
  }
  
  /**
   * Load bookmarks from workspace state
   */
  public loadFromWorkspace(): void {
    this.bookmarks = this._workspaceStorage.loadFromWorkspace();
  }
  
  /**
   * Save bookmarks to workspace state
   */
  public saveToWorkspace(): void {
    this._workspaceStorage.saveToWorkspace(this.bookmarks);
  }
  
  /**
   * Check if there are any bookmarks
   */
  public hasBookmarks(): boolean {
    return Object.keys(this.bookmarks).length > 0;
  }
  
  /**
   * Clear all bookmarks for a specific file
   * @param document The document to clear bookmarks for
   */
  public clearBookmarksOfFile(document: vscode.TextDocument): void {
    const fileUri = document.uri.toString();
    if (this.bookmarks[fileUri]) {
      delete this.bookmarks[fileUri];
    }
  }
  
  /**
   * Clear bookmarks for a specific file and style
   * @param document The document to clear bookmarks for
   * @param style The style/category to clear
   */
  public clearBookmarksOfFileAndStyle(document: vscode.TextDocument, style: string): void {
    const fileUri = document.uri.toString();
    if (this.bookmarks[fileUri] && this.bookmarks[fileUri][style]) {
      delete this.bookmarks[fileUri][style];
    }
  }
  
  /**
   * Add bookmarks for a document
   * @param document The document to add bookmarks for
   * @param style The style/category to add
   * @param bookmarks The bookmarks to add
   */
  public addBookmarks(document: vscode.TextDocument, style: string, bookmarks: Bookmark[]): void {
    const fileUri = document.uri.toString();
    
    if (!this.bookmarks[fileUri]) {
      this.bookmarks[fileUri] = {};
    }
    
    this.bookmarks[fileUri][style] = bookmarks;
  }
  
  /**
   * Decorate an editor with bookmarks
   * @param editor The editor to decorate
   */
  public async decorate(editor: vscode.TextEditor): Promise<void> {
    // Skip if there's no editor or document
    if (!editor || !editor.document) return;
    
    // Clear existing bookmarks for this file
    this.clearBookmarksOfFile(editor.document);
    
    // Skip if the file extension is blacklisted
    if (BookmarkUtils.extensionIsBlacklisted(editor.document.fileName)) return;
    
    // Process each word category
    for (const style in this._words) {
      // Skip if style doesn't exist or is empty or blacklisted
      if (!this._words.hasOwnProperty(style) || 
          this._words[style].length === 0 || 
          BookmarkUtils.wordIsOnIgnoreList(this._words[style][0])) {
        continue;
      }
      
      // Find bookmarks and decorate
      await this.decorateWords(editor, this._words[style], style);
    }
    
    // Update workspace state
    this.saveToWorkspace();
  }
  
  /**
   * Decorate specific words in an editor
   * @param editor The editor to decorate
   * @param words The words to find and decorate
   * @param style The style/category to use
   * @param noAdd Whether to skip adding to bookmarks (for extension output)
   */
  private async decorateWords(
    editor: vscode.TextEditor,
    words: string[],
    style: string,
    noAdd: boolean = false
  ): Promise<void> {
    // Make sure styles exist
    if (!this._styles || !this._styles['default']) {
      console.error('Missing default decoration style');
      return;
    }
    
    const decoStyle = this._styles[style]?.type || this._styles['default'].type;
    
    // Find words in document
    const bookmarks = BookmarkUtils.findWords(editor.document, words, style);
    
    // Extract ranges for decoration
    const decorations = bookmarks.map(bookmark => bookmark.range);
    
    // Set decorations in editor
    editor.setDecorations(decoStyle, decorations);
    
    // Add to bookmarks if needed
    if (bookmarks.length && !noAdd) {
      this.addBookmarks(editor.document, style, bookmarks);
    }
  }
  
  /**
   * Update bookmarks for a document
   * @param document The document to update bookmarks for
   */
  public async updateBookmarks(document: vscode.TextDocument): Promise<void> {
    // Skip if document is null or is extension output
    if (!document || document.fileName.startsWith("extension-output-")) return;
    
    // Clear existing bookmarks for this file
    this.clearBookmarksOfFile(document);
    
    // Skip if the file extension is blacklisted
    if (BookmarkUtils.extensionIsBlacklisted(document.fileName)) return;
    
    // Process each word category
    for (const style in this._words) {
      // Skip if style doesn't exist or is empty or blacklisted
      if (!this._words.hasOwnProperty(style) || 
          this._words[style].length === 0 || 
          BookmarkUtils.wordIsOnIgnoreList(this._words[style][0])) {
        continue;
      }
      
      // Find bookmarks and update
      await this.updateBookmarksForWordAndStyle(document, this._words[style], style);
    }
    
    // Update workspace state
    this.saveToWorkspace();
  }
  
  /**
   * Update bookmarks for specific words in a document
   * @param document The document to update
   * @param words The words to find
   * @param style The style/category
   */
  private async updateBookmarksForWordAndStyle(
    document: vscode.TextDocument,
    words: string[],
    style: string
  ): Promise<void> {
    // Find words in document
    const bookmarks = BookmarkUtils.findWords(document, words, style);
    
    // Add to bookmarks if any found
    if (bookmarks.length) {
      this.addBookmarks(document, style, bookmarks);
    }
  }
  
  /**
   * Scan the workspace for bookmarks
   * @returns A promise that resolves when the scan is complete
   */
  public async scanWorkspaceBookmarks(): Promise<void> {
    const config = getExtensionConfig();
    
    let includePattern = arrayToSearchGlobPattern(config.search.includes) || '{**/*}';
    let excludePattern = arrayToSearchGlobPattern(config.search.excludes);
    let limit = config.search.maxFiles;
    
    return new Promise((resolve, reject) => {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Scanning for bookmarks",
        cancellable: true
      }, async (progress, token) => {
        token.onCancellationRequested(() => {
          console.log("User canceled the scan operation");
          reject(new Error("Operation cancelled"));
        });
        
        try {
          let files = await vscode.workspace.findFiles(includePattern, excludePattern, limit);
          
          let cnt = 0;
          for (let i = 0; i < files.length; i++) {
            if (token.isCancellationRequested) {
              reject(new Error("Operation cancelled"));
              return;
            }
            
            try {
              const document = await vscode.workspace.openTextDocument(files[i]);
              await this.updateBookmarks(document);
              
              // Count total bookmarks
              const fileUri = document.uri.toString();
              if (this.bookmarks[fileUri]) {
                Object.keys(this.bookmarks[fileUri]).forEach(category => {
                  cnt += this.bookmarks[fileUri][category].length;
                });
              }
            } catch (e) {
              console.warn(`Error while scanning document ${files[i]}: ${e}`);
            }
            
            progress.report({
              increment: 100 / files.length,
              message: `Scanning file ${i + 1}/${files.length} (${cnt} bookmarks)`
            });
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Check if a bookmark is processed
   * @param bookmarkId The ID of the bookmark to check
   * @returns True if the bookmark is processed
   */
  public isBookmarkProcessed(bookmarkId: string): boolean {
    return this._stateManager?.isProcessed(bookmarkId) || false;
  }
  
  /**
   * Set the processed state of a bookmark
   * @param bookmarkId The ID of the bookmark
   * @param processed The processed state to set
   */
  public setBookmarkProcessed(bookmarkId: string, processed: boolean): void {
    if (this._stateManager) {
      this._stateManager.setProcessed(bookmarkId, processed);
    }
  }
  
  /**
   * Toggle the processed state of a bookmark
   * @param bookmarkId The ID of the bookmark
   * @returns The new processed state
   */
  public toggleBookmarkProcessed(bookmarkId: string): boolean {
    return this._stateManager?.toggleProcessed(bookmarkId) || false;
  }
  
  /**
   * Get all processed bookmarks
   * @returns Array of processed bookmark IDs
   */
  public getProcessedBookmarks(): string[] {
    return this._stateManager?.getProcessedBookmarks() || [];
  }
}