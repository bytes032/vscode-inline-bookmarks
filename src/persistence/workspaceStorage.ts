import * as vscode from 'vscode';
import * as fs from 'fs';
import { IBookmarkMap } from '../types';
import { WORKSPACE_STATE_KEY } from '../config/constants';

/**
 * Handles saving and loading bookmarks from workspace state
 */
export class WorkspaceStorage {
  private context: vscode.ExtensionContext;
  
  /**
   * Creates a new WorkspaceStorage
   * @param context The extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  /**
   * Checks if workspace is available
   * @returns True if workspace is available
   */
  public isWorkspaceAvailable(): boolean {
    return !!vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1;
  }
  
  /**
   * Resets workspace state
   */
  public resetWorkspace(): void {
    if (!this.isWorkspaceAvailable()) return;
    this.context.workspaceState.update(WORKSPACE_STATE_KEY, "{}");
  }
  
  /**
   * Saves bookmarks to workspace state
   * @param bookmarks The bookmarks to save
   */
  public saveToWorkspace(bookmarks: IBookmarkMap): void {
    if (!this.isWorkspaceAvailable()) return;
    this.context.workspaceState.update(WORKSPACE_STATE_KEY, JSON.stringify(bookmarks));
  }
  
  /**
   * Loads bookmarks from workspace state
   * @returns The bookmarks loaded from workspace state
   */
  public loadFromWorkspace(): IBookmarkMap {
    if (!this.isWorkspaceAvailable()) return {};
    
    const bookmarksJson = this.context.workspaceState.get(WORKSPACE_STATE_KEY, "{}");
    const bookmarks = JSON.parse(bookmarksJson) as IBookmarkMap;
    
    // Remove all non existing files
    Object.keys(bookmarks).forEach(filepath => {
      if (!fs.existsSync(vscode.Uri.parse(filepath).fsPath)) {
        delete bookmarks[filepath];
        return;
      }
      
      Object.keys(bookmarks[filepath]).forEach(cat => {
        //for each category
        bookmarks[filepath][cat] = bookmarks[filepath][cat].map(decoObject => {
          // Fix - rebuild range object (it is expected by other functions)
          if (decoObject.range && 
              Array.isArray(decoObject.range) && 
              decoObject.range.length === 2 &&
              typeof decoObject.range[0] === 'object' && 
              typeof decoObject.range[1] === 'object' &&
              'line' in decoObject.range[0] && 
              'character' in decoObject.range[0] && 
              'line' in decoObject.range[1] && 
              'character' in decoObject.range[1]) {
            
            decoObject.range = new vscode.Range(
              decoObject.range[0].line, 
              decoObject.range[0].character, 
              decoObject.range[1].line, 
              decoObject.range[1].character
            );
          } else {
            console.warn('Invalid range object found in workspace storage');
            // Create a default range if invalid
            decoObject.range = new vscode.Range(0, 0, 0, 0);
          }
          return decoObject;
        });
      });
    });
    
    return bookmarks;
  }
}