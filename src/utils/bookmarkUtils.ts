import * as vscode from 'vscode';
import { Bookmark } from '../models/bookmark';
import { getExtensionConfig, commaSeparatedStringToUniqueList } from '../config/settings';

/**
 * Utilities for finding and managing bookmarks
 */
export class BookmarkUtils {
  /**
   * Checks if a file extension is on the ignore list
   * @param fileName The file name to check
   * @returns True if the file should be ignored
   */
  public static extensionIsBlacklisted(fileName: string): boolean {
    const ignoreList = getExtensionConfig().exceptions.file.extensions.ignore;
    if (!ignoreList || ignoreList.length === 0) return false;
    
    return commaSeparatedStringToUniqueList(ignoreList).some(ext => 
      fileName.endsWith(ext.trim())
    );
  }
  
  /**
   * Checks if a word is on the ignore list
   * @param word The word to check
   * @returns True if the word should be ignored
   */
  public static wordIsOnIgnoreList(word: string): boolean {
    const ignoreList = getExtensionConfig().exceptions.words.ignore;
    
    return commaSeparatedStringToUniqueList(ignoreList).some(ignoreWord => 
      word.startsWith(ignoreWord.trim())
    );
  }
  
  /**
   * Find words matching the given patterns in a document
   * @param document The document to search in
   * @param words Array of regex patterns to find
   * @param style The bookmark style/category
   * @returns Array of found bookmarks
   */
  public static findWords(document: vscode.TextDocument, words: string[], style = 'default'): Bookmark[] {
    const text = document.getText();
    const bookmarks: Bookmark[] = [];
    
    words.forEach(word => {
      const regEx = new RegExp(word, "g");
      let match;
      
      while (match = regEx.exec(text)) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].trim().length);
        
        const fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/);
        
        if (!fullLine) continue;
        
        const lineText = document.getText(new vscode.Range(startPos, fullLine.end));
        
        const bookmark = new Bookmark(
          lineText,
          new vscode.Range(startPos, endPos),
          document.uri.toString(),
          style
        );
        
        bookmarks.push(bookmark);
      }
    });
    
    return bookmarks;
  }
}