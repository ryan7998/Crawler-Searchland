# Crawler-Searchland

A Node.js scraping repository for extracting building control data from planning portals using Playwright.

## Features

- **Task 1**: Scrape Edinburgh building control data using Playwright
- **Proxy Support**: Optional Oxylabs proxy integration with UK location targeting
- **Proxy Rotation**: Automatically rotates through multiple UK cities for IP diversity
- **Stealth Features**: Random user agents, realistic headers, and UK locale/timezone settings
- **Retry Logic**: Automatic retry with proxy rotation on connection failures
- **Comprehensive Data Extraction**: Extracts summary, form fields, tables, and geometry data
- **Debug Output**: Saves screenshots, HTML, and text files for troubleshooting
- **Environment-based Configuration**: Proxy credentials stored securely in `.env` file

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ryan7998/Crawler-Searchland.git
cd Crawler-Searchland
```

2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npx playwright install chromium
```

4. Configure environment variables (optional):

Create a `.env` file in the root directory with your Oxylabs proxy credentials:

```env
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
OXYLABS_SERVER=http://pr.oxylabs.io:7777
```

**Note**: If proxy credentials are not provided, the scraper will run without a proxy. However, some sites (like the Edinburgh portal) may require a proxy/VPN to access.

## Usage

### Task 1: Edinburgh Building Control Scraper

Run the scraper:

```bash
npm start
```

Or directly:

```bash
node index.js
```

The scraper will:

1. Check for proxy credentials in `.env` file
2. Navigate to the Edinburgh building control page (with proxy if configured)
3. Retry with proxy rotation if connection fails
4. Extract all available building control data
5. Look for geometry/coordinate data
6. Output the results to:
   - Console (pretty-printed JSON)
   - File in `./output/` directory (with timestamp)
7. Save debug files (screenshots, HTML, text) for troubleshooting

## Output

The scraper extracts:

- **Summary**: Information from the summary tab
- **Form Fields**: All input, select, and textarea values
- **Tables**: Structured table data with headers and rows
- **Geometry**: Map components, GeoJSON, coordinate data from scripts/data attributes
- **Additional Data**: Links, page title, full text length

### Output Files

- **JSON Data**: `building-control-YYYY-MM-DDTHH-MM-SS.json` - Main scraped data
- **Screenshots**: `screenshot-{timestamp}.png` - Visual page capture
- **HTML**: `page-html-{timestamp}.html` - Full page HTML
- **Text**: `page-text-{timestamp}.txt` - Plain text content

All files are saved in the `./output/` directory.

## Project Structure

```
.
├── index.js              # Main entry point
├── src/
│   ├── scraper.js        # Playwright scraper implementation
│   ├── config.js         # Configuration settings
│   └── utils.js          # Utility functions
├── output/               # Generated output files (gitignored)
├── .env                  # Environment variables (proxy credentials, gitignored)
├── .gitignore            # Git ignore rules
├── package.json
└── README.md
```

## Configuration

### Environment Variables (`.env`)

- `OXYLABS_USERNAME`: Your Oxylabs username
- `OXYLABS_PASSWORD`: Your Oxylabs password
- `OXYLABS_SERVER`: Proxy server URL (default: `http://pr.oxylabs.io:7777`)

### Config File (`src/config.js`)

Edit `src/config.js` to modify:

- **Target URLs**: Change `task1Url` to scrape different pages
- **Output Directory**: Modify `outputDir` path
- **Browser Settings**:
  - `headless`: Run browser in headless mode (default: `true`)
  - `timeout`: Page load timeout in milliseconds (default: 180000)
  - `viewport`: Browser viewport size
- **Proxy Settings**:
  - `ukCities`: Array of UK cities for proxy rotation
  - Proxy is automatically configured if credentials exist in `.env`

## Features Details

### Proxy Support

- **Automatic Detection**: Proxy is only used if credentials are found in `.env`
- **Location Rotation**: Rotates through UK cities (Manchester, London, Birmingham, Leeds, Glasgow, Edinburgh, Liverpool, Bristol)
- **Session Management**: Each proxy connection uses unique session IDs
- **Retry Logic**: Automatically retries with new proxy location on connection failures

### Stealth Features

- Random user agents from a pool of realistic browsers
- UK-specific headers (Accept-Language: en-GB, timezone: Europe/London)
- Realistic browser fingerprinting
- Random delays between requests

### Error Handling

- Up to 5 retry attempts with proxy rotation
- Detailed error logging
- Debug files saved on failures (screenshots, HTML, text)
- Graceful fallback when proxy is unavailable

## Notes

- The scraper runs in headless mode by default
- Network requests use multiple wait strategies (`commit`, `domcontentloaded`, `networkidle`)
- Geometry extraction attempts multiple strategies (map components, GeoJSON, data attributes, hidden inputs)
- Some sites may require a proxy/VPN to access (e.g., Edinburgh portal blocks direct connections)

## License

ISC
