import * as vscode from 'vscode';
import { BookmarkManager } from '../core/bookmarkManager';

/**
 * Command handler for resetting internal state
 * @param bookmarkManager The bookmark manager instance
 * @returns A promise that resolves when reset is complete
 */
export async function resetStateCommand(
  bookmarkManager: BookmarkManager
): Promise<void> {
  try {
    // Reset workspace state
    bookmarkManager.resetWorkspace();
    
    // Reload from workspace
    bookmarkManager.loadFromWorkspace();
    
    // Show success message
    vscode.window.showInformationMessage('Bookmark internal state has been reset.');
  } catch (error) {
    console.error('Error resetting bookmark state:', error);
    vscode.window.showErrorMessage(`Error resetting state: ${(error as Error).message}`);
  }
}