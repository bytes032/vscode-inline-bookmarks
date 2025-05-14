import * as vscode from 'vscode';
import { StatusBarManager } from '../utils/statusBar';
import { BookmarkManager } from '../core/bookmarkManager';
import { ApiService } from '../services/apiService';
import { getExtensionConfig } from '../config/settings';
import { IBookmarkToProcess, IExportData, IExportBookmark } from '../types';
import { DEFAULT_PROJECT_NAME } from '../config/constants';

/**
 * Command handler for syncing bookmarks with external API
 * @param bookmarkManager The bookmark manager instance
 * @returns A promise that resolves when sync is complete
 */
export async function syncBookmarksCommand(
  bookmarkManager: BookmarkManager
): Promise<void> {
  try {
    // Show status bar indicator
    const statusBar = new StatusBarManager();
    statusBar.show("$(sync) Syncing bookmarks...");
    
    // Initialize API service
    const apiService = new ApiService();
    
    // Validate API configuration
    const validationResult = apiService.validateApiConfig();
    if (!validationResult.isValid) {
      statusBar.dispose();
      vscode.window.showErrorMessage(validationResult.message || 'API configuration is invalid');
      return;
    }
    
    // Get project name from configuration
    const config = getExtensionConfig();
    let projectName = config.project.name || '';
    
    // If project name is not set or is the default variable, check workspace
    if (projectName === DEFAULT_PROJECT_NAME) {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        projectName = vscode.workspace.workspaceFolders[0].name;
      } else {
        // If no workspace is open and no project name is specified, abort
        statusBar.dispose();
        vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
        return;
      }
    } else if (!projectName) {
      // Empty project name
      statusBar.dispose();
      vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
      return;
    }
    
    // Refresh and scan workspace for up-to-date bookmarks
    await bookmarkManager.scanWorkspaceBookmarks();
    
    // Array to store bookmark data and track IDs for processing later
    const unprocessedBookmarks: IExportBookmark[] = [];
    const bookmarkIdsToProcess: IBookmarkToProcess[] = [];
    let totalUnprocessed = 0;
    
    // Process all bookmarks in all files
    Object.keys(bookmarkManager.bookmarks).forEach(fileUri => {
      // Process each category of bookmarks
      Object.keys(bookmarkManager.bookmarks[fileUri]).forEach(category => {
        // Process each bookmark
        bookmarkManager.bookmarks[fileUri][category].forEach(bookmark => {
          // Only include unprocessed bookmarks
          if (!bookmarkManager.isBookmarkProcessed(bookmark.id)) {
            totalUnprocessed++;
            
            // Get the file path from URI
            const filePath = vscode.Uri.parse(fileUri).fsPath;
            
            // Create deeplink for this bookmark
            const deeplink = `windsurf://file/${filePath}:${bookmark.range.start.line + 1}`;
            
            // Save ID for processing after API call
            bookmarkIdsToProcess.push({
              id: bookmark.id,
              fileUri: fileUri,
              category: category,
              bookmark: bookmark
            });
            
            // Create simplified bookmark object
            unprocessedBookmarks.push({
              text: bookmark.text,
              deeplink: deeplink,
              type: category
            });
          }
        });
      });
    });
    
    // If there are no unprocessed bookmarks, show message and return
    if (totalUnprocessed === 0) {
      statusBar.dispose();
      vscode.window.showInformationMessage('No unprocessed bookmarks found.');
      return;
    }
    
    // Prepare the output with project name and bookmarks
    const output: IExportData = {
      project: projectName,
      bookmarks: unprocessedBookmarks
    };
    
    // Make API call with the unprocessed bookmarks
    statusBar.update(`$(sync~spin) Sending ${totalUnprocessed} bookmarks to API...`);
    
    // Make API call
    try {
      await apiService.sendBookmarks(output);
      
      // Mark all bookmarks as processed
      statusBar.update("$(check) Marking bookmarks as processed...");
      
      // Process all bookmarks
      bookmarkIdsToProcess.forEach(item => {
        // Mark the bookmark object as processed
        item.bookmark.processed = true;
        
        // Update bookmark state
        bookmarkManager.setBookmarkProcessed(item.id, true);
      });
      
      // Show success message
      statusBar.dispose();
      vscode.window.showInformationMessage(
        `Synced ${totalUnprocessed} bookmarks to API and marked them as processed.`
      );
    } catch (error) {
      statusBar.dispose();
      throw error;
    }
  } catch (error) {
    console.error('Error syncing bookmarks:', error);
    vscode.window.showErrorMessage(`Error syncing bookmarks: ${(error as Error).message}`);
  }
}