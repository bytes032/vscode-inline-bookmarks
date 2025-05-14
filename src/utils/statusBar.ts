import * as vscode from 'vscode';

/**
 * Helper class for managing status bar items
 */
export class StatusBarManager {
  private statusBar: vscode.StatusBarItem | undefined;
  
  /**
   * Creates and shows a status bar item
   * @param text Text to display in the status bar
   * @returns The created status bar item
   */
  public show(text: string): vscode.StatusBarItem {
    // Clean up any existing status bar
    this.dispose();
    
    // Create new status bar
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    this.statusBar.text = text;
    this.statusBar.show();
    
    return this.statusBar;
  }
  
  /**
   * Updates the text of the current status bar item
   * @param text New text to display
   */
  public update(text: string): void {
    if (this.statusBar) {
      this.statusBar.text = text;
    }
  }
  
  /**
   * Hides and disposes the current status bar item
   */
  public dispose(): void {
    if (this.statusBar) {
      this.statusBar.hide();
      this.statusBar.dispose();
      this.statusBar = undefined;
    }
  }
}