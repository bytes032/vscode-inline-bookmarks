import * as vscode from 'vscode';
import { StatusBarManager } from '../utils/statusBar';
import { BookmarkManager } from '../core/bookmarkManager';

/**
 * Command handler for processing all bookmarks
 * @param bookmarkManager The bookmark manager instance
 * @returns A promise that resolves when processing is complete
 */
export async function processBookmarksCommand(
  bookmarkManager: BookmarkManager
): Promise<void> {
  try {
    // Show status while processing
    const statusBar = new StatusBarManager();
    statusBar.show("$(search) Processing bookmarks...");
    
    // Refresh and scan workspace for bookmarks
    await bookmarkManager.scanWorkspaceBookmarks();
    
    // Process all bookmarks in all files and mark them as processed
    let processedCount = 0;
    
    Object.keys(bookmarkManager.bookmarks).forEach(fileUri => {
      // Process each category of bookmarks
      Object.keys(bookmarkManager.bookmarks[fileUri]).forEach(category => {
        // Process each bookmark
        bookmarkManager.bookmarks[fileUri][category].forEach(bookmark => {
          // Mark as processed
          bookmark.processed = true;
          processedCount++;
          
          // Store processed state
          bookmarkManager.setBookmarkProcessed(bookmark.id, true);
        });
      });
    });
    
    // Hide status bar and show success message
    statusBar.dispose();
    vscode.window.showInformationMessage(
      `Processed ${processedCount} bookmarks across ${Object.keys(bookmarkManager.bookmarks).length} files.`
    );
  } catch (error) {
    console.error('Error processing bookmarks:', error);
    vscode.window.showErrorMessage(`Error processing bookmarks: ${(error as Error).message}`);
  }
}