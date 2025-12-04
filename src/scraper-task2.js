import got from 'got';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import { getStandardHeaders, getRandomUserAgent, extractFormFields, extractTables, extractLinks, saveHtmlFile, createBaseDataStructure } from './extractors.js';

/**
 * Scrape building control data from WNC planning register using Got
 * @returns {Promise<Object>} Scraped building control data as JSON
 */
export async function scrapeWNCBuildingControl() {
  try {
    console.log('Starting WNC building control scraper...');
    console.log('URL:', config.task2Url);
    
    // Configure Got with proxy if credentials are available
    const gotOptions = {
      timeout: {
        request: 60000 // 60 seconds timeout
      },
      headers: {
        'User-Agent': getRandomUserAgent(),
        ...getStandardHeaders()
      },
      retry: {
        limit: 3,
        methods: ['GET'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504]
      }
    };
    
    // Add proxy configuration if available
    if (config.proxy) {
      const proxyUsername = config.proxy.getUsername 
        ? config.proxy.getUsername('london') // Use a default city for Got
        : config.proxy.username;
      
      gotOptions.proxy = {
        protocol: 'http',
        hostname: 'pr.oxylabs.io',
        port: 7777,
        username: proxyUsername,
        password: config.proxy.password
      };
      
      console.log('Using proxy:', config.proxy.server);
    } else {
      console.log('⚠️  No proxy credentials found - running without proxy');
    }
    
    // Make the request to disclaimer page
    console.log('Fetching disclaimer page...');
    const disclaimerResponse = await got(config.task2Url, gotOptions);
    
    console.log('✅ Disclaimer page status:', disclaimerResponse.statusCode);
    console.log('✅ Disclaimer page URL:', disclaimerResponse.url);
    
    // Parse HTML with Cheerio
    let $ = cheerio.load(disclaimerResponse.body);
    
    // Check if this is a disclaimer page and try to accept it to get to the actual building control page
    const returnUrl = new URL(config.task2Url).searchParams.get('returnUrl');
    let buildingControlUrl = null;
    let actualPageResponse = disclaimerResponse;
    let actualPageHtml = disclaimerResponse.body;
    
    if (returnUrl) {
      const baseUrl = new URL(config.task2Url).origin;
      buildingControlUrl = baseUrl + decodeURIComponent(returnUrl);
      
      // Try to find and submit the disclaimer acceptance form
      const acceptForm = $('form[action*="Accept"]').first();
      if (acceptForm.length > 0) {
        const formAction = acceptForm.attr('action');
        const acceptUrl = formAction.startsWith('http') ? formAction : baseUrl + formAction;
        
        console.log('📍 Found disclaimer acceptance form, submitting...');
        console.log('   Accept URL:', acceptUrl);
        
        try {
          // Submit the form (POST request to accept disclaimer)
          const acceptResponse = await got.post(acceptUrl, {
            ...gotOptions,
            followRedirect: true,
            maxRedirects: 5
          });
          
          actualPageResponse = acceptResponse;
          actualPageHtml = acceptResponse.body;
          $ = cheerio.load(actualPageHtml);
          console.log('✅ Disclaimer accepted, building control page status:', acceptResponse.statusCode);
          console.log('✅ Building control page URL:', acceptResponse.url);
        } catch (error) {
          console.log('⚠️  Could not accept disclaimer, trying direct URL...');
          console.log('   Error:', error.message);
          
          // Fallback: try direct URL
          try {
            actualPageResponse = await got(buildingControlUrl, gotOptions);
            actualPageHtml = actualPageResponse.body;
            $ = cheerio.load(actualPageHtml);
            console.log('✅ Building control page status (direct):', actualPageResponse.statusCode);
            console.log('✅ Building control page URL (direct):', actualPageResponse.url);
          } catch (directError) {
            console.log('⚠️  Could not fetch building control page, using disclaimer page');
            console.log('   Error:', directError.message);
          }
        }
      } else {
        // No form found, try direct URL
        console.log('📍 No disclaimer form found, trying direct URL:', buildingControlUrl);
        try {
          actualPageResponse = await got(buildingControlUrl, gotOptions);
          actualPageHtml = actualPageResponse.body;
          $ = cheerio.load(actualPageHtml);
          console.log('✅ Building control page status:', actualPageResponse.statusCode);
          console.log('✅ Building control page URL:', actualPageResponse.url);
        } catch (error) {
          console.log('⚠️  Could not fetch building control page, using disclaimer page');
          console.log('   Error:', error.message);
        }
      }
    }
    
    // Extract building control data
    const data = {
      ...createBaseDataStructure(actualPageResponse.url || buildingControlUrl || config.task2Url),
      disclaimer: {},
      buildingControl: {}
    };
    
    // Extract page title
    data.additionalData.pageTitle = $('title').text().trim();
    
    // Check if this is a disclaimer page and extract disclaimer content
    const disclaimerText = $('body').text();
    if (disclaimerText.toLowerCase().includes('disclaimer') || 
        disclaimerText.toLowerCase().includes('accept') ||
        disclaimerText.toLowerCase().includes('terms')) {
      data.disclaimer = {
        hasDisclaimer: true,
        text: $('body').text().trim().substring(0, 1000), // First 1000 chars
        acceptButton: $('input[type="submit"][value*="Accept"], button[type="submit"], a[href*="Accept"]').first().attr('href') || 
                      $('input[type="submit"][value*="Accept"], button[type="submit"], a[href*="Accept"]').first().attr('value') || 
                      $('input[type="submit"][value*="Accept"], button[type="submit"], a[href*="Accept"]').first().text().trim()
      };
      
      // Try to find the return URL or next page link
      const returnUrl = new URL(config.task2Url).searchParams.get('returnUrl');
      if (returnUrl) {
        data.disclaimer.returnUrl = returnUrl;
        // Construct the actual building control page URL
        const baseUrl = new URL(config.task2Url).origin;
        data.disclaimer.buildingControlUrl = baseUrl + decodeURIComponent(returnUrl);
      }
    }
    
    // Extract form fields using shared utility
    data.details.formFields = extractFormFields($, true);
    
    // Extract table data using shared utility
    data.details.tables = extractTables($, true);
    
    // Extract summary information (common patterns in building control pages)
    const summaryData = {};
    
    // Look for definition lists (dl/dt/dd)
    $('dl').each((_, dl) => {
      $(dl).find('dt').each((_, dt) => {
        const label = $(dt).text().trim();
        const value = $(dt).next('dd').text().trim();
        if (label && value) {
          summaryData[label] = value;
        }
      });
    });
    
    // Look for label/value pairs in divs or spans
    $('[class*="label"], [class*="field"], [class*="detail"]').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const labelMatch = text.match(/^([^:]+):\s*(.+)$/);
      if (labelMatch) {
        summaryData[labelMatch[1].trim()] = labelMatch[2].trim();
      }
    });
    
    // Look for structured data in divs with specific classes
    $('div[class*="summary"], div[class*="details"], div[class*="info"]').each((_, div) => {
      const $div = $(div);
      $div.find('strong, b, label, dt').each((_, labelEl) => {
        const label = $(labelEl).text().trim().replace(':', '');
        const value = $(labelEl).next().text().trim() || 
                     $(labelEl).parent().text().replace($(labelEl).text(), '').trim();
        if (label && value && value.length > 0) {
          summaryData[label] = value;
        }
      });
    });
    
    data.summary = summaryData;
    
    // Extract links using shared utility
    const links = extractLinks($, true);
    // Add title attribute for Cheerio (Playwright version doesn't have it)
    data.additionalData.links = links.map(link => ({
      ...link,
      title: link.title || ''
    }));
    
    // Extract building control specific information
    // Look for application numbers, dates, addresses, etc.
    const bodyText = $('body').text();
    const applicationNumberMatch = bodyText.match(/(?:application|reference|ref)[\s#:]*([A-Z0-9\/\-]+)/i);
    const dateMatches = bodyText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g);
    const postcodeMatch = bodyText.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i);
    
    data.buildingControl = {
      applicationNumber: applicationNumberMatch ? applicationNumberMatch[1] : null,
      dates: dateMatches ? dateMatches.slice(0, 5) : [], // First 5 dates found
      postcode: postcodeMatch ? postcodeMatch[0] : null,
      fullTextLength: bodyText.length
    };
    
    // Extract any JSON-LD structured data
    const jsonLdData = [];
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const jsonData = JSON.parse($(script).html());
        jsonLdData.push(jsonData);
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    if (jsonLdData.length > 0) {
      data.additionalData.structuredData = jsonLdData;
    }
    
    // Extract meta tags
    const metaTags = {};
    $('meta').each((_, meta) => {
      const name = $(meta).attr('name') || $(meta).attr('property') || $(meta).attr('itemprop');
      const content = $(meta).attr('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });
    data.additionalData.metaTags = metaTags;
    
    // Save HTML for debugging
    try {
      const htmlPath = await saveHtmlFile(actualPageHtml, 'task2', './output');
      console.log('HTML saved to:', htmlPath);
    } catch (e) {
      console.log('⚠️  Could not save HTML:', e.message);
    }
    
    console.log('✅ Data extraction complete!');
    console.log(`   - Summary fields: ${Object.keys(data.summary).length}`);
    console.log(`   - Form fields: ${Object.keys(data.details.formFields).length}`);
    console.log(`   - Tables: ${data.details.tables.length}`);
    console.log(`   - Links: ${data.additionalData.links.length}`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.statusCode);
      console.error('   URL:', error.response.url);
    }
    throw new Error(`WNC scraping failed: ${error.message}`);
  }
}

