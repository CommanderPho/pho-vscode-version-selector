/** Usage
 * import { quotePathIfNeeded } from '../util/filesystem';
 * 
 */

/**
 * Wraps a path in double quotes if it's not already quoted (with either single or double quotes)
 * @param path The path to quote
 * @returns The quoted path
 */
export function quotePathIfNeeded(path: string): string {
    // Check if the path is already wrapped in single or double quotes
    if ((path.startsWith('"') && path.endsWith('"')) || 
        (path.startsWith("'") && path.endsWith("'"))) {
        return path; // Already quoted
    }
    
    // Otherwise, wrap it in double quotes
    return `"${path}"`;
}
