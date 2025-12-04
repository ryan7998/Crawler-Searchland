export const config = {
  // Task 1: Edinburgh building control URL
  task1Url: 'https://citydev-portal.edinburgh.gov.uk/idoxpa-web/scottishBuildingWarrantDetails.do?keyVal=T1A67ZEWK0T00&activeTab=summary',
  
  // Output settings
  outputDir: './output',
  
  // Browser settings
  browser: {
    headless: true,
    timeout: 30000, // 30 seconds
    viewport: {
      width: 1920,
      height: 1080
    }
  }
};

