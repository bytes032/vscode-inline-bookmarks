# bytes032 Bookmarks

A powerful VS Code extension for managing inline bookmarks with enhanced export and state management capabilities.

![Bookmarks Preview](images/icon_large.png)

## Overview

bytes032 Bookmarks is a feature-rich VS Code extension that enables you to mark, track, and manage inline bookmarks in your code. It provides customizable bookmark types, state tracking, and powerful export functionality to external systems.

This extension allows you to:

* Create visual bookmarks using trigger words (`@audit`, `@todo`, etc.)
* Track which bookmarks have been processed or reviewed
* Export unprocessed bookmarks to JSON for external use
* Sync bookmarks with external systems via API
* Customize bookmark styles and appearances

## Features

### 🔖 Customizable Inline Bookmarks

The extension supports different bookmark styles, each with customizable trigger words:

| Style | Default Trigger Words | Purpose |
|-------|----------------------|---------|
| 🔴 Red | `@audit` | Mark code that needs auditing or critical review |
| 🟢 Green | `@audit-ok` | Mark code that has been verified as correct |
| 🔵 Blue | `@todo`, `@note`, `@audit-info`, `@remind`, `@follow-up` | General remarks, todos, or informational notes |
| 🟣 Purple | `@audit-issue` | Highlight specific issues in the code |

When you include these trigger words in your code comments, they are automatically detected and highlighted with gutter icons and ruler marks.

### 🔄 Bookmark State Management

A key feature of this extension is the ability to track which bookmarks have been processed:

* Bookmarks can be marked as "processed" or "unprocessed"
* The processed state persists between VS Code sessions
* You can filter out processed bookmarks during export

### 📤 Export Functionality

Export your bookmarks to JSON format for external use:

* Export only unprocessed bookmarks
* Include project name in the exported data
* Export is automatically copied to clipboard
* Customizable export format

Example export format:

```json
{
  "project": "my-project",
  "bookmarks": [
    {
      "text": "// This needs security review",
      "deeplink": "windsurf://file/path/to/file.js:42",
      "type": "red"
    },
    {
      "text": "// Implement this feature",
      "deeplink": "windsurf://file/path/to/another.js:15",
      "type": "blue"
    }
  ]
}
```

### 🔄 API Integration

Send bookmarks to external systems via API:

* Configure API endpoint in settings
* Secure authentication with API key
* Bookmarks are automatically marked as processed after sync
* Custom project name can be included in the data

## Commands

| Command | Description |
|---------|-------------|
| `bytes032 bookmarks: Process Bookmarks` | Mark all bookmarks as processed |
| `bytes032 bookmarks: Export Bookmarks to JSON` | Export unprocessed bookmarks to JSON (copied to clipboard) |
| `bytes032 bookmarks: Sync Bookmarks` | Send unprocessed bookmarks to configured API endpoint and mark them as processed |
| `bytes032 bookmarks:debug: Reset internal state` | Reset the extension's internal state (for troubleshooting) |

## Configuration

### API Settings

```json
"bytes032-bookmarks.api.url": "https://your-api-endpoint.com/bookmarks",
"bytes032-bookmarks.api.key": "your-api-key",
"bytes032-bookmarks.project.name": "${workspaceFolderBasename}"
```

### Bookmark Trigger Words

You can customize the words that trigger bookmarks:

```json
"bytes032-bookmarks.default.words.red": "@audit[\\s]",
"bytes032-bookmarks.default.words.green": "@audit\\-ok[\\s]",
"bytes032-bookmarks.default.words.blue": "@todo[\\s], @note[\\s]",
"bytes032-bookmarks.default.words.purple": "@audit\\-issue[\\s]"
```

### Search Settings

Control which files are scanned for bookmarks:

```json
"bytes032-bookmarks.search.includes": ["**/*"],
"bytes032-bookmarks.search.excludes": [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  // ...
],
"bytes032-bookmarks.search.maxFiles": 5120
```

### Custom Styles

Define your own bookmark styles with custom colors and appearance:

```json
"bytes032-bookmarks.expert.custom.styles": {
  "critical": {
    "gutterIconColor": "#FF0000",
    "overviewRulerColor": "#FF0000B0",
    "backgroundColor": "rgba(255, 0, 0, 0.1)",
    "fontWeight": "bold"
  }
}
```

## Installation

### From VSIX File

1. Download the latest `.vsix` file from the releases
2. In VS Code, go to Extensions view (Ctrl+Shift+X)
3. Click the "..." menu (three dots) in the top-right corner
4. Select "Install from VSIX..."
5. Navigate to and select the downloaded `.vsix` file

Alternatively, use the command line:

```bash
code --install-extension bytes032-bookmarks-0.2.0.vsix
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org) (v14 or newer)
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/bytes032/vscode-inline-bookmarks.git
   cd vscode-inline-bookmarks
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

### Development Workflow

1. Make your changes to the TypeScript files in the `src` directory
2. Build the extension: `npm run build`
3. Press F5 in VS Code to launch a development instance with your extension loaded

## Architecture

This extension is built with TypeScript and follows a modular architecture:

- **Core Module**: Manages bookmark detection, decoration, and state tracking
- **Command Handlers**: Implements the extension's commands
- **Services**: Handles API communication and gitignore integration
- **Persistence**: Manages state persistence across VS Code sessions

## Troubleshooting

### Reset State

If you encounter issues with bookmark state, you can reset the internal state using the `bytes032 bookmarks:debug: Reset internal state` command. This will clear all processed/unprocessed states.

### File Scanning Issues

If bookmarks are not being detected:

1. Check your configuration settings for `search.includes` and `search.excludes`
2. Ensure the file extensions are not in the ignore list
3. Try running the scan command manually

## Credits

This extension is a fork of [Inline Bookmarks](https://github.com/tintinweb/vscode-inline-bookmarks) with enhanced functionality for bookmark state management, export, and API integration.
