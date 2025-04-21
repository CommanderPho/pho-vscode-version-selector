// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerDocuments } from './documents';

export function startup(context: vscode.ExtensionContext) {
    // Usage: `import { startup as startupAllVSCodeInstallationFolder } from './vscodeInstallationFinder/startup';`

	// Register all of our commands
	registerCommands(context);

    // Register document handling
    registerDocuments(context);

    // Register cell status bar
    // registerCellStatusBarProvider(context);
}
