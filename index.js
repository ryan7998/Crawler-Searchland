import { scrapeBuildingControl } from './src/scraper.js';
import { saveJsonToFile, printJsonToConsole, handleError } from './src/utils.js';
import { config } from './src/config.js';

async function main() {
  try {
    console.log('Starting building control scraper...\n');
    
    // Scrape the data
    const data = await scrapeBuildingControl();
    
    // Output to console
    printJsonToConsole(data);
    
    // Save to file
    const filepath = await saveJsonToFile(data, config.outputDir, 'building-control');
    console.log(`✅ Data saved to: ${filepath}\n`);
    
  } catch (error) {
    handleError(error, 'main');
  }
}

main();

