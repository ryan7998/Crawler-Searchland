import { chromium } from 'playwright';
import { config } from './config.js';

/**
 * Scrape building control data from Edinburgh planning portal
 * @returns {Promise<Object>} Scraped building control data as JSON
 */
export async function scrapeBuildingControl() {
  let browser = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: config.browser.headless
    });
    
    const context = await browser.newContext({
      viewport: config.browser.viewport
    });
    
    const page = await context.newPage();
    
    // Set timeout
    page.setDefaultTimeout(config.browser.timeout);
    
    console.log('Navigating to building control page...');
    await page.goto(config.task1Url, { waitUntil: 'networkidle' });
    
    console.log('Page loaded, extracting data...');
    
    // Wait for content to be visible
    await page.waitForLoadState('domcontentloaded');
    
    // Extract all building control data
    const data = await page.evaluate(() => {
      const result = {
        url: window.location.href,
        scrapedAt: new Date().toISOString(),
        summary: {},
        details: {},
        geometry: null,
        additionalData: {}
      };
      
      // Extract summary tab data
      // Look for common data structures in building control pages
      const summarySection = document.querySelector('[id*="summary"], .summary, #summary');
      if (summarySection) {
        // Extract all text content and structured data
        const summaryData = {};
        const rows = summarySection.querySelectorAll('tr, .row, .field-row');
        rows.forEach((row, index) => {
          const label = row.querySelector('th, .label, dt, [class*="label"]');
          const value = row.querySelector('td, .value, dd, [class*="value"]');
          if (label && value) {
            const labelText = label.textContent.trim();
            const valueText = value.textContent.trim();
            if (labelText && valueText) {
              summaryData[labelText] = valueText;
            }
          }
        });
        result.summary = summaryData;
      }
      
      // Extract all form fields and input values
      const formData = {};
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const name = input.name || input.id || input.getAttribute('data-field');
        const type = input.type || 'text';
        let value = input.value;
        
        if (type === 'checkbox' || type === 'radio') {
          value = input.checked;
        }
        
        if (name && value !== undefined && value !== '') {
          formData[name] = value;
        }
      });
      result.details.formFields = formData;
      
      // Extract table data
      const tables = document.querySelectorAll('table');
      const tableData = [];
      tables.forEach((table, tableIndex) => {
        const tableInfo = {
          index: tableIndex,
          headers: [],
          rows: []
        };
        
        const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
        headerCells.forEach(cell => {
          tableInfo.headers.push(cell.textContent.trim());
        });
        
        const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        dataRows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          const rowData = {};
          cells.forEach((cell, cellIndex) => {
            const header = tableInfo.headers[cellIndex] || `column_${cellIndex}`;
            rowData[header] = cell.textContent.trim();
          });
          if (Object.keys(rowData).length > 0) {
            tableInfo.rows.push(rowData);
          }
        });
        
        if (tableInfo.headers.length > 0 || tableInfo.rows.length > 0) {
          tableData.push(tableInfo);
        }
      });
      result.details.tables = tableData;
      
      // Extract geometry data
      // Look for map components, GeoJSON, or coordinate data
      const geometrySources = [];
      
      // Check for map containers
      const mapContainers = document.querySelectorAll('[id*="map"], [class*="map"], [id*="Map"], [class*="Map"]');
      mapContainers.forEach(container => {
        const mapData = {
          element: container.id || container.className,
          bounds: container.getBoundingClientRect(),
          innerHTML: container.innerHTML.substring(0, 500) // First 500 chars
        };
        geometrySources.push(mapData);
      });
      
      // Check for GeoJSON in script tags or data attributes
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const scriptText = script.textContent || script.innerHTML;
        if (scriptText.includes('GeoJSON') || scriptText.includes('coordinates') || scriptText.includes('geometry')) {
          // Try to extract JSON-like structures
          const jsonMatch = scriptText.match(/\{[\s\S]*"type"[\s\S]*"coordinates"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const geoJson = JSON.parse(jsonMatch[0]);
              geometrySources.push({ source: 'script', data: geoJson });
            } catch (e) {
              geometrySources.push({ source: 'script', raw: jsonMatch[0].substring(0, 1000) });
            }
          }
        }
      });
      
      // Check for data attributes with geometry
      const elementsWithData = document.querySelectorAll('[data-geometry], [data-coordinates], [data-geojson]');
      elementsWithData.forEach(el => {
        const geometryAttr = el.getAttribute('data-geometry') || 
                           el.getAttribute('data-coordinates') || 
                           el.getAttribute('data-geojson');
        if (geometryAttr) {
          try {
            const parsed = JSON.parse(geometryAttr);
            geometrySources.push({ source: 'data-attribute', element: el.tagName, data: parsed });
          } catch (e) {
            geometrySources.push({ source: 'data-attribute', element: el.tagName, raw: geometryAttr });
          }
        }
      });
      
      // Check for hidden inputs with geometry data
      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      hiddenInputs.forEach(input => {
        const name = input.name || input.id;
        const value = input.value;
        if (name && (name.toLowerCase().includes('geometry') || 
                    name.toLowerCase().includes('coordinate') ||
                    name.toLowerCase().includes('lat') ||
                    name.toLowerCase().includes('lng') ||
                    name.toLowerCase().includes('lon'))) {
          try {
            const parsed = JSON.parse(value);
            geometrySources.push({ source: 'hidden-input', name, data: parsed });
          } catch (e) {
            geometrySources.push({ source: 'hidden-input', name, raw: value });
          }
        }
      });
      
      if (geometrySources.length > 0) {
        result.geometry = geometrySources;
      }
      
      // Extract all visible text content for additional context
      const allText = document.body.innerText;
      result.additionalData.fullTextLength = allText.length;
      result.additionalData.pageTitle = document.title;
      
      // Extract links
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }));
      result.additionalData.links = links;
      
      return result;
    });
    
    console.log('Data extraction complete!');
    
    return data;
    
  } catch (error) {
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

