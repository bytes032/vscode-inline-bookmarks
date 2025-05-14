'use strict';
/**
 * @author github.com/tintinweb
 *  
 *
 *
 * */
/** imports */
const vscode = require('vscode');

function extensionConfig() {
    return vscode.workspace.getConfiguration('bytes032-bookmarks');
}

module.exports = {
    extensionConfig: extensionConfig
};