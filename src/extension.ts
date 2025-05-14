import * as vscode from 'vscode';
import { BookmarkManager } from './core/bookmarkManager';
import { 
  processBookmarksCommand, 
  exportBookmarksCommand, 
  syncBookmarksCommand, 
  resetStateCommand 
} from './commands';
import { getExtensionConfig } from './config/settings';
import { COMMANDS } from './config/constants';

/**
 * Activate the extension
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create the bookmark manager
  const bookmarkManager = new BookmarkManager(context);
  
  // Register the reset state command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.RESET_STATE, () => {
      resetStateCommand(bookmarkManager);
    })
  );
  
  // Register the process bookmarks command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.PROCESS_BOOKMARKS, async () => {
      await processBookmarksCommand(bookmarkManager);
    })
  );
  
  // Register the export bookmarks command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.EXPORT_TO_JSON, async () => {
      await exportBookmarksCommand(bookmarkManager);
    })
  );
  
  // Register the sync bookmarks command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SYNC_BOOKMARKS, async () => {
      await syncBookmarksCommand(bookmarkManager);
    })
  );
  
  // Set up event listeners
  // When the active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        onDidChange(editor);
      }
    })
  );
  
  // When text in document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
        onDidChange(vscode.window.activeTextEditor, event);
      }
    })
  );
  
  // When a document is saved
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      onDidSave(vscode.window.activeTextEditor);  
    })
  );
  
  // When a document is opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      onDidSave(vscode.window.activeTextEditor);  
    })
  );
  
  // When a document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      onDidSave();  
    })
  );
  
  /**
   * Handler for text change events
   * @param editor The active text editor
   * @param event The change event (optional)
   */
  async function onDidChange(editor: vscode.TextEditor, event?: vscode.TextDocumentChangeEvent): Promise<void> {
    if (getExtensionConfig().enable) {
      await bookmarkManager.decorate(editor);
    }
  }
  
  /**
   * Handler for document save events
   * @param editor The active text editor (optional)
   */
  async function onDidSave(editor?: vscode.TextEditor): Promise<void> {
    if (editor && getExtensionConfig().enable) {
      await bookmarkManager.decorate(editor);
    }
  }
}