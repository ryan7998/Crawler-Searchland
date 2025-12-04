import { scrapeBuildingControl } from './src/scraper.js';
import { scrapeWNCBuildingControl } from './src/scraper-task2.js';
import { saveJsonToFile, printJsonToConsole, handleError } from './src/utils.js';
import { config } from './src/config.js';

async function main() {
  const args = process.argv.slice(2);
  const task = args[0] || '1'; // Default to task 1
  
  try {
    if (task === '1' || task === 'task1') {
      console.log('=== Task 1: Edinburgh Building Control Scraper ===\n');
      
      // Scrape the data
      const data = await scrapeBuildingControl();
      
      // Output to console
      printJsonToConsole(data);
      
      // Save to file
      const filepath = await saveJsonToFile(data, config.outputDir, 'building-control');
      console.log(`✅ Data saved to: ${filepath}\n`);
      
    } else if (task === '2' || task === 'task2') {
      console.log('=== Task 2: WNC Building Control Scraper ===\n');
      
      // Scrape the data
      const data = await scrapeWNCBuildingControl();
      
      // Output to console
      printJsonToConsole(data);
      
      // Save to file
      const filepath = await saveJsonToFile(data, config.outputDir, 'wnc-building-control');
      console.log(`✅ Data saved to: ${filepath}\n`);
      
    } else if (task === 'all') {
      console.log('=== Running All Tasks ===\n');
      
      // Task 1
      console.log('--- Task 1: Edinburgh ---');
      try {
        const data1 = await scrapeBuildingControl();
        await saveJsonToFile(data1, config.outputDir, 'building-control');
        console.log('✅ Task 1 completed\n');
      } catch (error) {
        console.error('❌ Task 1 failed:', error.message, '\n');
      }
      
      // Task 2
      console.log('--- Task 2: WNC ---');
      try {
        const data2 = await scrapeWNCBuildingControl();
        await saveJsonToFile(data2, config.outputDir, 'wnc-building-control');
        console.log('✅ Task 2 completed\n');
      } catch (error) {
        console.error('❌ Task 2 failed:', error.message, '\n');
      }
      
    } else {
      console.log('Usage:');
      console.log('  node index.js [task]');
      console.log('');
      console.log('Tasks:');
      console.log('  1 or task1  - Edinburgh building control scraper (default)');
      console.log('  2 or task2  - WNC building control scraper');
      console.log('  all         - Run both tasks');
      console.log('');
      console.log('Examples:');
      console.log('  node index.js        # Run task 1');
      console.log('  node index.js 1      # Run task 1');
      console.log('  node index.js 2     # Run task 2');
      console.log('  node index.js all    # Run both tasks');
    }
    
  } catch (error) {
    handleError(error, 'main');
  }
}

main();

