// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerDocuments } from './documents';
import { log, showTimedInformationMessage } from '../util/logging';


export function startup(context: vscode.ExtensionContext) {
    // Usage: `import { startup as startupAllVSCodeInstallationFolder } from './vscodeInstallationFinder/startup';`


    // Initialize configuration if it doesn't exist
    const config = vscode.workspace.getConfiguration('phoVersionSelector');
    if (!config.has('customInstallationPaths')) {
        config.update('customInstallationPaths', [], vscode.ConfigurationTarget.Global);
    }

	// Register all of our commands
	registerCommands(context);

    // Register document handling
    registerDocuments(context);

    // Register cell status bar
    // registerCellStatusBarProvider(context);

    // Run the discovery command automatically on startup
    void vscode.commands.executeCommand('phoVersionSelector.discoverInstallations')
    .then(() => {
        log('VSCode installations discovered on startup');
    }, error => {
        log(`ERR: Failed to discover VSCode installations on startup: ${error}`);
    });

    
}