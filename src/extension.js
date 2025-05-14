'use strict';
/** 
 * @author github.com/tintinweb
 *  
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const crypto = require('crypto');
const settings = require('./settings');
const {InlineBookmarksCtrl} = require('./features/inlineBookmarks');


function onActivate(context) {
    const auditTags = new InlineBookmarksCtrl(context);

    context.subscriptions.push(
        vscode.commands.registerCommand("bytes032Bookmarks.debug.state.reset", () => {
            auditTags.resetWorkspace();
            auditTags.loadFromWorkspace();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("bytes032Bookmarks.processBookmarks", async () => {
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
                            
                            // Store processed state if state manager is available
                            if (auditTags._stateManager) {
                                auditTags._stateManager.setProcessed(bookmark.id, true);
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
        vscode.commands.registerCommand("bytes032Bookmarks.exportToJson", async () => {
            try {
                // Show status while exporting
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
                statusBar.text = "$(json) Exporting bookmarks to JSON...";
                statusBar.show();
                
                // Get project name from configuration
                const config = vscode.workspace.getConfiguration('bytes032-bookmarks');
                let projectName = config.get('project.name') || '';
                
                // If project name is not set or is the default variable, check workspace
                if (projectName === '${workspaceFolderBasename}') {
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        projectName = vscode.workspace.workspaceFolders[0].name;
                    } else {
                        // If no workspace is open and no project name is specified, abort
                        statusBar.hide();
                        vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
                        return;
                    }
                } else if (!projectName) {
                    // Empty project name
                    statusBar.hide();
                    vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
                    return;
                }
                
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
                            if (!auditTags._stateManager || !auditTags._stateManager.isProcessed(bookmark.id)) {
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
                
                // Prepare the output with project name and bookmarks
                const output = {
                    project: projectName,
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

    

    /**
     * Sync bookmarks command - exports unprocessed bookmarks, makes API call, and marks as processed
     */
    context.subscriptions.push(
        vscode.commands.registerCommand("bytes032Bookmarks.syncBookmarks", async () => {
            try {
                // Show status bar indicator
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
                statusBar.text = "$(sync) Syncing bookmarks...";
                statusBar.show();
                
                // Import required modules
                const path = require('path');
                const crypto = require('crypto');
                const https = require('https');
                
                // Get API settings from configuration
                const config = vscode.workspace.getConfiguration('bytes032-bookmarks');
                const apiUrl = config.get('api.url');
                const apiKey = config.get('api.key');
                
                // Validate API URL and key
                if (!apiUrl || apiUrl === 'https://api.example.com/bookmarks') {
                    statusBar.hide();
                    vscode.window.showErrorMessage('API URL not configured. Please set bytes032-bookmarks.api.url in settings.');
                    return;
                }
                
                if (!apiKey || apiKey === 'demo-key-12345') {
                    statusBar.hide();
                    vscode.window.showErrorMessage('API key not configured. Please set bytes032-bookmarks.api.key in settings.');
                    return;
                }
                
                // Get project name from configuration
                let projectName = config.get('project.name') || '';
                
                // If project name is not set or is the default variable, check workspace
                if (projectName === '${workspaceFolderBasename}') {
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        projectName = vscode.workspace.workspaceFolders[0].name;
                    } else {
                        // If no workspace is open and no project name is specified, abort
                        statusBar.hide();
                        vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
                        return;
                    }
                } else if (!projectName) {
                    // Empty project name
                    statusBar.hide();
                    vscode.window.showErrorMessage('Project name not set. Please configure bytes032-bookmarks.project.name in settings.');
                    return;
                }
                
                // Refresh and scan workspace for up-to-date bookmarks
                auditTags.commands.refresh();
                await auditTags.commands.scanWorkspaceBookmarks();
                
                // Array to store bookmark data and track IDs for processing later
                const unprocessedBookmarks = [];
                const bookmarkIdsToProcess = [];
                let totalUnprocessed = 0;
                
                // Process all bookmarks in all files
                Object.keys(auditTags.bookmarks).forEach(fileUri => {
                    // Process each category of bookmarks
                    Object.keys(auditTags.bookmarks[fileUri]).forEach(category => {
                        // Process each bookmark
                        auditTags.bookmarks[fileUri][category].forEach(bookmark => {
                            // Only include unprocessed bookmarks
                            if (!auditTags._stateManager || !auditTags._stateManager.isProcessed(bookmark.id)) {
                                totalUnprocessed++;
                                
                                // Get the file path from URI
                                const filePath = vscode.Uri.parse(fileUri).fsPath;
                                
                                // Create deeplink for this bookmark
                                // Format: windsurf://file//<filepath>:<line>
                                const deeplink = `windsurf://file/${filePath}:${bookmark.range.start.line + 1}`;
                                
                                // Save ID for processing after API call
                                bookmarkIdsToProcess.push({
                                    id: bookmark.id,
                                    fileUri: fileUri,
                                    category: category,
                                    bookmark: bookmark
                                });
                                
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
                
                // If there are no unprocessed bookmarks, show message and return
                if (totalUnprocessed === 0) {
                    statusBar.hide();
                    vscode.window.showInformationMessage('No unprocessed bookmarks found.');
                    return;
                }
                
                // Prepare the output with project name and bookmarks
                const output = {
                    project: projectName,
                    bookmarks: unprocessedBookmarks
                };
                
                // Make API call with the unprocessed bookmarks
                statusBar.text = `$(sync~spin) Sending ${totalUnprocessed} bookmarks to API...`;
                
                // Create promise for API request
                const apiCallPromise = new Promise((resolve, reject) => {
                    // Parse URL
                    const urlObj = new URL(apiUrl);
                    
                    // Prepare request options
                    const options = {
                        hostname: urlObj.hostname,
                        port: urlObj.port || 443,
                        path: urlObj.pathname + urlObj.search,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        }
                    };
                    
                    // Create request (using HTTPS only)
                    const req = https.request(options, (res) => {
                        let data = '';
                        
                        // Collect response data
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        
                        // Handle response completion
                        res.on('end', () => {
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                // Success
                                resolve({
                                    status: res.statusCode,
                                    data: data
                                });
                            } else {
                                // Error
                                reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                            }
                        });
                    });
                    
                    // Handle request errors
                    req.on('error', (error) => {
                        reject(error);
                    });
                    
                    // Send data - project name and bookmarks
                    req.write(JSON.stringify(output));
                    req.end();
                });
                
                // Wait for API call to complete
                const apiResponse = await apiCallPromise;
                
                // Mark all bookmarks as processed
                statusBar.text = "$(check) Marking bookmarks as processed...";
                
                // Process all bookmarks
                bookmarkIdsToProcess.forEach(item => {
                    // Mark the bookmark object as processed
                    item.bookmark.processed = true;
                    
                    // If we have a state manager, update it
                    if (auditTags._stateManager) {
                        auditTags._stateManager.setProcessed(item.id, true);
                    }
                });
                
                // Show success message
                statusBar.hide();
                vscode.window.showInformationMessage(
                    `Synced ${totalUnprocessed} bookmarks to API and marked them as processed.`
                );
            } catch (error) {
                console.error('Error syncing bookmarks:', error);
                vscode.window.showErrorMessage(`Error syncing bookmarks: ${error.message}`);
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