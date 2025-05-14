export const COLORS = {
  BLUE: '#157EFB',
  GREEN: '#2FCE7C',
  PURPLE: '#C679E0',
  RED: '#F44336'
};

export const EXTENSION_ID = 'bytes032-bookmarks';

export const COMMANDS = {
  PROCESS_BOOKMARKS: 'bytes032Bookmarks.processBookmarks',
  EXPORT_TO_JSON: 'bytes032Bookmarks.exportToJson',
  SYNC_BOOKMARKS: 'bytes032Bookmarks.syncBookmarks',
  RESET_STATE: 'bytes032Bookmarks.debug.state.reset'
};

export const WORKSPACE_STATE_KEY = 'bookmarks.object';

export const BOOKMARK_STATE_FILENAME = 'bookmark-states.json';

export const DEFAULT_API_URL = 'https://api.example.com/bookmarks';

export const DEFAULT_PROJECT_NAME = '${workspaceFolderBasename}';