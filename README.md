# bytes032 bookmarks

Code navigation for inline bookmarks made easy, with enhanced export and state management capabilities.

## Overview

bytes032 bookmarks is an enhanced fork of the original Inline Bookmarks extension with improved bookmark state management and export functionality. It allows you to:

* Use words in your code that are automatically highlighted as bookmarks
* Track which bookmarks have been processed/reviewed
* Export only unprocessed bookmarks to JSON
* Sync bookmarks with external systems via API

## Key Features

### 🔖 Customizable Inline Bookmarks

The extension supports different bookmark styles (red, green, blue, purple) with fully customizable trigger words:

* `@todo` - (blue) General ToDo remark
* `@note` - (blue) General remark
* `@audit` - (red) General bookmark for potential issues
* `@audit-info` - (blue) Information to be noted for later use
* `@audit-ok` - (green) Confirmation that a line is working as expected
* `@audit-issue` - (purple) Mark a code location for an issue

### 🔄 Advanced Bookmark State Management

One of the key enhancements in this fork is the ability to track the state of bookmarks:

* Bookmarks can be marked as processed or unprocessed
* The state persists between VS Code sessions
* Processed bookmarks can be filtered out during export

### 📤 Improved Export Functionality

* Export bookmarks to JSON with the command `bytes032Bookmarks.exportToJson`
* Only unprocessed bookmarks are included in the export
* Project name is included in the exported data
* Export is copied to clipboard automatically

### 🔄 Sync with External Systems

* Send bookmarks to external systems via API
* Configure API endpoint in settings
* Bookmarks are automatically marked as processed after sync

## Commands

* `bytes032 bookmarks: Process Bookmarks` - Mark all bookmarks as processed
* `bytes032 bookmarks: Export Bookmarks to JSON` - Export unprocessed bookmarks to JSON
* `bytes032 bookmarks: Sync Bookmarks` - Export unprocessed bookmarks via API and mark as processed

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

### Custom Styles

You can define custom bookmark styles:

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

This extension is not published to the VS Code Marketplace. To install it:

1. Download the VSIX file from the releases
2. In VS Code, go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu (three dots) in the top-right corner
4. Select "Install from VSIX..."
5. Navigate to and select the downloaded VSIX file

Alternatively, use the command line:
```bash
code --install-extension bytes032-bookmarks-0.2.0.vsix
```

## Credits

This extension is a fork of [Inline Bookmarks](https://github.com/tintinweb/vscode-inline-bookmarks) with enhanced functionality for bookmark state management and export.
