import * as fs from 'fs';
import * as path from 'path';
import { IBookmarkStateDatabase } from '../types';
import { BOOKMARK_STATE_FILENAME } from '../config/constants';

/**
 * Manages the persistence of bookmark processing states in a local JSON file
 */
export class BookmarkStateManager {
  private workspaceRoot: string;
  private dbPath: string;
  private states: IBookmarkStateDatabase;

  /**
   * Creates a new BookmarkStateManager
   * @param workspaceRoot The root path of the workspace
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.dbPath = path.join(workspaceRoot, '.vscode', BOOKMARK_STATE_FILENAME);
    this.states = { 
      bookmarks: {}, 
      lastUpdated: new Date().toISOString() 
    };
    this.loadDatabase();
  }

  /**
   * Loads the bookmark state database from disk
   */
  private loadDatabase(): void {
    try {
      // Create .vscode directory if it doesn't exist
      const vscodeDir = path.join(this.workspaceRoot, '.vscode');
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }
      
      // Load existing database or create a new one
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        this.states = JSON.parse(data);
        console.log(`Loaded ${Object.keys(this.states.bookmarks).length} bookmark states`);
      } else {
        // Initialize with empty database
        this.saveDatabase();
        console.log('Created new bookmark state database');
      }
    } catch (error) {
      console.error('Error loading bookmark state database:', error);
      // Initialize with empty database on error
      this.states = { 
        bookmarks: {}, 
        lastUpdated: new Date().toISOString() 
      };
    }
  }

  /**
   * Saves the bookmark state database to disk
   */
  private saveDatabase(): void {
    try {
      this.states.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.dbPath, JSON.stringify(this.states, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving bookmark state database:', error);
    }
  }

  /**
   * Gets the processed state of a bookmark
   * @param bookmarkId The unique identifier of the bookmark
   * @returns Whether the bookmark has been processed
   */
  public isProcessed(bookmarkId: string): boolean {
    return Boolean(this.states.bookmarks[bookmarkId]?.processed);
  }

  /**
   * Sets the processed state of a bookmark
   * @param bookmarkId The unique identifier of the bookmark
   * @param processed Whether the bookmark has been processed
   */
  public setProcessed(bookmarkId: string, processed: boolean): void {
    if (!this.states.bookmarks[bookmarkId]) {
      this.states.bookmarks[bookmarkId] = { 
        id: bookmarkId, 
        processed: false 
      };
    }
    
    this.states.bookmarks[bookmarkId].processed = Boolean(processed);
    this.saveDatabase();
  }

  /**
   * Toggles the processed state of a bookmark
   * @param bookmarkId The unique identifier of the bookmark
   * @returns The new processed state
   */
  public toggleProcessed(bookmarkId: string): boolean {
    const newState = !this.isProcessed(bookmarkId);
    this.setProcessed(bookmarkId, newState);
    return newState;
  }

  /**
   * Gets all processed bookmark IDs
   * @returns Array of processed bookmark IDs
   */
  public getProcessedBookmarks(): string[] {
    return Object.entries(this.states.bookmarks)
      .filter(([, state]) => state.processed)
      .map(([id]) => id);
  }
}