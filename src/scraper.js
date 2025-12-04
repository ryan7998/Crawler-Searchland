import { chromium } from 'playwright';
import { config } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import { getStandardHeaders, getRandomUserAgent, extractFormFields, extractTables, extractLinks, saveHtmlFile, createBaseDataStructure } from './extractors.js';

/**
 * Scrape building control data from Edinburgh planning portal
 * @returns {Promise<Object>} Scraped building control data as JSON
 */
export async function scrapeBuildingControl() {
  let browser = null;
  let context = null;
  let page = null;
  let selectedCity = null;
  
  try {
    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: config.browser.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    // Helper function to create context with or without proxy
    const createContext = async (city = null) => {
      let proxyConfig = undefined;
      
      // Only configure proxy if credentials are available
      if (config.proxy) {
        const proxyUsername = config.proxy.getUsername 
          ? config.proxy.getUsername(city)
          : config.proxy.username;
        
        proxyConfig = {
          server: config.proxy.server,
          username: proxyUsername,
          password: config.proxy.password
        };
      }
      
      return await browser.newContext({
        viewport: config.browser.viewport,
        proxy: proxyConfig,
        ignoreHTTPSErrors: false,
        userAgent: getRandomUserAgent(),
        extraHTTPHeaders: getStandardHeaders(),
        timezoneId: 'Europe/London',
        locale: 'en-GB'
      });
    };
    
    // Initial proxy location (only if proxy is configured)
    if (config.proxy) {
      selectedCity = config.proxy.ukCities 
        ? config.proxy.ukCities[Math.floor(Math.random() * config.proxy.ukCities.length)]
        : 'manchester';
      
      const proxyUsername = config.proxy.getUsername 
        ? config.proxy.getUsername(selectedCity)
        : config.proxy.username;
      
      console.log('Proxy config:', {
        server: config.proxy.server,
        location: selectedCity,
        username: proxyUsername?.substring(0, 60) + '...',
        hasPassword: !!config.proxy.password
      });
      console.log('Using proxy:', config.proxy.server);
      console.log('Proxy location:', selectedCity);
    } else {
      console.log('⚠️  No proxy credentials found in .env - running without proxy');
    }
    
    // Create initial context
    context = await createContext(selectedCity);
    
    page = await context.newPage();
    
    // Set timeout
    page.setDefaultTimeout(config.browser.timeout);
    
    console.log('Navigating to building control page...');
    console.log('URL:', config.task1Url);
    
    // Proxy connections can be slow, use domcontentloaded with extended timeout
    console.log('Waiting for page to load (this may take a while through proxy)...');
    
    // Monitor page events
    page.on('console', msg => console.log('Page console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
    page.on('requestfailed', request => {
      console.log('Request failed:', request.url(), request.failure()?.errorText);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('Response error:', response.status(), response.url());
      }
    });
    
    // Retry logic with proxy rotation
    const maxRetries = 5;
    let lastError = null;
    let success = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🔄 Attempt ${attempt}/${maxRetries}...`);
        
        // Rotate proxy on each retry attempt (only if proxy is configured)
        if (attempt > 1 && config.proxy && config.proxy.ukCities) {
          console.log('🔄 Rotating proxy location...');
          const newCity = config.proxy.ukCities[Math.floor(Math.random() * config.proxy.ukCities.length)];
          console.log(`📍 New location: ${newCity}`);
          
          // Close old context and page
          try {
            if (page) await page.close();
          } catch (e) {}
          try {
            if (context) await context.close();
          } catch (e) {}
          
          // Create new context with rotated proxy
          selectedCity = newCity;
          context = await createContext(newCity);
          
          page = await context.newPage();
          page.setDefaultTimeout(config.browser.timeout);
          
          // Re-attach event listeners
          page.on('requestfailed', request => {
            console.log('Request failed:', request.url(), request.failure()?.errorText);
          });
          page.on('response', response => {
            if (response.status() === 200) {
              console.log('✅ Successful response:', response.url());
            } else if (response.status() >= 400) {
              console.log('Response error:', response.status(), response.url());
            }
          });
        }
        
        // Add random delay before request
        if (attempt > 1) {
          const delay = 3000 + Math.random() * 5000; // 3-8 seconds
          console.log(`⏳ Waiting ${Math.round(delay)}ms before request...`);
          await page.waitForTimeout(delay);
        }
        
        // Navigate with commit strategy (most lenient)
        const response = await page.goto(config.task1Url, { 
          waitUntil: 'commit', 
          timeout: config.browser.timeout 
        });
        
        // Wait for content to load
        await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);
        
        if (response) {
          console.log('✅ Response status:', response.status());
          console.log('✅ Response URL:', response.url());
          
          // Check if we got a valid response
          if (response.status() < 400 && page.url() !== 'chrome-error://chromewebdata/') {
            console.log('✅ Page loaded successfully!');
            success = true;
            break;
          }
        }
        
        // Check current URL and page content
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl && currentUrl !== 'chrome-error://chromewebdata/' && currentUrl !== 'about:blank') {
          // Check if page actually has content
          const pageContent = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
          if (pageContent.length > 50) {
            console.log('✅ Page loaded with content at:', currentUrl);
            console.log('Content preview:', pageContent.substring(0, 200));
            success = true;
            break;
          } else {
            console.log('⚠️  Page loaded but no content found');
          }
        }
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        // If it's a tunnel error, wait and retry with new proxy
        if (error.message.includes('TUNNEL_CONNECTION_FAILED') && attempt < maxRetries) {
          const waitTime = 5000 + attempt * 2000; // Increasing wait time
          console.log(`⏳ Waiting ${waitTime/1000}s before retry with new proxy...`);
          await page.waitForTimeout(waitTime);
          continue;
        }
        
        // For timeout errors, also retry with new proxy
        if (error.message.includes('TIMED_OUT') && attempt < maxRetries) {
          const waitTime = 3000 + attempt * 1000;
          console.log(`⏳ Waiting ${waitTime/1000}s before retry with new proxy...`);
          await page.waitForTimeout(waitTime);
          continue;
        }
        
        // For other errors, wait a bit and try to continue
        if (attempt < maxRetries) {
          await page.waitForTimeout(3000);
        }
      }
    }
    
    if (!success) {
      console.log('⚠️  All navigation attempts failed, but will try to capture what we have...');
      await page.waitForTimeout(5000);
    }
    
    // Always capture snapshot and HTML for debugging
    console.log('Capturing page snapshot and HTML...');
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log('Current URL:', currentUrl);
    console.log('Page title:', pageTitle);
    
    // Take screenshot
    const screenshotPath = `./output/screenshot-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Ensure output directory exists
    try {
      await fs.mkdir('./output', { recursive: true });
    } catch (e) {
      // Directory might already exist
    }
    
    // Save HTML content
    const htmlContent = await page.content();
    const htmlPath = await saveHtmlFile(htmlContent, 'page', './output');
    console.log('HTML saved to:', htmlPath);
    
    // Also save the page text for quick inspection
    const pageText = await page.evaluate(() => document.body.innerText);
    const textPath = `./output/page-text-${Date.now()}.txt`;
    await fs.writeFile(textPath, pageText, 'utf-8');
    console.log('Page text saved to:', textPath);
    
    // Give a moment for any dynamic content to render
    await page.waitForTimeout(2000);
    
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
      result.additionalData.links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }));
      
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

