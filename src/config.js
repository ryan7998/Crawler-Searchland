import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Task 1: Edinburgh building control URL
  task1Url: 'https://citydev-portal.edinburgh.gov.uk/idoxpa-web/scottishBuildingWarrantDetails.do?keyVal=T1A67ZEWK0T00&activeTab=summary',
  
  // Output settings
  outputDir: './output',
  
  // Browser settings
  browser: {
    headless: true,
    timeout: 180000, // 180 seconds (3 minutes - proxy can be very slow)
    viewport: {
      width: 1920,
      height: 1080
    }
  },
  
  // Oxylabs proxy configuration with rotation
  // For UK location targeting with multiple cities
  proxy: {
    server: process.env.OXYLABS_SERVER || 'http://pr.oxylabs.io:7777',
    username: process.env.OXYLABS_USERNAME || '',
    password: process.env.OXYLABS_PASSWORD || '',
    // UK cities to rotate through for IP rotation
    ukCities: ['manchester', 'london', 'birmingham', 'leeds', 'glasgow', 'edinburgh', 'liverpool', 'bristol'],
    // Generate random username with location rotation
    getUsername: function(city = null) {
      const baseUsername = this.username || process.env.OXYLABS_USERNAME || '';
      const selectedCity = city || this.ukCities[Math.floor(Math.random() * this.ukCities.length)];
      const sessid = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
      return `customer-${baseUsername}-cc-gb-city-${selectedCity}-sessid-${sessid}-sesstime-10`;
    }
  }
};

