# Crawler-Searchland

A Node.js scraping repository for extracting building control data from planning portals.

## Features

- **Task 1**: Scrape Edinburgh building control data using Playwright
- Extracts comprehensive building control information including geometry data
- Outputs data as JSON to both console and file

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

1. Navigate to the Edinburgh building control page
2. Extract all available building control data
3. Look for geometry/coordinate data
4. Output the results to:
   - Console (pretty-printed JSON)
   - File in `./output/` directory (with timestamp)

## Output

The scraper extracts:

- Summary information from the summary tab
- All form fields and input values
- Table data
- Geometry data (if available from maps, GeoJSON, or coordinate fields)
- Additional metadata (links, page title, etc.)

Output files are saved as: `building-control-YYYY-MM-DDTHH-MM-SS.json`

## Project Structure

```
.
├── index.js              # Main entry point
├── src/
│   ├── scraper.js        # Playwright scraper implementation
│   ├── config.js         # Configuration settings
│   └── utils.js          # Utility functions
├── output/               # Generated output files (gitignored)
├── package.json
└── README.md
```

## Configuration

Edit `src/config.js` to modify:

- Target URLs
- Output directory
- Browser settings (headless mode, timeout, viewport)

## Notes

- The scraper runs in headless mode by default
- Network requests are waited for using `networkidle` to ensure content is loaded
- Geometry extraction attempts multiple strategies (map components, GeoJSON, data attributes, hidden inputs)

## License

ISC
