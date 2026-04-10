# Gainbase - Portfolio Tracking iOS App

A comprehensive iOS portfolio tracking application built with React Native and Expo, designed to help you monitor and analyze your investment portfolio with powerful analytics and insights.

## 📱 Features

### Portfolio Overview

- **Real-time Holdings Tracking**: Monitor your entire portfolio with live price updates
- **Privacy Mode**: Toggle sensitive financial information visibility with a single tap
- **Multi-metric Dashboard**: Track total value, 1-day returns, total returns, realized/unrealized returns, invested amount, and XIRR
- **Custom Branding**: Support for custom header logo and external links

### Advanced Analytics

- **Multi-dimensional Analysis**: View portfolio breakdown by:
  - Sector
  - Company
  - Asset Type (Large Cap, Mid Cap, Small Cap, ETF)
  - Broker
- **Interactive Pie Charts**: Visual representation of portfolio allocation
- **Flexible Sorting**: Sort holdings by current value, returns, or contribution
- **Company Deep Dives**: Detailed stock-level analysis with company logos

### Performance Insights

- **Top Movers**: Track your best and worst performing holdings
- **Win/Loss Analysis**: Visualize winning vs losing positions
- **Activity Calendar**: Heat map of your trading activity
- **Yearly Analysis**: Year-over-year performance with asset distribution breakdown
- **Monthly Analysis**: Month-by-month investment tracking and growth metrics
- **Portfolio Forecasting**: Project future portfolio value based on historical performance

### Transaction Management

- **Easy Transaction Entry**: Add buy/sell transactions with a clean, intuitive interface
- **Multi-broker Support**: Track investments across different brokers (Upstox, Groww, IND Money, etc.)
- **CSV Import**: Bulk import transactions from Excel/CSV files
- **Transaction History**: Complete audit trail of all portfolio activities

### Sharing & Export

- **Shareable Performance Cards**: Generate beautiful cards showcasing your portfolio performance
- **Export Functionality**: Share portfolio snapshots with others
- **Custom Currency Display**: Toggle between showing/hiding currency symbols

## 🛠 Tech Stack

- **Framework**: React Native with Expo (~54.0.32)
- **Navigation**: Expo Router (~6.0.22)
- **State Management**: Zustand (~5.0.10)
- **Database**: Expo SQLite (~16.0.10)
- **Charts**: React Native Gifted Charts (~1.4.70)
- **Icons**: Lucide React Native (~0.563.0)
- **UI Components**:
  - React Native Gesture Handler (~2.28.0)
  - React Native Reanimated (~4.1.1)
  - Expo Linear Gradient (~15.0.8)
- **Data Processing**:
  - XLSX (~0.18.5) for Excel file handling
  - Lodash (~4.17.23) for data manipulation
  - date-fns (~4.1.0) for date operations

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Xcode) or physical iOS device
- macOS (for iOS development)

## 🚀 Getting Started

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Portfolio_ios_app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

4. **Run on iOS**
   ```bash
   npm run ios
   ```

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run ios` - Run the app on iOS simulator/device
- `npm run android` - Run the app on Android emulator/device
- `npm run web` - Run the app in web browser

## 📁 Project Structure

```
Portfolio_ios_app/
├── app/                      # App screens and routes
│   ├── (tabs)/              # Tab-based navigation screens
│   │   └── index.tsx        # Main portfolio screen
│   ├── analytics.tsx        # Analytics dashboard
│   ├── add-transaction.tsx  # Transaction entry screen
│   ├── settings.tsx         # App settings
│   ├── forecast-details.tsx # Portfolio forecast details
│   ├── yearly-analysis.tsx  # Yearly performance breakdown
│   └── monthly-analysis.tsx # Monthly performance breakdown
├── components/              # Reusable UI components
│   ├── ActivityCalendar.tsx # Trading activity heat map
│   ├── ForecastCard.tsx     # Portfolio forecast widget
│   ├── ShareableCard.tsx    # Shareable performance card
│   ├── TopMovers.tsx        # Top gainers/losers widget
│   └── WinLossCard.tsx      # Win/loss ratio widget
├── store/                   # Zustand state management
│   └── usePortfolioStore.ts # Portfolio state and logic
├── services/                # External services
│   └── tickerService.ts     # Stock price fetching service
├── constants/               # App constants and themes
│   └── Colors.ts            # Color scheme definitions
├── types/                   # TypeScript type definitions
├── assets/                  # Images and static assets
└── app.json                 # Expo configuration
```

## ⚙️ Configuration

### App Settings

The app supports various customization options accessible through the Settings screen:

- **User Name**: Personalize your portfolio display
- **Currency Symbol**: Toggle ₹ symbol visibility
- **Privacy Mode**: Hide sensitive financial data
- **Header Logo**: Add custom branding
- **Header Link**: Link to external website/profile
- **Forecast Years**: Configure portfolio projection timeframe

### Database

The app uses SQLite for local data storage. All portfolio data is stored securely on-device with no external server dependencies.

## 🎨 Features in Detail

### XIRR Calculation

The app calculates Extended Internal Rate of Return (XIRR) to provide accurate annualized return metrics accounting for the timing and size of cash flows.

### Real-time Price Updates

Stock prices are automatically refreshed every 5 minutes when the app is active, with manual refresh available via pull-to-refresh gesture.

### Background Processing

Utilizes Expo Background Fetch and Task Manager for periodic data updates even when the app is in the background.

### Haptic Feedback

Enhanced user experience with tactile feedback on all interactive elements.

## 📱 Platform Support

- **iOS**: Full support (primary platform)
- **Android**: Supported with edge-to-edge display
- **Web**: Basic support via Expo Web

## 🔐 Privacy & Security

- **Local-first**: All data stored locally on device
- **Privacy Mode**: Quick toggle to hide sensitive information
- **Biometric Authentication**: Expo Local Authentication support for app access
- **No Cloud Sync**: Your financial data never leaves your device

## 📄 License

This project is private and proprietary.

## 👨‍💻 Developer

Developed by Akash Sharma

## 🤝 Contributing

This is a personal project. For questions or suggestions, please contact the developer.

## 📞 Support

For issues or feature requests, please create an issue in the repository.

---

**Note**: This app is designed for personal portfolio tracking and analysis. Always verify calculations and consult with financial advisors for investment decisions.
