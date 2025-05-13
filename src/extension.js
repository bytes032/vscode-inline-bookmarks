'use strict';
/** 
 * @author github.com/tintinweb
 *  
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const settings = require('./settings');
const {InlineBookmarksCtrl, InlineBookmarkTreeDataProvider} = require('./features/inlineBookmarks');
const GitIgnore = require('./features/gitignore');


function onActivate(context) {
    const auditTags = new InlineBookmarksCtrl(context);
    const treeDataProvider = new InlineBookmarkTreeDataProvider(auditTags);

    context.subscriptions.push(
        vscode.commands.registerCommand("inlineBookmarks.debug.state.reset", () => {
            auditTags.resetWorkspace();
            auditTags.loadFromWorkspace();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("inlineBookmarks.processBookmarks", async () => {
            try {
                // Show status while processing
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
                statusBar.text = "$(search) Processing bookmarks...";
                statusBar.show();
                
                // Refresh and scan workspace for bookmarks
                auditTags.commands.refresh();
                await auditTags.commands.scanWorkspaceBookmarks();
                
                // Now create a structured array of all bookmarks with their data
                const bookmarksArray = [];
                const crypto = require('crypto');
                const path = require('path');
                
                // Process all bookmarks in all files
                Object.keys(auditTags.bookmarks).forEach(fileUri => {
                    const fileObj = {
                        fileUri: fileUri,
                        fileName: path.basename(vscode.Uri.parse(fileUri).fsPath),
                        categories: {}
                    };
                    
                    // Process each category of bookmarks
                    Object.keys(auditTags.bookmarks[fileUri]).forEach(category => {
                        fileObj.categories[category] = [];
                        
                        // Process each bookmark
                        auditTags.bookmarks[fileUri][category].forEach(bookmark => {
                            // Mark as processed
                            bookmark.processed = true;
                            
                            // Get the file path from URI
                            const filePath = vscode.Uri.parse(fileUri).fsPath;
                            
                            // Create deeplink for this bookmark
                            // Format: windsurf://file//<filepath>:<line>
                            const deeplink = `windsurf://file/${filePath}:${bookmark.range.start.line + 1}`;
                            
                            // Create a clean version for JSON
                            const cleanBookmark = {
                                id: crypto.createHash('sha1').update(JSON.stringify({
                                    uri: fileUri,
                                    category: category,
                                    line: bookmark.range.start.line,
                                    text: bookmark.text.trim()
                                })).digest('hex'),
                                text: bookmark.text,
                                line: bookmark.range.start.line,
                                processed: true,
                                deeplink: deeplink, // Add the deeplink
                                range: {
                                    start: {
                                        line: bookmark.range.start.line,
                                        character: bookmark.range.start.character
                                    },
                                    end: {
                                        line: bookmark.range.end.line,
                                        character: bookmark.range.end.character
                                    }
                                }
                            };
                            
                            fileObj.categories[category].push(cleanBookmark);
                        });
                    });
                    
                    bookmarksArray.push(fileObj);
                });
                
                // Create debug info object
                const debugInfo = {
                    timestamp: new Date().toISOString(),
                    totalFiles: bookmarksArray.length,
                    bookmarks: bookmarksArray
                };
                
                // Copy to clipboard
                const jsonString = JSON.stringify(debugInfo, null, 2);
                await vscode.env.clipboard.writeText(jsonString);
                
                // Hide status bar and show success message
                statusBar.hide();
                vscode.window.showInformationMessage(
                    `Processed ${debugInfo.totalFiles} files with bookmarks. Debug data copied to clipboard.`
                );
                
                // Refresh decorations
                treeDataProvider.refresh();
            } catch (error) {
                console.error('Error processing bookmarks:', error);
                vscode.window.showErrorMessage(`Error processing bookmarks: ${error.message}`);
            }
        })
    );

    

    /** module init */
    auditTags.commands.refresh();
    treeDataProvider.refresh();

    // Define activeEditor for use in event handlers
    let activeEditor = vscode.window.activeTextEditor;

    /** event setup */
    /***** OnChange */
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            onDidChange(editor);
        }
    }, null, context.subscriptions);
    
    /***** OnChange */
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            onDidChange(vscode.window.activeTextEditor, event);
        }
    }, null, context.subscriptions);
    
    /***** OnSave */
    vscode.workspace.onDidSaveTextDocument(document => {
        onDidSave(vscode.window.activeTextEditor);  
    }, null, context.subscriptions);
    
    /****** OnOpen */
    vscode.workspace.onDidOpenTextDocument(document => {
        onDidSave(vscode.window.activeTextEditor);  
    }, null, context.subscriptions);

    /****** OnClose */
    vscode.workspace.onDidCloseTextDocument(document => {
        onDidSave();  
    }, null, context.subscriptions);

    /************* handler */
    async function onDidChange(editor, event) {
        return new Promise((resolve,reject) => {
            if(settings.extensionConfig().enable){
                auditTags.decorate(editor);
            }
            treeDataProvider.refresh();
            resolve();
        });
    }
    async function onDidSave(editor) {
        return new Promise((resolve,reject) => {
            if(editor && settings.extensionConfig().enable){
                auditTags.decorate(editor);
            }
            treeDataProvider.refresh();
            resolve();
        });
    }

    /************* file-system watcher features */
    if(settings.extensionConfig().view.exclude.gitIgnore){
        /* optional feature */
        const gitIgnoreFilter = new GitIgnore();
        // Initialize the GitIgnore file watcher for excluding files
        const gitIgnoreWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
        context.subscriptions.push(gitIgnoreWatcher);
        
        gitIgnoreWatcher.onDidChange(uri => gitIgnoreFilter.onDidChange(uri));
        gitIgnoreWatcher.onDidDelete(uri => gitIgnoreFilter.onDidDelete(uri));
        gitIgnoreWatcher.onDidCreate(uri => gitIgnoreFilter.onDidChange(uri));

        vscode.workspace.findFiles('**/.gitignore', '**​/node_modules/**', 20).then(uri => {
            if(uri && uri.length){
                uri.forEach(u => gitIgnoreFilter.onDidChange(u));
            }
        });
    }
}

/* exports */
exports.activate = onActivate;