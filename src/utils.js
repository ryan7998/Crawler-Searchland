import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save JSON data to a file with timestamp
 * @param {Object} data - The data to save
 * @param {string} outputDir - Output directory path
 * @param {string} prefix - Filename prefix
 * @returns {Promise<string>} Path to the saved file
 */
export async function saveJsonToFile(data, outputDir = './output', prefix = 'scraped-data') {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${prefix}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    // Write JSON file with pretty formatting
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    
    return filepath;
  } catch (error) {
    throw new Error(`Failed to save JSON file: ${error.message}`);
  }
}

/**
 * Pretty print JSON to console
 * @param {Object} data - The data to print
 */
export function printJsonToConsole(data) {
  console.log('\n=== Scraped Data ===\n');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');
}

/**
 * Handle and log errors
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 */
export function handleError(error, context = 'Unknown') {
  console.error(`\n❌ Error in ${context}:`);
  console.error(error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

