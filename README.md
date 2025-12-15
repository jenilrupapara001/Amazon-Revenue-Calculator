# Amazon FBA Pro Calculator

![Amazon FBA Pro Calculator](public/assets/amazon-in-logo.png)

A comprehensive, offline-first Amazon FBA profitability calculator designed specifically for the Indian marketplace. Built with React + TypeScript + Vite, this tool helps Amazon sellers calculate accurate FBA fees and profit margins for their product portfolio.

## 🚀 Features

### Core Functionality
- **Bulk ASIN Management**: Import and manage thousands of ASINs via manual entry or CSV upload
- **Live Data Integration**: Fetch real-time product data, pricing, and specifications from Keepa API
- **Comprehensive Fee Calculation**: Calculate all Amazon India FBA fees including:
  - Referral fees (category-based percentage)
  - Closing fees (price-range and seller-type based)
  - Shipping fees (weight and size-tier based)
  - Storage fees (volume-based)
  - GST/Tax calculations (18%)

### Advanced Features
- **Configurable Fee Masters**: Import and manage fee structures via CSV with specialized parsers
- **Category Mapping**: Intelligent mapping between Keepa categories and fee categories
- **Node ID Mapping**: Direct category node ID mapping for precise fee calculations
- **Fuzzy Matching**: Advanced category matching algorithms for accurate fee application
- **Performance Optimized**: Client-side pagination and search for datasets with 20k+ entries
- **Offline-First**: IndexedDB persistence with hybrid server-sync fallback
- **Export Capabilities**: Export detailed profitability analysis to CSV

### User Interface
- **Modern Dashboard**: Clean, responsive interface with key metrics visualization
- **Intuitive Navigation**: Streamlined workflow from ASIN upload to profit analysis
- **Real-time Status**: Track fetch progress and calculation status for each ASIN
- **Advanced Filtering**: Search and filter by ASIN, title, category, and profitability metrics

## 🛠 Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library with Lucide React icons
- **Data Storage**: IndexedDB for client-side persistence
- **API Integration**: Keepa API for product data
- **Data Processing**: Custom CSV parsers with robust error handling

## 📋 Prerequisites

- Node.js 18+ and npm
- (Optional) Keepa API subscription for live data fetching

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd amazon-revenue-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 📖 User Guide

### 1. Initial Setup

1. **API Configuration**: Navigate to Dashboard → API Configuration
2. **Keepa API Key**: Enter your Keepa API subscription key
3. **User Authentication**: Simple login with email/password

### 2. Fee Configuration

Configure Amazon India fee structures via the Fees page:

#### Referral Fees
- Category-based percentage fees
- Support for multiple price tiers per category
- CSV import with header format: `Categories, Category Node, 0-300, 301-500, 501-1000, Above 1000`

#### Closing Fees
- Price-range based fixed fees
- Support for multiple seller types (FC, SF, ES, MFN)
- CSV import with format: `Categories, Category Node, FC0-300, FC301-500, FCAbove1000, SF0-300, etc.`

#### Shipping Fees
- Weight and size-tier based fees
- Support for incremental calculation
- Size tiers: Standard, Heavy, Oversize

#### Storage Fees
- Volume-based storage costs
- Configurable rates per cubic foot

#### Category Mapping
- Map Keepa category names to fee categories
- Fuzzy matching for similar category names
- Node ID mapping for precise category matching

### 3. ASIN Management

#### Manual Entry
```
B08N5KWB9H
B07XJ8C8F7
B09XYZ1234
```

#### CSV Upload
Format: `ASIN, SizeTier` (SizeTier is optional)
```
B08N5KWB9H, Standard
B07XJ8C8F7, Oversize
B09XYZ1234, Heavy
```

### 4. Data Fetching and Calculation

1. **Fetch Data**: Click "Fetch" to retrieve product information from Keepa
2. **Force Refresh**: Use "Force" to refresh all ASINs regardless of status
3. **Calculate**: Run profitability calculations with current fee structures
4. **Export**: Download results as CSV for external analysis

## 📊 CSV Import Formats

### Master Sheet (Referral Fees)
```csv
Categories,Category Node,0-300,301-500,501-1000,Above 1000
Electronics,1571272031,8,6,4,2
Books,,15,15,15,15
```

### Closing Fees CSV
```csv
Categories,Category Node,FC0-300,FC301-500,FC501-1000,FCAbove1000,SF0-300,SF301-500
Electronics,1571272031,26,46,86,166,35,55
Books,,15,25,35,45,20,30
```

### ASIN Import CSV
```csv
ASIN,SizeTier
B08N5KWB9H,Standard
B07XJ8C8F7,Oversize
B09XYZ1234,Heavy
```

## 🔧 Project Structure

```
├── src/
│   ├── App.tsx              # Main application component
│   ├── components/
│   │   ├── Layout.tsx       # Navigation and layout
│   │   ├── ui/              # Reusable UI components
│   │   └── UserSettings.tsx # User configuration
│   ├── services/
│   │   ├── db.ts            # IndexedDB operations
│   │   └── engine.ts        # Core calculation engine
│   ├── types.ts             # TypeScript definitions
│   └── index.css            # Global styles
├── public/
│   └── assets/              # Static assets
└── package.json
```

## 💾 Data Storage

- **localStorage**: User settings, API keys, session data
- **IndexedDB**: Product data, fee structures, calculation results
- **Server Sync**: Optional backend integration for data synchronization

## 🔄 Calculation Logic

### Fee Priority Order
1. **Referral Fees**: Node ID → Category Mapping → Name Match → Fuzzy Match
2. **Closing Fees**: Node ID → Category Mapping → Name Match → Price Tier Fallback
3. **Shipping Fees**: Size Tier → Weight Range → Incremental Calculation
4. **Storage Fees**: Volume-based with dimension calculation

### Profit Formula
```
Net Profit = Price - (Referral Fee + Closing Fee + Shipping + Storage + Tax)
Margin % = (Net Profit / Price) × 100
```

## 📈 Performance

- **Chunked Processing**: API requests processed in chunks of 100 ASINs
- **Client-side Pagination**: Efficient handling of large datasets
- **Bulk Operations**: IndexedDB transactions optimized for large imports
- **Retry Logic**: Automatic retry with exponential backoff for API failures

## 🐛 Troubleshooting

### Common Issues

**API Connection Issues**
```
Error: Invalid API Key
```
- Verify Keepa API key in Dashboard → API Configuration
- Check API quota and subscription status

**Calculation Errors**
```
Error: Price is 0
```
- Ensure product data was fetched successfully
- Check ASIN validity and product availability

**Import Failures**
```
CSV appears empty
```
- Verify CSV format matches expected structure
- Check for special characters and encoding issues

### Debug Mode

Enable browser console logging for detailed calculation tracking:
- `[FeeCalc]` prefixes show fee matching logic
- `[Keepa]` prefixes show API fetch progress

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain backward compatibility for data structures
- Add appropriate error handling and logging
- Test with large datasets for performance validation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Verify CSV formats match documentation
- Ensure Keepa API subscription is active

## 🔮 Roadmap

- [ ] Enhanced reporting with charts and graphs
- [ ] Multi-marketplace support (US, EU, etc.)
- [ ] Advanced profit optimization recommendations
- [ ] Integration with additional data sources
- [ ] Automated fee structure updates
- [ ] Mobile-responsive design improvements

---

**Built with ❤️ for Amazon FBA Sellers**

*Accurate fee calculations for profitable selling on Amazon India*
