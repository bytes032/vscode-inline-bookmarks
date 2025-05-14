import * as vscode from 'vscode';
import { IExtensionConfig } from '../types';

/**
 * Get the extension configuration
 * @returns The extension configuration object
 */
export function getExtensionConfig(): IExtensionConfig {
  const config = vscode.workspace.getConfiguration('bytes032-bookmarks');
  // Convert to our type with a more type-safe approach
  return {
    enable: config.get<boolean>('enable', true),
    default: {
      words: {
        red: config.get<string>('default.words.red', ''),
        green: config.get<string>('default.words.green', ''),
        blue: config.get<string>('default.words.blue', ''),
        purple: config.get<string>('default.words.purple', '')
      }
    },
    exceptions: {
      words: {
        ignore: config.get<string>('exceptions.words.ignore', '')
      },
      file: {
        extensions: {
          ignore: config.get<string>('exceptions.file.extensions.ignore', '')
        }
      }
    },
    expert: {
      custom: {
        styles: config.get<Record<string, vscode.DecorationRenderOptions>>('expert.custom.styles', {}),
        words: {
          mapping: config.get<Record<string, string[]>>('expert.custom.words.mapping', {})
        }
      }
    },
    search: {
      includes: config.get<string[]>('search.includes', ['**/*']),
      excludes: config.get<string[]>('search.excludes', []),
      maxFiles: config.get<number>('search.maxFiles', 5120)
    },
    api: {
      url: config.get<string>('api.url', 'https://api.example.com/bookmarks'),
      key: config.get<string>('api.key', '')
    },
    project: {
      name: config.get<string>('project.name', '${workspaceFolderBasename}')
    }
  };
}

/**
 * Convert a comma-separated string to a unique list of trimmed strings
 * @param input Comma-separated string
 * @returns Array of unique, trimmed strings
 */
export function commaSeparatedStringToUniqueList(input: string | undefined): string[] {
  if (!input) return [];
  return [...new Set(input.trim().split(',').map(e => e.trim()).filter(e => e.length))];
}

/**
 * Convert an array of glob patterns to a string usable by VS Code's findFiles API
 * @param config Array of glob patterns or a string
 * @returns A glob pattern string
 */
export function arrayToSearchGlobPattern(config: string[] | string): string {
  return Array.isArray(config) 
    ? '{' + config.join(',') + '}'
    : (typeof config === 'string' ? config : '');
}