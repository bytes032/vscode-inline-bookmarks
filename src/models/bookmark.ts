import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { IBookmark, IExportBookmark } from '../types';

export class Bookmark implements IBookmark {
  public id: string;
  public text: string;
  public range: vscode.Range;
  public processed: boolean;

  constructor(
    text: string,
    range: vscode.Range,
    fileUri: string,
    category: string,
    processed: boolean = false
  ) {
    this.text = text;
    this.range = range;
    this.processed = processed;
    
    // Generate ID based on file location, content, and category
    this.id = this.generateId(fileUri, category, range.start.line, text);
  }

  private generateId(fileUri: string, category: string, line: number, text: string): string {
    // Create a unique ID using SHA-1 hash of the bookmark details
    return crypto.createHash('sha1')
      .update(JSON.stringify({
        uri: fileUri,
        category: category,
        line: line,
        text: text.trim()
      }))
      .digest('hex');
  }

  /**
   * Create a deep link to this bookmark
   * @param fileUri The file URI where the bookmark is located
   * @returns A string containing the deeplink in format: windsurf://file//<filepath>:<line>
   */
  public createDeeplink(fileUri: string): string {
    const filePath = vscode.Uri.parse(fileUri).fsPath;
    return `windsurf://file/${filePath}:${this.range.start.line + 1}`;
  }

  /**
   * Creates an export representation of this bookmark
   * @param fileUri The file URI where the bookmark is located
   * @param category The category this bookmark belongs to
   * @returns An object ready to be included in the export data
   */
  public toExportFormat(fileUri: string, category: string): IExportBookmark {
    return {
      text: this.text,
      deeplink: this.createDeeplink(fileUri),
      type: category
    };
  }
}