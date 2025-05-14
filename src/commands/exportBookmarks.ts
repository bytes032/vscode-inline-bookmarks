import * as vscode from 'vscode';
import { StatusBarManager } from '../utils/statusBar';
import { BookmarkManager } from '../core/bookmarkManager';
import { IExportData, IExportBookmark } from '../types';
import { getExtensionConfig } from '../config/settings';
import { DEFAULT_PROJECT_NAME } from '../config/constants';

/**
 * Command handler for exporting bookmarks to JSON
 * @param bookmarkManager The bookmark manager instance
 * @returns A promise that resolves when export is complete
 */
export async function exportBookmarksCommand(
  bookmarkManager: BookmarkManager
): Promise<void> {
  try {
    // Show status while exporting
    const statusBar = new StatusBarManager();
    statusBar.show("$(json) Exporting bookmarks to JSON...");
    
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
    
    // Scan workspace to update bookmarks
    await bookmarkManager.scanWorkspaceBookmarks();
    
    // Array to store simplified bookmark data
    const unprocessedBookmarks: IExportBookmark[] = [];
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
    
    // Prepare the output with project name and bookmarks
    const output: IExportData = {
      project: projectName,
      bookmarks: unprocessedBookmarks
    };
    
    // Copy to clipboard
    const jsonString = JSON.stringify(output, null, 2);
    await vscode.env.clipboard.writeText(jsonString);
    
    // Hide status bar and show success message
    statusBar.dispose();
    vscode.window.showInformationMessage(
      `Exported ${totalUnprocessed} unprocessed bookmarks to JSON. Data copied to clipboard.`
    );
  } catch (error) {
    console.error('Error exporting bookmarks to JSON:', error);
    vscode.window.showErrorMessage(`Error exporting bookmarks: ${(error as Error).message}`);
  }
}