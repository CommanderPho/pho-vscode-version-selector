// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { VSCodeInstallationFinder, VSCodeInstallation } from './vscodeInstallationFinder';

/**
 * Opens a file in a specific VSCode installation
 */
export async function openFileInVSCode(installation: VSCodeInstallation, filePath: string): Promise<void> {
    try {
        let command: string;
        let args: string[] = [];
        
        if (process.platform === 'darwin') {
            // macOS
            command = 'open';
            args = ['-a', installation.path, filePath];
        } else if (process.platform === 'win32') {
            // Windows
            command = path.join(installation.path, 'Code.exe');
            args = [filePath];
        } else {
            // Linux
            command = path.join(installation.path, 'bin', 'code');
            args = [filePath];
        }

        const childProcess = cp.spawn(command, args, { detached: true });
        childProcess.unref();
        
        vscode.window.showInformationMessage(`Opening ${path.basename(filePath)} in ${installation.displayName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
}

/**
 * Opens a workspace in a specific VSCode installation
 */
export async function openWorkspaceInVSCode(installation: VSCodeInstallation, workspacePath: string): Promise<void> {
    try {
        let command: string;
        let args: string[] = [];
        
        if (process.platform === 'darwin') {
            // macOS
            command = 'open';
            args = ['-a', installation.path, workspacePath];
        } else if (process.platform === 'win32') {
            // Windows
            command = path.join(installation.path, 'Code.exe');
            args = [workspacePath];
        } else {
            // Linux
            command = path.join(installation.path, 'bin', 'code');
            args = [workspacePath];
        }

        const childProcess = cp.spawn(command, args, { detached: true });
        childProcess.unref();
        
        vscode.window.showInformationMessage(`Opening workspace ${path.basename(workspacePath)} in ${installation.displayName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open workspace: ${error}`);
    }
}





// Register our commands for run groups
export function registerCommands(context: vscode.ExtensionContext) {
    // Register new commands    
    const installationFinder = new VSCodeInstallationFinder();
    
    const outputChannel = vscode.window.createOutputChannel('VSCode Version Selector');
    outputChannel.clear();
    outputChannel.appendLine('registerCommands(context) hit!');
    outputChannel.show();

    // Command to discover VSCode installations
    let discoverCommand = vscode.commands.registerCommand('phoVersionSelector.discoverInstallations', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                outputChannel.appendLine('No VSCode installations found.');
                vscode.window.showInformationMessage('No VSCode installations found.');
                return;
            }
            outputChannel.appendLine(`Found ${installations.length} VSCode installations.`);
            vscode.window.showInformationMessage(`Found ${installations.length} VSCode installations.`);
            
            // Show the installations in the output channel for debugging

            outputChannel.appendLine('Discovered VSCode Installations:');
            installations.forEach(installation => {
                outputChannel.appendLine(`- ${installation.displayName} (${installation.path})`);
            });
            outputChannel.show();
        } catch (error) {
            outputChannel.appendLine(`ERR: Error discovering VSCode installations: ${error}`);
            vscode.window.showErrorMessage(`Error discovering VSCode installations: ${error}`);
        }
    });

    // Command to open current file in a specific VSCode version
    let openInVersionCommand = vscode.commands.registerCommand('phoVersionSelector.openInVersion', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                vscode.window.showInformationMessage('No VSCode installations found.');
                return;
            }

            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showInformationMessage('No active file to open.');
                return;
            }

            const filePath = activeEditor.document.uri.fsPath;
            
            // Ask user to select a VSCode version
            const selectedVersion = await vscode.window.showQuickPick(
                installations.map(installation => ({
                    label: installation.displayName,
                    description: installation.path,
                    installation
                })),
                { placeHolder: 'Select VSCode version to open the file with' }
            );

            if (!selectedVersion) {
                return;
            }

            // Open the file in the selected VSCode version
            await openFileInVSCode(selectedVersion.installation, filePath);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening file in specific VSCode version: ${error}`);
        }
    });

    // Command to open current workspace in a specific VSCode version
    let openWorkspaceInVersionCommand = vscode.commands.registerCommand('phoVersionSelector.openWorkspaceInVersion', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                vscode.window.showInformationMessage('No VSCode installations found.');
                return;
            }

            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showInformationMessage('No workspace open.');
                return;
            }

            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            
            // Ask user to select a VSCode version
            const selectedVersion = await vscode.window.showQuickPick(
                installations.map(installation => ({
                    label: installation.displayName,
                    description: installation.path,
                    installation
                })),
                { placeHolder: 'Select VSCode version to open the workspace with' }
            );

            if (!selectedVersion) {
                return;
            }

            // Open the workspace in the selected VSCode version
            await openWorkspaceInVSCode(selectedVersion.installation, workspacePath);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening workspace in specific VSCode version: ${error}`);
        }
    });

    // Register the commands
    context.subscriptions.push(discoverCommand);
    context.subscriptions.push(openInVersionCommand);
    context.subscriptions.push(openWorkspaceInVersionCommand);

}



