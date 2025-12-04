/**
 * Shared data extraction utilities for both Playwright and Got scrapers
 * Follows DRY principle by centralizing common extraction logic
 */

/**
 * Get standard HTTP headers for web scraping
 * @returns {Object} Headers object
 */
export function getStandardHeaders() {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  };
}

/**
 * Get random user agent from a pool of realistic browsers
 * @returns {string} User agent string
 */
export function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Extract form fields from DOM (Playwright) or Cheerio
 * @param {Function} querySelector - Function to query elements (page.evaluate or Cheerio $)
 * @param {boolean} isCheerio - Whether using Cheerio (true) or Playwright (false)
 * @returns {Object} Form fields object
 */
export function extractFormFields(querySelector, isCheerio = false) {
  const formData = {};
  
  if (isCheerio) {
    // Cheerio implementation
    const $ = querySelector;
    $('input, select, textarea').each((_, element) => {
      const $el = $(element);
      const name = $el.attr('name') || $el.attr('id') || $el.attr('data-field');
      const type = $el.attr('type') || 'text';
      let value = $el.val() || $el.attr('value') || '';
      
      if (type === 'checkbox' || type === 'radio') {
        value = $el.is(':checked');
      }
      
      if (name && (value !== '' || value === true || value === false)) {
        formData[name] = value;
      }
    });
  } else {
    // Playwright DOM implementation (runs in browser context)
    const inputs = querySelector('input, select, textarea');
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
  }
  
  return formData;
}

/**
 * Extract table data from DOM (Playwright) or Cheerio
 * @param {Function} querySelector - Function to query elements
 * @param {boolean} isCheerio - Whether using Cheerio (true) or Playwright (false)
 * @returns {Array} Array of table data objects
 */
export function extractTables(querySelector, isCheerio = false) {
  const tables = [];
  
  if (isCheerio) {
    // Cheerio implementation
    const $ = querySelector;
    $('table').each((tableIndex, table) => {
      const tableData = {
        index: tableIndex,
        headers: [],
        rows: []
      };
      
      // Extract headers
      $(table).find('thead th, tr:first-child th, tr:first-child td').each((_, cell) => {
        tableData.headers.push($(cell).text().trim());
      });
      
      // Extract rows
      $(table).find('tbody tr, tr:not(:first-child)').each((_, row) => {
        const rowData = {};
        $(row).find('td, th').each((cellIndex, cell) => {
          const header = tableData.headers[cellIndex] || `column_${cellIndex}`;
          rowData[header] = $(cell).text().trim();
        });
        if (Object.keys(rowData).length > 0) {
          tableData.rows.push(rowData);
        }
      });
      
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        tables.push(tableData);
      }
    });
  } else {
    // Playwright DOM implementation (runs in browser context)
    const tableElements = querySelector('table');
    tableElements.forEach((table, tableIndex) => {
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
        tables.push(tableInfo);
      }
    });
  }
  
  return tables;
}

/**
 * Extract links from DOM (Playwright) or Cheerio
 * @param {Function} querySelector - Function to query elements
 * @param {boolean} isCheerio - Whether using Cheerio (true) or Playwright (false)
 * @returns {Array} Array of link objects
 */
export function extractLinks(querySelector, isCheerio = false) {
  if (isCheerio) {
    // Cheerio implementation
    const $ = querySelector;
    const links = [];
    $('a[href]').each((_, link) => {
      const $link = $(link);
      links.push({
        text: $link.text().trim(),
        href: $link.attr('href'),
        title: $link.attr('title') || ''
      });
    });
    return links;
  } else {
    // Playwright DOM implementation (runs in browser context)
    return Array.from(querySelector('a[href]')).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    }));
  }
}

/**
 * Save HTML content to file
 * @param {string} htmlContent - HTML content to save
 * @param {string} prefix - Filename prefix
 * @param {string} outputDir - Output directory
 * @returns {Promise<string>} Path to saved file
 */
export async function saveHtmlFile(htmlContent, prefix = 'page', outputDir = './output') {
  const fs = await import('fs/promises');
  
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const htmlPath = `${outputDir}/${prefix}-html-${Date.now()}.html`;
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');
    return htmlPath;
  } catch (error) {
    throw new Error(`Failed to save HTML file: ${error.message}`);
  }
}

/**
 * Create base data structure for scraped data
 * @param {string} url - Page URL
 * @returns {Object} Base data structure
 */
export function createBaseDataStructure(url) {
  return {
    url: url,
    scrapedAt: new Date().toISOString(),
    summary: {},
    details: {
      formFields: {},
      tables: []
    },
    additionalData: {}
  };
}

