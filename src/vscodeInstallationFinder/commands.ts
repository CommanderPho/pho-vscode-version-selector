// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import * as path from 'path';
// import * as cp from 'child_process';
import { spawn } from 'node:child_process';
import { VSCodeInstallationFinder, VSCodeInstallation } from './vscodeInstallationFinder';
import { log, showTimedInformationMessage } from '../util/logging';
import { myChannel as outputChannel } from '../util/logging';

import { quotePathIfNeeded } from '../util/filesystem';


/**
 * Opens a file in a specific VSCode installation
 */
export async function openFileInVSCode(installation: VSCodeInstallation, filePath: string): Promise<void> {
    try {
        let command: string;
        let args: string[] = [];

        const quotedFilePath = quotePathIfNeeded(filePath);
    
        log(`openFileInVSCode(installation: ${installation} filePath: ${quotedFilePath}):`);
        // Check if the file/workspace exists
        if (!require('fs').existsSync(quotedFilePath)) {
            log(`ERR: Target file not found: ${quotedFilePath}`);
            vscode.window.showErrorMessage(`Target file not found: ${quotedFilePath}`);
            return;
        }
        
        if (process.platform === 'darwin') {
            // macOS
            command = 'open';
            const quotedVSCodeFolderPath = quotePathIfNeeded(installation.path);
            args = ['-a', quotedVSCodeFolderPath, quotedFilePath];

        } else if (process.platform === 'win32') {
            // Windows
            command = path.join(installation.path, 'Code.exe');
            const quotedVSCodeExecutableCommandPath = quotePathIfNeeded(command);
            // Check if the executable exists
            if (!require('fs').existsSync(quotedVSCodeExecutableCommandPath)) {
                log(`ERR: VSCode executable not found at: ${quotedVSCodeExecutableCommandPath}`);
                vscode.window.showErrorMessage(`VSCode executable not found at: ${quotedVSCodeExecutableCommandPath}`);
                return;
            }
            command = quotedVSCodeExecutableCommandPath;
            args = [quotedFilePath];

        } else {
            // Linux
            command = path.join(installation.path, 'bin', 'code');
            const quotedVSCodeExecutableCommandPath = quotePathIfNeeded(command);
            // Check if the executable exists
            if (!require('fs').existsSync(quotedVSCodeExecutableCommandPath)) {
                log(`ERR: VSCode executable not found at: ${quotedVSCodeExecutableCommandPath}`);
                vscode.window.showErrorMessage(`VSCode executable not found at: ${quotedVSCodeExecutableCommandPath}`);
                return;
            }
            command = quotedVSCodeExecutableCommandPath
            args = [quotedFilePath];
        }

        // Proper outputs: command, quotedFilePath

        log(`Executing command: ${command} ${args.join(' ')}`);
        // const childProcess = cp.spawn(command, args, { detached: true });        
        const childProcess = spawn(command, args, { 
            detached: true,
            // stdio: 'ignore',
            windowsVerbatimArguments: process.platform === 'win32'
        });
        
        // Add event listeners to debug process execution
        if (childProcess.stdout) {
            childProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                log(`stdout: ${data}`);
            });
        } else {
            log('stdout stream is not available, is `stdio: "ignore"`?');
        }

        if (childProcess.stderr) {
            childProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                log(`stderr: ${data}`);
            });
        } else {
            log('stderr stream is not available, is `stdio: "ignore"`?');
        }    

        childProcess.on('error', (err) => {
            log(`ERR: Process error: ${err}`);
            log(`\tmessage: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to start VSCode: ${err.message}`);
        });

        childProcess.on('close', (code) => {
            log(`child process closed with code ${code}`);
            console.log(`child process closed with code ${code}`);
        });
        
        childProcess.on('exit', (code) => {
            if (code !== 0) {
                log(`Process exited with code ${code}`);
            }
        });
        childProcess.unref();

        log(`Opening ${path.basename(quotedFilePath)} in ${installation.displayName}`);
        vscode.window.showInformationMessage(`Opening ${path.basename(quotedFilePath)} in ${installation.displayName}`);
    } catch (error) {
        log(`ERR: Failed to open file: ${error}`);
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
        
        log(`openWorkspaceInVSCode(installation: ${installation} workspacePath: ${workspacePath}):`);
        const quotedFilePath = quotePathIfNeeded(workspacePath);
        // Check if the file/workspace exists
        if (!require('fs').existsSync(quotedFilePath)) {
            log(`ERR: Target file not found: ${quotedFilePath}`);
            vscode.window.showErrorMessage(`Target file not found: ${quotedFilePath}`);
            return;
        }
        workspacePath = quotedFilePath;

        if (process.platform === 'darwin') {
            // macOS
            command = 'open';
            args = ['-a', quotePathIfNeeded(installation.path), workspacePath];
        } else if (process.platform === 'win32') {
            // Windows
            command = path.join(installation.path, 'Code.exe');
            args = [workspacePath];
        } else {
            // Linux
            command = path.join(installation.path, 'bin', 'code');
            args = [workspacePath];
        }

        const childProcess = spawn(command, args, { detached: true });
        childProcess.unref();
        log(`Opening workspace ${path.basename(workspacePath)} in ${installation.displayName}`);
        vscode.window.showInformationMessage(`Opening workspace ${path.basename(workspacePath)} in ${installation.displayName}`);
    } catch (error) {
        log(`ERR: Failed to open workspace: ${error}`);
        vscode.window.showErrorMessage(`Failed to open workspace: ${error}`);
    }
}





// Register our commands for run groups
export function registerCommands(context: vscode.ExtensionContext) {

    outputChannel.appendLine('registerCommands(context) hit!');
    outputChannel.show();

    const installationFinder = new VSCodeInstallationFinder(context);
    
    // Command to discover VSCode installations
    let discoverCommand = vscode.commands.registerCommand('phoVersionSelector.discoverInstallations', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                outputChannel.appendLine('No VSCode installations found.');
                vscode.window.showInformationMessage('No VSCode installations found.');
                outputChannel.show();
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
            outputChannel.show();
        }
    });

    // Command to open current file in a specific VSCode version
    let openInVersionCommand = vscode.commands.registerCommand('phoVersionSelector.openInVersion', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                outputChannel.appendLine('No VSCode installations found.');
                vscode.window.showInformationMessage('No VSCode installations found.');
                outputChannel.show();
                return;
            }

            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                outputChannel.appendLine(`No active file to open.`);
                vscode.window.showInformationMessage('No active file to open.');
                outputChannel.show();
                return;
            }

            const filePath = activeEditor.document.uri.fsPath;
            
            // Ask user to select a VSCode version
            const selectedVersion = await vscode.window.showQuickPick(
                installations.map(installation => ({
                    label: installation.displayName,
                    description: installation.path,
                    installation,
                    iconPath: installation.iconPath // Use the extracted icon
                })),
                { 
                    placeHolder: 'Select VSCode version to open the file with',
                    matchOnDescription: true
                }
            );

            if (!selectedVersion) {
                return;
            }

            // Open the file in the selected VSCode version
            await openFileInVSCode(selectedVersion.installation, filePath);
            
        } catch (error) {
            outputChannel.appendLine(`ERR: Error opening file in specific VSCode version: ${error}`);
            vscode.window.showErrorMessage(`Error opening file in specific VSCode version: ${error}`);
            outputChannel.show();
        }
    });

    // Command to open current workspace in a specific VSCode version
    let openWorkspaceInVersionCommand = vscode.commands.registerCommand('phoVersionSelector.openWorkspaceInVersion', async () => {
        try {
            const installations = await installationFinder.findInstallations();
            if (installations.length === 0) {
                outputChannel.appendLine('No VSCode installations found.');
                vscode.window.showInformationMessage('No VSCode installations found.');
                outputChannel.show();
                return;
            }

            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                outputChannel.appendLine(`No workspace open.`);
                vscode.window.showInformationMessage('No workspace open.');
                outputChannel.show();
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
            outputChannel.appendLine(`ERR: Error opening workspace in specific VSCode version: ${error}`);
            vscode.window.showErrorMessage(`Error opening workspace in specific VSCode version: ${error}`);
            outputChannel.show();
        }
    });

    // Register the commands
    context.subscriptions.push(discoverCommand);
    context.subscriptions.push(openInVersionCommand);
    context.subscriptions.push(openWorkspaceInVersionCommand);

}



