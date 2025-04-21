import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { log } from './logging';

/**
 * Extracts and caches icons from VSCode installations
 */
export class IconExtractor {
    private iconCache: Map<string, string> = new Map();
    private readonly cacheDir: string;

    constructor(context: vscode.ExtensionContext) {
        // Use the extension's storage path for caching icons
        this.cacheDir = path.join(context.globalStorageUri.fsPath, 'icons');
        
        // Ensure the cache directory exists
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        // Load any existing cached icons
        this.loadCachedIcons();
    }

    /**
     * Gets an icon for a VSCode installation
     * @param installationPath Path to the VSCode installation
     * @param version Version string to use in the cache key
     * @returns URI to the icon file, or undefined if extraction failed
     */
    public async getIcon(installationPath: string, version: string): Promise<vscode.Uri | undefined> {
        const cacheKey = this.getCacheKey(installationPath, version);
        
        // Check if we already have this icon cached
        if (this.iconCache.has(cacheKey)) {
            const iconPath = this.iconCache.get(cacheKey);
            if (iconPath && fs.existsSync(iconPath)) {
                return vscode.Uri.file(iconPath);
            }
        }
        
        // Extract the icon
        try {
            const iconPath = await this.extractIcon(installationPath, cacheKey);
            if (iconPath) {
                // Cache the result
                this.iconCache.set(cacheKey, iconPath);
                return vscode.Uri.file(iconPath);
            }
        } catch (error) {
            log(`ERR: Failed to extract icon: ${error}`);
        }
        
        return undefined;
    }

    /**
     * Extracts an icon from a VSCode installation
     * @param installationPath Path to the VSCode installation
     * @param cacheKey Key to use for caching
     * @returns Path to the extracted icon file, or undefined if extraction failed
     */
    private async extractIcon(installationPath: string, cacheKey: string): Promise<string | undefined> {
        const platform = process.platform;
        const iconPath = path.join(this.cacheDir, `${cacheKey}.png`);
        
        try {
            if (platform === 'win32') {
                // Windows: Extract icon from .exe
                const exePath = path.join(installationPath, 'Code.exe');
                if (!fs.existsSync(exePath)) {
                    return undefined;
                }
                
                // Use PowerShell to extract the icon
                // This requires the System.Drawing assembly
                const psScript = `
                Add-Type -AssemblyName System.Drawing
                $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${exePath.replace(/\\/g, '\\\\')}')
                $bitmap = $icon.ToBitmap()
                $bitmap.Save('${iconPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
                `;
                
                const psPath = path.join(os.tmpdir(), `extract_icon_${cacheKey}.ps1`);
                fs.writeFileSync(psPath, psScript);
                
                await new Promise<void>((resolve, reject) => {
                    const process = cp.spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psPath]);
                    
                    process.on('close', (code) => {
                        if (code === 0 && fs.existsSync(iconPath)) {
                            resolve();
                        } else {
                            reject(new Error(`PowerShell exited with code ${code}`));
                        }
                    });
                    
                    process.on('error', reject);
                });
                
                // Clean up the temporary script
                if (fs.existsSync(psPath)) {
                    fs.unlinkSync(psPath);
                }
                
            } else if (platform === 'darwin') {
                // macOS: Extract icon from .app bundle
                const iconPath = path.join(installationPath, 'Contents', 'Resources', 'Code.icns');
                if (!fs.existsSync(iconPath)) {
                    return undefined;
                }
                
                // Use sips to convert icns to png
                const outputPath = path.join(this.cacheDir, `${cacheKey}.png`);
                
                await new Promise<void>((resolve, reject) => {
                    const process = cp.spawn('sips', ['-s', 'format', 'png', iconPath, '--out', outputPath]);
                    
                    process.on('close', (code) => {
                        if (code === 0 && fs.existsSync(outputPath)) {
                            resolve();
                        } else {
                            reject(new Error(`sips exited with code ${code}`));
                        }
                    });
                    
                    process.on('error', reject);
                });
                
            } else {
                // Linux: Try to find the icon in standard locations
                const possibleIconPaths = [
                    path.join(installationPath, 'resources', 'app', 'resources', 'linux', 'code.png'),
                    '/usr/share/pixmaps/code.png',
                    '/usr/share/icons/hicolor/256x256/apps/code.png'
                ];
                
                for (const possiblePath of possibleIconPaths) {
                    if (fs.existsSync(possiblePath)) {
                        // Copy the icon to our cache
                        fs.copyFileSync(possiblePath, iconPath);
                        break;
                    }
                }
            }
            
            // Check if we successfully extracted/copied the icon
            if (fs.existsSync(iconPath)) {
                return iconPath;
            }
        } catch (error) {
            log(`ERR: Failed to extract icon for ${installationPath}: ${error}`);
        }
        
        return undefined;
    }

    /**
     * Loads cached icons from disk
     */
    private loadCachedIcons(): void {
        try {
            if (fs.existsSync(this.cacheDir)) {
                const files = fs.readdirSync(this.cacheDir);
                for (const file of files) {
                    if (file.endsWith('.png')) {
                        const cacheKey = path.basename(file, '.png');
                        this.iconCache.set(cacheKey, path.join(this.cacheDir, file));
                    }
                }
            }
        } catch (error) {
            log(`ERR: Failed to load cached icons: ${error}`);
        }
    }

    /**
     * Generates a cache key for an installation
     * @param installationPath Path to the VSCode installation
     * @param version Version string
     * @returns Cache key
     */
    private getCacheKey(installationPath: string, version: string): string {
        // Create a unique key based on the path and version
        const normalizedPath = installationPath.replace(/[^a-zA-Z0-9]/g, '_');
        return `vscode_${normalizedPath}_${version}`;
    }

    /**
     * Clears the icon cache
     */
    public clearCache(): void {
        try {
            if (fs.existsSync(this.cacheDir)) {
                const files = fs.readdirSync(this.cacheDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(this.cacheDir, file));
                }
            }
            this.iconCache.clear();
        } catch (error) {
            log(`ERR: Failed to clear icon cache: ${error}`);
        }
    }
}
