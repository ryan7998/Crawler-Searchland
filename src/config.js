import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Task 1: Edinburgh building control URL
  // task1Url: 'https://www.amazon.co.uk/',
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
  // Only use proxy if credentials are provided in .env
  proxy: (() => {
    const username = process.env.OXYLABS_USERNAME;
    const password = process.env.OXYLABS_PASSWORD;
    
    // Only return proxy config if both username and password are provided
    if (username && password) {
      return {
        server: process.env.OXYLABS_SERVER || 'http://pr.oxylabs.io:7777',
        username: username,
        password: password,
        // UK cities to rotate through for IP rotation
        ukCities: ['manchester', 'london', 'birmingham', 'leeds', 'glasgow', 'edinburgh', 'liverpool', 'bristol'],
        // Generate random username with location rotation
        getUsername: function(city = null) {
          const selectedCity = city || this.ukCities[Math.floor(Math.random() * this.ukCities.length)];
          const sessid = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
          return `customer-${this.username}-cc-gb-city-${selectedCity}-sessid-${sessid}-sesstime-10`;
        }
      };
    }
    return null; // No proxy if credentials are missing
  })()
};

