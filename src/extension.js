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
const {InlineBookmarksCtrl} = require('./features/inlineBookmarks');


function onActivate(context) {
    const auditTags = new InlineBookmarksCtrl(context);

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
                
                // Import required modules
                const crypto = require('crypto');
                
                // Refresh and scan workspace for bookmarks
                auditTags.commands.refresh();
                await auditTags.commands.scanWorkspaceBookmarks();
                
                // Process all bookmarks in all files and mark them as processed
                let processedCount = 0;
                
                Object.keys(auditTags.bookmarks).forEach(fileUri => {
                    // Process each category of bookmarks
                    Object.keys(auditTags.bookmarks[fileUri]).forEach(category => {
                        // Process each bookmark
                        auditTags.bookmarks[fileUri][category].forEach(bookmark => {
                            // Mark as processed
                            bookmark.processed = true;
                            processedCount++;
                            
                            // Generate ID for tracking processed state
                            const bookmarkId = crypto.createHash('sha1').update(JSON.stringify({
                                uri: fileUri,
                                category: category,
                                line: bookmark.range.start.line,
                                text: bookmark.text.trim()
                            })).digest('hex');
                            
                            // Store processed state if state manager is available
                            if (auditTags._stateManager) {
                                auditTags._stateManager.setProcessed(bookmarkId, true);
                            }
                        });
                    });
                });
                
                // Hide status bar and show success message
                statusBar.hide();
                vscode.window.showInformationMessage(
                    `Processed ${processedCount} bookmarks across ${Object.keys(auditTags.bookmarks).length} files.`
                );
            } catch (error) {
                console.error('Error processing bookmarks:', error);
                vscode.window.showErrorMessage(`Error processing bookmarks: ${error.message}`);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand("inlineBookmarks.exportToJson", async () => {
            try {
                // Show status while exporting
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
                statusBar.text = "$(json) Exporting bookmarks to JSON...";
                statusBar.show();
                
                // Import required modules
                const path = require('path');
                
                // Array to store simplified bookmark data
                const unprocessedBookmarks = [];
                let totalUnprocessed = 0;
                
                // Process all bookmarks in all files
                Object.keys(auditTags.bookmarks).forEach(fileUri => {
                    // Process each category of bookmarks
                    Object.keys(auditTags.bookmarks[fileUri]).forEach(category => {
                        // Process each bookmark
                        auditTags.bookmarks[fileUri][category].forEach(bookmark => {
                            // Only include unprocessed bookmarks
                            if (bookmark.processed !== true) {
                                totalUnprocessed++;
                                
                                // Get the file path from URI
                                const filePath = vscode.Uri.parse(fileUri).fsPath;
                                
                                // Create deeplink for this bookmark
                                // Format: windsurf://file//<filepath>:<line>
                                const deeplink = `windsurf://file/${filePath}:${bookmark.range.start.line + 1}`;
                                
                                // Create simplified bookmark object
                                unprocessedBookmarks.push({
                                    text: bookmark.text,
                                    deeplink: deeplink,
                                    type: category
                                });
                            }
                        });
                    });
                });
                
                // Create the simplified output object
                const output = {
                    timestamp: new Date().toISOString(),
                    totalUnprocessed: totalUnprocessed,
                    bookmarks: unprocessedBookmarks
                };
                
                // Copy to clipboard
                const jsonString = JSON.stringify(output, null, 2);
                await vscode.env.clipboard.writeText(jsonString);
                
                // Hide status bar and show success message
                statusBar.hide();
                vscode.window.showInformationMessage(
                    `Exported ${totalUnprocessed} unprocessed bookmarks to JSON. Data copied to clipboard.`
                );
            } catch (error) {
                console.error('Error exporting bookmarks to JSON:', error);
                vscode.window.showErrorMessage(`Error exporting bookmarks: ${error.message}`);
            }
        })
    );

    

    /** module init */
    auditTags.commands.refresh();

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
            resolve();
        });
    }
    async function onDidSave(editor) {
        return new Promise((resolve,reject) => {
            if(editor && settings.extensionConfig().enable){
                auditTags.decorate(editor);
            }
            resolve();
        });
    }

    // No file-system watcher features needed without tree view
}

/* exports */
exports.activate = onActivate;