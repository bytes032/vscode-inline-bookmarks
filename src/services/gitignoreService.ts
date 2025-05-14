import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import * as path from 'path';

// Import ignore with a dynamic require to work around the type issue
const ignoreLib = require('ignore');

/**
 * Handles gitignore file integration
 */
export class GitIgnoreService {
  private gitIgnoreFile: Record<
    string, 
    { 
      ignore: any, // Using any here due to import/type issues with the ignore library
      cache: Record<string, boolean>
    }
  > = {};

  /**
   * Handles changes to gitignore files
   * @param uri The URI of the changed gitignore file
   */
  public onDidChange(uri: vscode.Uri): void {
    vscode.workspace.fs.readFile(uri)
      .then((data) => {
        const dirPath = Utils.dirname(uri).toString();
        this.gitIgnoreFile[dirPath] = { 
          ignore: ignoreLib().add(new TextDecoder().decode(data)),
          cache: {} // fullpath -> result
        };
      });
  }

  /**
   * Handles deletion of gitignore files
   * @param uri The URI of the deleted gitignore file
   */
  public onDidDelete(uri: vscode.Uri): void {
    delete this.gitIgnoreFile[Utils.dirname(uri).toString()];
  }

  /**
   * Gets active ignore patterns for a file
   * @param uri The URI of the file to check
   * @returns Array of gitignore locations applicable to this file
   */
  public getActiveIgnorePatternsForFile(uri: vscode.Uri): string[] {
    /**
     * Check if target is a subdirectory of parent
     * @param parent Parent directory path
     * @param target Target path to check
     * @returns True if target is a subdirectory of parent
     */
    function isSubdir(parent: string, target: string): boolean {
      const relative = path.relative(parent, target);
      return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    }

    if (!Object.keys(this.gitIgnoreFile).length) {
      return [];
    }

    return Object.keys(this.gitIgnoreFile)
      .filter(gitIgnoreLocation => 
        isSubdir(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
      )
      .sort((a, b) => a.split('/').length - b.split('/').length);
  }

  /**
   * Checks if a file is ignored by any applicable gitignore files
   * @param uri The URI of the file to check
   * @returns True if the file should be ignored
   */
  public ignores(uri: vscode.Uri): boolean {
    const gitIgnoreFiles = this.getActiveIgnorePatternsForFile(uri);
    if (!gitIgnoreFiles.length) {
      return false;
    }

    return gitIgnoreFiles.some(gitIgnoreLocation => {
      const ig = this.gitIgnoreFile[gitIgnoreLocation];
      if (ig.cache[uri.fsPath] !== undefined) {
        return ig.cache[uri.fsPath]; // return cache result
      }
      const result = ig.ignore.ignores(
        path.relative(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
      );
      ig.cache[uri.fsPath] = result;
      return result;
    });
  }

  /**
   * Filter function for gitignore - returns true if file should be kept
   * @param uri The URI of the file to check
   * @returns True if the file should be kept (not ignored)
   */
  public filter(uri: vscode.Uri): boolean {
    return !this.ignores(uri); // ignores.true ==> filter.false (exclude)
  }
}