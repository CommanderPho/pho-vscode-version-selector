import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

export interface VSCodeInstallation {
    path: string;
    version: string;
    displayName: string;
}

export class VSCodeInstallationFinder {
    private static readonly DEFAULT_LOCATIONS: { [key: string]: string[] } = {
        'win32': [
            'C:\\Program Files\\Microsoft VS Code',
            'C:\\Program Files (x86)\\Microsoft VS Code',
            path.join(os.homedir(), 'AppData\\Local\\Programs\\Microsoft VS Code')
        ],
        'darwin': [
            '/Applications/Visual Studio Code.app',
            '/Applications/Visual Studio Code - Insiders.app',
            path.join(os.homedir(), 'Applications/Visual Studio Code.app')
        ],
        'linux': [
            '/usr/share/code',
            '/usr/local/bin/code',
            path.join(os.homedir(), '.vscode')
        ]
    };

    private cachedInstallations: VSCodeInstallation[] | null = null;

    /**
     * Discovers VSCode installations on the system
     */
    public async findInstallations(): Promise<VSCodeInstallation[]> {
        if (this.cachedInstallations) {
            return this.cachedInstallations;
        }

        const installations: VSCodeInstallation[] = [];
        const customPaths = vscode.workspace.getConfiguration('phoVersionSelector').get<string[]>('customInstallationPaths', []);
        
        // Get default locations based on platform
        const defaultLocations = VSCodeInstallationFinder.DEFAULT_LOCATIONS[process.platform] || [];
        
        // Combine default and custom paths
        const pathsToCheck = [...defaultLocations, ...customPaths];
        
        for (const installPath of pathsToCheck) {
            try {
                if (fs.existsSync(installPath)) {
                    const version = await this.getVersionFromPath(installPath);
                    if (version) {
                        installations.push({
                            path: installPath,
                            version,
                            displayName: `VSCode ${version} (${path.basename(installPath)})`
                        });
                    }
                }
            } catch (error) {
                console.error(`Error checking path ${installPath}:`, error);
            }
        }

        this.cachedInstallations = installations;
        return installations;
    }

    /**
     * Extracts the version from a VSCode installation path
     */
    private async getVersionFromPath(installPath: string): Promise<string | null> {
        try {
            // The approach to get the version differs by platform
            if (process.platform === 'darwin') {
                // For macOS, check Info.plist
                const plistPath = path.join(installPath, 'Contents', 'Info.plist');
                if (fs.existsSync(plistPath)) {
                    // Simple string search for version in plist file
                    const content = fs.readFileSync(plistPath, 'utf8');
                    const match = /<key>CFBundleShortVersionString<\/key>\s*<string>(.*?)<\/string>/m.exec(content);
                    return match ? match[1] : null;
                }
            } else if (process.platform === 'win32') {
                // For Windows, check the product.json file
                const productJsonPath = path.join(installPath, 'resources', 'app', 'product.json');
                if (fs.existsSync(productJsonPath)) {
                    const productJson = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
                    return productJson.version || null;
                }
            } else {
                // For Linux, try to run the binary with --version
                // This is a simplified approach - in a real implementation you might want to use child_process.exec
                const possibleBinaries = [
                    path.join(installPath, 'bin', 'code'),
                    path.join(installPath, 'code')
                ];
                
                for (const binary of possibleBinaries) {
                    if (fs.existsSync(binary)) {
                        // In a real implementation, you would run the binary with --version and parse the output
                        // For now, we'll just return a placeholder
                        return "Unknown (Linux)";
                    }
                }
            }
        } catch (error) {
            console.error(`Error getting version from ${installPath}:`, error);
        }
        
        return null;
    }

    /**
     * Clears the cached installations
     */
    public clearCache(): void {
        this.cachedInstallations = null;
    }
}
