# Crawler-Searchland

A Node.js scraping repository for extracting building control data from planning portals using Playwright.

## Features

- **Task 1**: Scrape Edinburgh building control data using Playwright
- **Task 2**: Scrape WNC (West Northamptonshire Council) building control data using Got
- **Proxy Support**: Optional Oxylabs proxy integration with UK location targeting
- **Proxy Rotation**: Automatically rotates through multiple UK cities for IP diversity (Task 1)
- **Stealth Features**: Random user agents, realistic headers, and UK locale/timezone settings
- **Retry Logic**: Automatic retry with proxy rotation on connection failures (Task 1)
- **Disclaimer Handling**: Automatically accepts disclaimers to access building control pages (Task 2)
- **Comprehensive Data Extraction**: Extracts summary, form fields, tables, and geometry data
- **DRY Architecture**: Shared extraction utilities for code reusability
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

The scraper supports running individual tasks or all tasks at once:

```bash
# Run Task 1 (Edinburgh) - default
npm start
# or
node index.js
# or
node index.js 1

# Run Task 2 (WNC)
node index.js 2

# Run both tasks
node index.js all
```

### Task 1: Edinburgh Building Control Scraper (Playwright)

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

### Task 2: WNC Building Control Scraper (Got)

The scraper will:

1. Check for proxy credentials in `.env` file (optional)
2. Fetch the disclaimer page
3. Automatically accept the disclaimer to access the building control page
4. Extract all available building control data including:
   - Application reference numbers
   - Application types and status
   - Site addresses and descriptions
   - Dates (received, valid, decision, commencement, completion)
   - Plot information
   - Structured table data
5. Output the results to:
   - Console (pretty-printed JSON)
   - File in `./output/` directory (with timestamp: `wnc-building-control-*.json`)
6. Save HTML file for debugging

## Output

### Task 1 Output

The scraper extracts:

- **Summary**: Information from the summary tab
- **Form Fields**: All input, select, and textarea values
- **Tables**: Structured table data with headers and rows
- **Geometry**: Map components, GeoJSON, coordinate data from scripts/data attributes
- **Additional Data**: Links, page title, full text length

### Task 2 Output

The scraper extracts:

- **Application Details**: Reference number, type, status
- **Site Information**: Address, description, parish
- **Dates**: Received, validated, decision, commencement, completion dates
- **Plot Information**: Plot numbers, addresses, statuses, dates
- **Tables**: Structured building control application data
- **Disclaimer**: Disclaimer acceptance status and return URLs
- **Additional Data**: Links, meta tags, page title

### Output Files

**Task 1:**

- **JSON Data**: `building-control-YYYY-MM-DDTHH-MM-SS.json` - Main scraped data
- **Screenshots**: `screenshot-{timestamp}.png` - Visual page capture
- **HTML**: `page-html-{timestamp}.html` - Full page HTML
- **Text**: `page-text-{timestamp}.txt` - Plain text content

**Task 2:**

- **JSON Data**: `wnc-building-control-YYYY-MM-DDTHH-MM-SS.json` - Main scraped data
- **HTML**: `task2-html-{timestamp}.html` - Full page HTML

All files are saved in the `./output/` directory.

## Project Structure

```
.
├── index.js              # Main entry point (supports task selection)
├── src/
│   ├── scraper.js        # Task 1: Playwright scraper implementation
│   ├── scraper-task2.js  # Task 2: Got scraper implementation
│   ├── config.js         # Configuration settings (URLs, proxy, browser)
│   ├── extractors.js     # Shared data extraction utilities (DRY principle)
│   └── utils.js          # Utility functions (file saving, console output)
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

- **Target URLs**:
  - `task1Url`: Edinburgh building control page URL
  - `task2Url`: WNC planning register disclaimer page URL
- **Output Directory**: Modify `outputDir` path
- **Browser Settings** (Task 1 only):
  - `headless`: Run browser in headless mode (default: `true`)
  - `timeout`: Page load timeout in milliseconds (default: 180000)
  - `viewport`: Browser viewport size
- **Proxy Settings**:
  - `ukCities`: Array of UK cities for proxy rotation (Task 1)
  - Proxy is automatically configured if credentials exist in `.env`
  - Both tasks support proxy if credentials are available

## Features Details

### Task 1: Playwright Scraper

- **Browser Automation**: Uses Playwright for full browser rendering
- **Proxy Support**:
  - Automatic detection from `.env` file
  - Location rotation through UK cities (Manchester, London, Birmingham, Leeds, Glasgow, Edinburgh, Liverpool, Bristol)
  - Session management with unique session IDs
  - Retry logic with proxy rotation on connection failures
- **Stealth Features**:
  - Random user agents from a pool of realistic browsers
  - UK-specific headers (Accept-Language: en-GB, timezone: Europe/London)
  - Realistic browser fingerprinting
  - Random delays between requests
- **Error Handling**:
  - Up to 5 retry attempts with proxy rotation
  - Detailed error logging
  - Debug files saved on failures (screenshots, HTML, text)
  - Graceful fallback when proxy is unavailable

### Task 2: Got Scraper

- **HTTP Client**: Uses Got for lightweight HTTP requests
- **HTML Parsing**: Uses Cheerio for server-side HTML parsing
- **Disclaimer Handling**:
  - Automatically detects disclaimer pages
  - Submits disclaimer acceptance forms
  - Follows redirects to access building control pages
- **Proxy Support**:
  - Optional proxy support if credentials are in `.env`
  - Uses same proxy configuration as Task 1
- **Data Extraction**:
  - Extracts structured table data
  - Parses application details, dates, and plot information
  - Handles multiple data formats and structures
- **Error Handling**:
  - Built-in retry logic for HTTP errors
  - Graceful fallback when disclaimer acceptance fails
  - Saves HTML for debugging

## Notes

### Task 1 (Playwright)

- The scraper runs in headless mode by default
- Network requests use multiple wait strategies (`commit`, `domcontentloaded`, `networkidle`)
- Geometry extraction attempts multiple strategies (map components, GeoJSON, data attributes, hidden inputs)
- Some sites may require a proxy/VPN to access (e.g., Edinburgh portal blocks direct connections)

### Task 2 (Got)

- Lightweight HTTP client - faster than browser automation
- Automatically handles disclaimer acceptance
- Extracts structured data from HTML tables
- Works without proxy for most sites, but proxy can be configured if needed

### Dependencies

- **Task 1**: Requires `playwright` (browser automation)
- **Task 2**: Requires `got` (HTTP client) and `cheerio` (HTML parsing)
- Both tasks: Require `dotenv` for environment variable management

## License

ISC
