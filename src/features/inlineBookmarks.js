'use strict';
/** 
 * @author github.com/tintinweb
 *  
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const settings = require('../settings');
const os = require("os");

/**
 * @typedef {Object} BookmarkState
 * @property {string} id - The bookmark's unique identifier
 * @property {boolean} processed - Whether the bookmark has been processed
 */

/**
 * @typedef {Object} BookmarkStateDatabase
 * @property {Object.<string, BookmarkState>} bookmarks - Map of bookmark IDs to their states
 * @property {string} lastUpdated - ISO string of when the database was last updated
 */

/**
 * Manages the persistence of bookmark processing states in a local JSON file
 */
class BookmarkStateManager {
    /**
     * Creates a new BookmarkStateManager
     * @param {string} workspaceRoot - The root path of the workspace
     */
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.dbPath = path.join(workspaceRoot, '.vscode', 'bookmark-states.json');
        this.states = { bookmarks: {}, lastUpdated: new Date().toISOString() };
        this._loadDatabase();
    }
    
    /**
     * Loads the bookmark state database from disk
     * @private
     */
    _loadDatabase() {
        try {
            // Create .vscode directory if it doesn't exist
            const vscodeDir = path.join(this.workspaceRoot, '.vscode');
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
            }
            
            // Load existing database or create a new one
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.states = JSON.parse(data);
                console.log(`Loaded ${Object.keys(this.states.bookmarks).length} bookmark states`);
            } else {
                // Initialize with empty database
                this._saveDatabase();
                console.log('Created new bookmark state database');
            }
        } catch (error) {
            console.error('Error loading bookmark state database:', error);
            // Initialize with empty database on error
            this.states = { bookmarks: {}, lastUpdated: new Date().toISOString() };
        }
    }
    
    /**
     * Saves the bookmark state database to disk
     * @private
     */
    _saveDatabase() {
        try {
            this.states.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.dbPath, JSON.stringify(this.states, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving bookmark state database:', error);
        }
    }
    
    /**
     * Gets the processed state of a bookmark
     * @param {string} bookmarkId - The unique identifier of the bookmark
     * @returns {boolean} Whether the bookmark has been processed
     */
    isProcessed(bookmarkId) {
        return Boolean(this.states.bookmarks[bookmarkId]?.processed);
    }
    
    /**
     * Sets the processed state of a bookmark
     * @param {string} bookmarkId - The unique identifier of the bookmark
     * @param {boolean} processed - Whether the bookmark has been processed
     */
    setProcessed(bookmarkId, processed) {
        if (!this.states.bookmarks[bookmarkId]) {
            this.states.bookmarks[bookmarkId] = { id: bookmarkId, processed: false };
        }
        
        this.states.bookmarks[bookmarkId].processed = Boolean(processed);
        this._saveDatabase();
    }
    
    /**
     * Toggles the processed state of a bookmark
     * @param {string} bookmarkId - The unique identifier of the bookmark
     * @returns {boolean} The new processed state
     */
    toggleProcessed(bookmarkId) {
        const newState = !this.isProcessed(bookmarkId);
        this.setProcessed(bookmarkId, newState);
        return newState;
    }
    
    /**
     * Gets all processed bookmark IDs
     * @returns {string[]} Array of processed bookmark IDs
     */
    getProcessedBookmarks() {
        return Object.entries(this.states.bookmarks)
            .filter(([, state]) => state.processed)
            .map(([id]) => id);
    }
}

class Commands {
    constructor(controller) {
        this.controller = controller;
    }

    /**
     * Refreshes bookmark data by reloading from workspace
     */
    refresh() {
        this.controller._reset = true;
        this.controller.loadFromWorkspace();
    }

    /**
     * Scans the workspace for bookmarks
     * @returns {Promise} A promise that resolves when the scan is complete
     */
    scanWorkspaceBookmarks() {
        const arrayToSearchGlobPattern = (config) => {
            return Array.isArray(config) ?
                '{' + config.join(',') + '}'
                : (typeof config == 'string' ? config : '');
        };

        let includePattern = arrayToSearchGlobPattern(settings.extensionConfig().search.includes) || '{**/*}';
        let excludePattern = arrayToSearchGlobPattern(settings.extensionConfig().search.excludes);
        let limit = settings.extensionConfig().search.maxFiles;

        return new Promise((resolve, reject) => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Scanning for bookmarks",
                cancellable: true
            }, async (progress, token) => {
    
                token.onCancellationRequested(() => {
                    console.log("User canceled the scan operation");
                    reject(new Error("Operation cancelled"));
                });
    
                try {
                    let files = await vscode.workspace.findFiles(includePattern, excludePattern, limit);
                    
                    let cnt = 0;
                    for (let i = 0; i < files.length; i++) {
                        if (token.isCancellationRequested) {
                            reject(new Error("Operation cancelled"));
                            return;
                        }
                        try {
                            await vscode.workspace.openTextDocument(files[i]).then(document => {
                                return this.controller.updateBookmarks(document);
                            });
                        } catch(e){
                            console.warn(`Error while scanning document ${files[i]}: ${e}`);
                        }
                        
                        progress.report({
                            increment: 100 / files.length,
                            message: `Scanning file ${i + 1}/${files.length} (${cnt} bookmarks)`
                        });
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}

class InlineBookmarksCtrl {
    /**
     * @param {vscode.ExtensionContext} context - The VS Code extension context
     */
    constructor(context) {
        this.context = context;
        this.styles = this._reLoadDecorations();
        this.words = this._reLoadWords();
        
        this.commands = new Commands(this);
        
        /**
         * The decoration cache
         * @type {Map<string, any>}
         */
        this.decorationCache = new Map();

        /**
         * Bookmarks storage
         * bookmark: {range, text, id}
         * this.bookmarks[uri][style] = [bookmark];
         * @type {Object.<string, Object.<string, Array<{range: vscode.Range, text: string, id: string}>>>}
         */
        this.bookmarks = {};
        
        /**
         * Bookmark state manager for tracking processed state in JSON file
         * @type {BookmarkStateManager}
         */
        this._stateManager = null;
        
        // Initialize the state manager first
        this._initStateManager();
        
        // Then load workspace bookmarks
        this.loadFromWorkspace();
    }
    
    /**
     * Initializes the bookmark state manager
     * @private
     */
    _initStateManager() {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            this._stateManager = new BookmarkStateManager(workspaceRoot);
            console.log('Bookmark state manager initialized with workspace root:', workspaceRoot);
        } else {
            console.log('No workspace folder available, bookmark states will not be persisted');
        }
    }

    /** -- public -- */

    hasBookmarks() {
        return !!this.bookmarks;
    }

    async decorate(editor) {
        if (!editor || !editor.document /*|| editor.document.fileName.startsWith("extension-output-")*/) return; //decorate list of inline comments

        this._clearBookmarksOfFile(editor.document);

        if (this._extensionIsBlacklisted(editor.document.fileName)) return;

        for (var style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length == 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue;
            }
            this._decorateWords(editor, this.words[style], style, editor.document.fileName.startsWith("extension-output-")); //dont add to bookmarks if we're decorating an extension-output
        }

        this.saveToWorkspace(); //update workspace
    }

    async updateBookmarks(document) {
        if (!document || document.fileName.startsWith("extension-output-")) return;

        this._clearBookmarksOfFile(document);

        if (this._extensionIsBlacklisted(document.fileName)) return;

        for (var style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length == 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue;
            }
            this._updateBookmarksForWordAndStyle(document, this.words[style], style);
        }

        this.saveToWorkspace(); //update workspace
    }

    /** -- private -- */

    _extensionIsBlacklisted(fileName) {
        let ignoreList = settings.extensionConfig().exceptions.file.extensions.ignore;
        if (!ignoreList || ignoreList.length === 0) return false;
        return this._commaSeparatedStringToUniqueList(ignoreList).some(ext => fileName.endsWith(ext.trim()));
    }

    _wordIsOnIgnoreList(word) {
        let ignoreList = settings.extensionConfig().exceptions.words.ignore;
        return this._commaSeparatedStringToUniqueList(ignoreList).some(ignoreWord => word.startsWith(ignoreWord.trim()));
    }

    _commaSeparatedStringToUniqueList(s) {
        if (!s) return [];
        return [...new Set(s.trim().split(',').map(e => e.trim()).filter(e => e.length))];
    }

    async _decorateWords(editor, words, style, noAdd) {
        const decoStyle = this.styles[style].type || this.styles['default'].type;

        let locations = this._findWords(editor.document, words, style);
        editor.setDecorations(decoStyle, locations);  // set decorations

        if (locations.length && !noAdd)
            this._addBookmark(editor.document, style, locations);
    }

    async _updateBookmarksForWordAndStyle(document, words, style) {

        let locations = this._findWords(document, words, style);

        if (locations.length)
            this._addBookmark(document, style, locations);
    }

    _findWords(document, words, style = 'default') {
        const text = document.getText();
        var locations = [];

        words.forEach(function (word) {

            var regEx = new RegExp(word, "g");
            let match;
            while (match = regEx.exec(text)) {

                var startPos = document.positionAt(match.index);
                var endPos = document.positionAt(match.index + match[0].trim().length);

                var fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/);

                const text = document.getText(new vscode.Range(startPos, fullLine.end));
                
                // Generate ID for tracking processed state
                const bookmarkId = crypto.createHash('sha1').update(JSON.stringify({
                    uri: document.uri.toString(),
                    category: style,
                    line: startPos.line,
                    text: text.trim()
                })).digest('hex');
                
                var decoration = {
                    range: new vscode.Range(startPos, endPos),
                    text: text,
                    id: bookmarkId
                };

                locations.push(decoration);
            }
        });

        return locations;
    }

    _clearBookmarksOfFile(document) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) return;
        delete this.bookmarks[filename];
    }

    _clearBookmarksOfFileAndStyle(document, style) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) return;
        delete this.bookmarks[filename][style];
    }

    _addBookmark(document, style, locations) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) {
            this.bookmarks[filename] = {};
        }
        this.bookmarks[filename][style] = locations;
    }

    _reLoadWords() {
        let defaultWords = {  // style: arr(regexWords)
            "blue": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.blue),
            "purple": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.purple),
            "green": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.green),
            "red": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.red)
        };

        return { ...defaultWords, ...settings.extensionConfig().expert.custom.words.mapping };
    }

    _getBookmarkDataUri(color) {
        return vscode.Uri.parse(
            "data:image/svg+xml," +
            encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${color}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
        );
    }

    _getDecorationStyle(decoOptions) {
        return { type: vscode.window.createTextEditorDecorationType(decoOptions), options: decoOptions };
    }

    _getDecorationDefaultStyle(color) {
        return this._getDecorationStyle({
            "gutterIconPath": this._getBookmarkDataUri(color),
            "overviewRulerColor": color+"B0",   // this is safe/suitable for the defaults only.  Custom ruler color is handled below.
            "light": {
                "fontWeight": "bold"
            },
            "dark": {
                "color": "Chocolate"
            }
        })
    }

    _reLoadDecorations() {
        const blue      = '#157EFB';
        const green     = '#2FCE7C';
        const purple    = '#C679E0';
        const red       = '#F44336';
        let styles      = {
            "default":  this._getDecorationDefaultStyle(blue),
            "red":      this._getDecorationDefaultStyle(red),
            "blue":     this._getDecorationDefaultStyle(blue),
            "green":    this._getDecorationDefaultStyle(green),
            "purple":   this._getDecorationDefaultStyle(purple)
        };

        let customStyles = settings.extensionConfig().expert.custom.styles;

        for (var decoId in customStyles) {

            if (!customStyles.hasOwnProperty(decoId)) {
                continue;
            }

            let decoOptions = { ...customStyles[decoId] };

            // default to blue if neither an icon path nor an icon color is specified
            if (!decoOptions.gutterIconPath) {
                decoOptions.gutterIconColor = decoOptions.gutterIconColor || blue;
            }

            //apply icon color if provided, otherwise fix the path
            decoOptions.gutterIconPath = decoOptions.gutterIconColor ? this._getBookmarkDataUri(decoOptions.gutterIconColor) : this.context.asAbsolutePath(decoOptions.gutterIconPath);

            //overview
            if (decoOptions.overviewRulerColor) {
                decoOptions.overviewRulerLane = vscode.OverviewRulerLane.Full;
            }
            //background color
            if (decoOptions.backgroundColor) {
                decoOptions.isWholeLine = true;
            }
            styles[decoId] = this._getDecorationStyle(decoOptions);
        }

        return styles;
    }

    _isWorkspaceAvailable() {
        //single or multi root
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1;
    }

    resetWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this.context.workspaceState.update("bookmarks.object", "{}");
    }

    saveToWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this.context.workspaceState.update("bookmarks.object", JSON.stringify(this.bookmarks));
    }

    loadFromWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot load
        this.bookmarks = JSON.parse(this.context.workspaceState.get("bookmarks.object", "{}"));

        //remove all non existing files
        Object.keys(this.bookmarks).forEach(filepath => {
            if (!fs.existsSync(vscode.Uri.parse(filepath).fsPath)) {
                delete this.bookmarks[filepath];
                return;
            }

            Object.keys(this.bookmarks[filepath]).forEach(cat => {
                //for each category
                this.bookmarks[filepath][cat] = this.bookmarks[filepath][cat].map(decoObject => {
                    //fix - rebuild range object (it is expected by other functions)
                    decoObject.range = new vscode.Range(decoObject.range[0].line, decoObject.range[0].character, decoObject.range[1].line, decoObject.range[1].character);
                    return decoObject;
                });
            });
        });
    }
}

module.exports = {
    InlineBookmarksCtrl: InlineBookmarksCtrl
};
