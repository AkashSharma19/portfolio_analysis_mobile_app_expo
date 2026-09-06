# Gainbase Project Wiki

Welcome to the **Gainbase** Project Wiki. This document serves as the comprehensive, single source of truth for the architecture, file organization, state management, and business logic of the Gainbase iOS portfolio tracking and personal finance application.

---

## 🗺️ Table of Contents

- [1. Overview & Architecture](#1-overview--architecture)
- [2. Directory & File Mapping](#2-directory--file-mapping)
- [3. Application Modes & Flow](#3-application-modes--flow)
- [4. State Management (Zustand Stores)](#4-state-management-zustand-stores)
- [5. Business Logic & Financial Calculations](#5-business-logic--financial-calculations)
- [6. Background Fetch & Offline Sync](#6-background-fetch--offline-sync)
- [7. Maintenance Protocol for AI Agents](#7-maintenance-protocol-for-ai-agents)

---

## 1. Overview & Architecture

**Gainbase** is an iOS application built using **React Native** (0.86.3) and **Expo** (~57.0.20) with the **Expo Router** file-based navigation. It is designed to combine portfolio investment tracking with cash-flow/personal budget management. 

### High-Level Architecture Diagram
```mermaid
graph TD
    AppRouter["Expo Router (app/)"] -->|Determines active mode| HomeScreen["AppHomeScreen (app/(tabs)/index.tsx)"]
    HomeScreen --> AppSwitcher["AppSwitcher (components/)"]
    
    subgraph Zustand Stores (AsyncStorage Persisted)
        PortfolioStore["usePortfolioStore (store/)"]
        MoneyStore["useMoneyStore (store/)"]
        AppModeStore["useAppModeStore (store/)"]
    end
    
    subgraph Core Features
        InvestmentsMode["Investments Tracker Mode"]
        MoneyMode["Money Manager Mode"]
    end
    
    AppModeStore -->|activeMode: 'investments' | InvestmentsMode
    AppModeStore -->|activeMode: 'money' | MoneyMode
    
    InvestmentsMode -.->|Reads state| PortfolioStore
    MoneyMode -.->|Reads state| MoneyStore
    
    PortfolioStore -->|Calculates XIRR & Projections| FinanceLib["Finance Library (lib/finance.ts)"]
    PortfolioStore -->|Calculates Health Grade| HealthHook["usePortfolioHealth (hooks/)"]
    PortfolioStore -->|Calculates Recommendations| InsightsHook["useInsights (hooks/)"]
end
```

---

## 2. Directory & File Mapping

Here is the functional map of the directory tree and key files:

| Directory/File | Description | Key Contents / Files |
| :--- | :--- | :--- |
| `app/` | File-based navigation routes & screens. | `_layout.tsx` (Root Stack Config, registers background task), `analytics.tsx` (Investments analytics dashboard), `money-analytics.tsx` (Cash flow analytics with unified net flow hero card, dynamic monthly/quarterly/yearly period navigator, interactive Donut Chart with slice focus, expense vs. income category breakdown, and dual-bar cashflow & surplus trends), `money-insights.tsx` (Dedicated Smart Insights for Money Manager), `money-health.tsx` (Personal financial health grade dashboard), `goals.tsx` (Dynamic Formula-Driven Financial Goal Tracker with minimal card face, swipe-to-edit/delete actions, live evaluations, and multi-target milestone tracks), `create-goal.tsx` (Dedicated iOS-native Create & Edit Financial Goal Studio with Cancel/Save header, AI Natural Language Assistant, What to Track, Direction, and Color Theme modal pickers with pageSheet presentation matching Account Type UX, milestone inputs, and preferences styling), `custom-goal-formula.tsx` (Dedicated Custom Mathematical Formula & Variables Studio page with live syntax evaluator, arithmetic operator bar, domain filter tabs, search, and 28+ variable insert rows), `manage-categories.tsx` (Dedicated Category Management & Icon Studio with 130+ icons, smart auto-suggestions based on category names, live badge preview, and customizable color palette), `ai-chat.tsx` (Gemini AI Chat system), `win-loss-details.tsx` (Win/loss stock positions details), `index-comparison.tsx` (Benchmark returns), `portfolio-health.tsx` & `portfolio-health-formula.tsx` (Grades/criteria), `monthly-analysis.tsx` & `yearly-analysis.tsx` (Month/year performance breakdowns), `sectors.tsx` (Industry sectors listing). |
| `app/(tabs)/` | Tabs layout and navigation index page wrapper. | `_layout.tsx` (Dynamic tab visibilities based on mode: Portfolio, Insights, History, Explore, Profile in Invest mode; Dashboard, Accounts, Budgets, EMIs, Profile in Money mode), `index.tsx` (Home screen displaying `MoneyDashboard` or `PortfolioSummary`), `explore.tsx` (Stock search & watchlist), `insights.tsx` (Investments insights), `money-accounts.tsx` (Net worth details & accounts list with credit card utilization warning badges and investment return percentages), `money-budgets.tsx` (Budget progress meters), `money-loans.tsx` (Loans & EMIs), `profile.tsx` (User profile & customizations), `add.tsx` (Add navigation wrapper), `two.tsx` (Investments Transaction History screen with category filter tabs, broker details, and swipeable/long-press actions). |
| `app/add-*.tsx` | Modals to add various assets/transactions. | `add-transaction.tsx` (BUY/SELL stock), `add-money-transaction.tsx` (Income/expense/transfer with arithmetic calculator), `add-loan.tsx` (Borrowed/lent loan configuration), `add-budget.tsx` (Category budget limit), `add-account.tsx` (Monetary accounts configuration), `add-subscription.tsx` (SaaS subscription). |
| `app/*-details/` | Detailed analytical screens. | `stock-details/[symbol].tsx` (Stock-level holdings & transactions), `account-details/[id].tsx` (Monetary account details showing transaction log, credit card utilization warning alerts, and investment absolute/percentage return badges), `loan-details/[id].tsx` (Institutional loan dashboard with unified hero card, progress bar, 2x2 metric grid, principal vs. interest stacked cost breakdown, action pills, and tabbed amortization schedule with upcoming/paid views), `prepay-loan/[id].tsx` (Dedicated loan prepayment simulator & action execution studio with multi-strategy comparison and direct payment logging), `budget-details/[id].tsx` (Category spend limits tracking), `subscription-details/[id].tsx` (Unified subscription dashboard with clean hero card, category/status badges, horizontal metadata rows, quick action pills for logging payments or cancelling/reactivating, and tabbed renewal schedule with cycle numbers and next due badges), `sector-details/[sector].tsx` (Industry sector allocation details), `analytics-details/[type]/[value].tsx` (Multi-dimensional queries). |
| `components/` | Reusable presentation UI elements. | `MoneyDashboard.tsx`, `FinancialGoalsCard.tsx` (Analytics-driven financial goals & milestones tracker card with live formula evaluation and multi-segment milestone progress track), `FinancialInsights.tsx` (Smart insights dashboard summary card with category chips or AI generation CTA when empty), `PortfolioHealthCard.tsx`, `ActivityCalendar.tsx`, `MoneyActivityCalendar.tsx`, `ForecastCard.tsx`, `InsightsSummaryCard.tsx`, `WinLossCard.tsx`, `HealthDetailCard.tsx`, `HealthGauge.tsx`, `TopMovers.tsx`, `ShareableCard.tsx`, `AppSwitcher.tsx`. |
| `constants/` | Constant configurations (colors, APIs, dimensions). | `Colors.ts` (light/dark themes), `Api.ts` (API configuration endpoints). |
| `hooks/` | Business-logic custom hooks. | `usePortfolioHealth.ts` (health grading algorithm), `useInsights.ts` (investment flags: buy, sell/hold, observe), `useMoneyInsights.ts` (unified budgeting/cashflow insights). |
| `lib/` | Core business logic, mathematical engines, parsers, and financial algorithms. | `goalEvaluator.ts` (Dynamic formula evaluator with 28+ live variables including unblocked CreditCardDebt, BlockedCCDebt, and TotalCCDebt, dynamic debt peak tracking, proportional target ratio milestone tracks, and weighted segment progress calculation), `goalAiParser.ts` (Dual-engine natural language goal intent parser combining Gemini LLM and offline heuristic NLP engine for auto-prefilling goal formulas, milestones, and metadata), `xirr.ts` (Bisection/Newton-Raphson XIRR calculator), `analyticsHelper.ts` (Aggregation & benchmarking engine), `taxCalculator.ts` (Capital gains tax engine), `healthScoreCalculator.ts` (Comprehensive portfolio & personal finance health grades and criteria evaluation), `geminiHelper.ts` (Gemini API bridge & system prompts), `csvImporter.ts` (Tradebook CSV ingestion engine). |
| `store/` | Zustand state management with storage persistence. | `usePortfolioStore.ts`, `useMoneyStore.ts`, `useGoalStore.ts` (Custom formula financial goals and completion state), `useAppModeStore.ts`, `useAiStore.ts` (Gemini chat messages with `ChatAction` ledger commands and AI stock insights). |
| `tasks/` | Background automation tasks. | `backgroundFetch.ts` (registers periodic data backup jobs). |
| `types/` | TypeScript interface definitions. | `index.ts` (portfolio types), `money.ts` (money manager types), `goals.ts` (financial goals, variable definitions, and evaluated goals). |
| `utils/` | Utility helpers & sync engine. | `formatters.ts` (Universal Indian numbering system `en-IN` amount formatting, live input comma masking, calculator expression parsing, and currency helpers), `syncEngine.ts` (Two-way incremental sync between local store and Supabase). |
| `services/` | Peripheral external service adapters. | `DataExportService.ts` (exports/imports transactions backup), `logoService.ts` (Official high-res company vector logos, sector normalizer, and stock utilities). |

---

## 3. Application Modes & Flow

Gainbase has two distinct user modes configured in `useAppModeStore` and switched via `AppSwitcher`:

### A. Investments Tracker Mode
*   **Default View**: Displays total portfolio value, invested amount, total return percentage/PnL, day return percentage/PnL, XIRR, and privacy mode visibility toggle.
*   **Holdings Breakdown**: Horizontal allocation pie charts by sector, company name, asset type, or broker (grouping unassigned broker holdings under **"Unassigned"**). Sorting features for current value, total returns, or contribution percentage.
*   **Detail Screens**: 
    *   `stock-details/[symbol]`: Real-time and historical transactions for a stock ticker, current/yesterday close price, gains.
    *   `portfolio-health`: Visual score gauges (out of 100) based on diversity, performance, risk concentration, and activity consistency.
    *   `insights`: Institutional-grade AI stock portfolio strategist evaluating live holdings, weightings, PnL, P/E ratios, and 52W levels into 4 clear actionable categories: **Buy** (which stocks to buy more / accumulate / average down), **Sell** (what to trim / take profits / stop-loss), **Hold** (core compounding runners to let ride), and **Not Sure** (positions and events to watch & observe).
    *   `forecast-details`: Custom portfolio forecasting (projections) adjusting years, SIP amount, step-up percentage, and inflation adjustments.
    *   `index-comparison`: Compares portfolio returns against indexes (e.g., Nifty 50, S&P 500).

### B. Money Manager Mode
*   **Unified iOS Design System**: All Money Manager screens and configuration modals adhere strictly to the high-end iOS grouped form, card, and typography system established in the Investments Tracker. Hero values use clean regular weights (`fontSize: 24, fontWeight: '400'`, matching the Investments Portfolio card rather than heavy bold weights), row values use `fontSize: 14, fontWeight: '400'`, uppercase section titles use `fontSize: 10, fontWeight: '700', letterSpacing: 1`, icon buttons use `36x36 borderRadius: 18`, and dividers use `marginBottom: 16`. Modals use clean `Cancel` (left) / `Save` (right) header actions, centered titles, segmented pill switchers, and grouped card containers (`borderRadius: 16` or `12`, border dividers, right-aligned values with chevron indicators, and searchable sheet modals). Floating clutter pills and redundant bold styling have been completely eliminated.
*   **Default View (`MoneyDashboard`)**: Displays Net Worth, monthly income/expense/EMIs/subscriptions/savings rate summaries on a clean flat card along with a live **Safe-to-Spend Daily Run-Rate** (`₹X/day (Yd left)`), dynamic side-by-side **Visual Analytics Compact Cards** (a multi-segment SVG Donut Chart for live AI Insights / Signals breakdown and a circular SVG Progress Gauge for Financial Health Score & Grade), an **Upcoming Payments (14 days)** list summarizing soon-to-be-due EMIs and Subscriptions, **Recent Transactions** (restricting to the single most recent transaction date and capped at 3 items), and activity heat maps.
*   **Accounts Tab (`money-accounts`)**: Lists all monetary accounts grouped by type with a premium hero card at the top summarizing Net Worth, Assets, Liabilities (featuring one-tap Privacy Mode toggle and Analytics shortcuts matching the Investments Portfolio card). Grouped account categories feature uppercase group headers, total balance summaries, and a clean drag-and-drop / arrow reorder modal. Investment accounts display their live investment current value (linked to portfolio brokers) alongside manual invested amounts and absolute/percentage returns. Credit cards show real-time utilization stats with progress bars color-coded dynamically (yellow/red) when utilization exceeds moderate (30%) and high (70%) thresholds.
*   **Cash Flow & Add Transaction**: Clean, unified iOS grouped form design (`add-money-transaction.tsx`) with segmented `Expense`/`Income`/`Transfer` pill switcher, grouped `TRANSACTION DETAILS` and `DATE & NOTES` card rows with right-aligned values and `ChevronRight` triggers, live Indian amount formatting, searchable modal pickers for categories with `CategoryIcon` and accounts with bank logos. The transaction ledger (`all-money-transactions.tsx`) features a summary card, clean grouped rows, and a collapsible Bottom Sheet Filter (date ranges, category tags, transaction types).
*   **Loan & EMI Tracker (`money-loans`)**: Segmented switcher between Loans and Subscriptions, total monthly EMI burden and debt summary card, and clean grouped cards tracking remaining EMI counts, interest rates, and loan progress.
*   **Budgeting Suite (`money-budgets`)**: Monthly budget overview card comparing Total Spent against Total Budget Allocation, smooth month switcher, and clean category-wise spending meters (e.g., food, bills, shopping).
*   **Subscription Manager (`add-subscription`)**: Tracking active SaaS subscriptions, recurring cycles, monthly cost burdens, auto-advancing billing cycles, and grouped service details.
*   **Smart Insights Screen (`money-insights`)**: Dedicated AI-only page matching the design system of the Investments Insights page. Features an initial AI Hero generation state, search filter, category tabs (`All`, `Alerts`, `Tips`, `Achievements`), and a header **[ ✨ REFRESH ]** button to execute on-demand Gemini AI analysis across live accounts, cashflow, debts, and budgets with direct resolution shortcuts. Static rule-based insights have been removed.
*   **Financial Health Dashboard (`money-health`)**: Dedicated page evaluating Savings rate, Emergency fund cushions, DTI ratios, and credit card utilization ratios into a unified health score out of 100 with actionable feedback.

---

## 4. State Management (Zustand Stores)

All stores use `AsyncStorage` via Zustand's `persist` middleware to survive app restarts.

### 1. `useAppModeStore` (`app-mode-storage`)
*   **Purpose**: Manages the current application UI mode.
*   **State**:
    *   `activeMode`: `'investments' | 'money'`
    *   `isTransitioning`: Boolean indicating tab animation state.
*   **Actions**:
    *   `setActiveMode(mode)`
    *   `setIsTransitioning(val)`

### 2. `usePortfolioStore` (`portfolio-storage`)
*   **State**:
    *   `transactions`: Complete list of stock/ETF transactions (`id`, `symbol`, `type` [BUY/SELL], `quantity`, `price`, `date`, `broker`). Automatically validates and sanitizes all transaction IDs to unique strings during addition, import, and rehydration.
    *   `tickers`: Array of ticker metadata (yesterday close, current price, company name, asset type, sector, etc.) fetched from the `public.tickers` table in Supabase (which is populated via a Google Apps Script push trigger from the Google Sheet).
    *   `isPrivacyMode`: Boolean.
    *   `showCurrencySymbol`: Boolean (shows or hides `₹`).
    *   `theme`: `'system' | 'light' | 'dark'`.
    *   `watchlist`: List of ticker symbols.
    *   `deletedTransactionIds`, `deletedWatchlistIds`: Lists of deleted records to track offline deletions for Supabase cloud sync.
    *   `forecastYears`, `targetCorpus`, `sipStepUp`, `manualMonthlySIP`, `isInflationAdjusted`.
*   **Actions**:
    *   `addTransaction(transaction)`: Inserts new transaction with guaranteed string ID and timestamp.
    *   `removeTransaction(id)`: Safely removes transaction by string ID comparison and queues ID for Supabase deletion sync.
    *   `updateTransaction(id, transaction)`: Safely updates transaction by string ID.
    *   `importTransactions(transactions)`: Sanitizes IDs and appends imported records.
*   **Calculations / Selectors**:
    *   `calculateSummary()`: Returns total cost, current value, realized/unrealized gains, XIRR, and 1-day/1-year returns.
    *   `getAllocationData(dimension)`: Allocates portfolio weights based on sector, broker, etc. For `Broker` dimension, accurately evaluates multi-broker stock positions per `(symbol, broker)` pair.
    *   `getHoldingsData(brokerFilter?)`: Aggregates buy/sell transactions into current positions (or filtered per broker), calculating average buy price, current cost, market value, and total return.

### 3. `useMoneyStore` (`money-manager-storage`)
*   **State**:
    *   `accounts`: List of monetary accounts (e.g., Bank, Credit Card, Cash, or Investments). Investment accounts can be linked to a portfolio broker via `linkedBroker`. Supports custom account order positioning.
    *   `accountTypesOrder`: Custom display order array for account type sections on the Accounts screen.
    *   `moneyTransactions`: List of income and expense transactions.
    *   `loans`: Borrowed or lent funds with principal, interest rate, duration, and EMI configuration. Supports "EMIs Already Paid" tracking upon loan creation with automatic amortization schedule computation and historical EMI payment generation.
    *   `emiPayments`: Log of EMI transaction logs (linked to transactions via `transactionId`).
    *   `budgets`: Set budgets per month/year.
    *   `subscriptions`: Active repeating subscriptions.
    *   `subscriptionPayments`: Log of subscription payment logs (linked to transactions via `transactionId`).
    *   `categories`: List of tags for income/expense categorization.
    *   `deletedAccountIds`, `deletedTransactionIds`, `deletedLoanIds`, `deletedEmiPaymentIds`, `deletedBudgetIds`, `deletedBudgetCategoryIds`, `deletedSubscriptionIds`, `deletedSubscriptionPaymentIds`: Lists of deleted records to track offline deletions for Supabase cloud sync.
*   **Actions**:
    *   `setAccountTypesOrder(order)`: Persists customized ordering of account type sections.
    *   `reorderAccounts(accounts)`: Persists customized ordering of individual accounts.
    *   `removeMoneyTransaction(id)`: Deletes a transaction, adjusts account balances, and automatically removes linked EMI/subscription payments (reverting loan outstanding balance/billing cycles).
    *   `removeEMIPayment(paymentId)`: Directly removes an EMI payment and reverts the outstanding loan balance.
    *   `removeSubscriptionPayment(paymentId)`: Directly removes a subscription payment log and reverts the billing cycle.
*   **Calculations / Selectors**:
    *   `getNetWorth()`: Computes total assets (investment values + bank balances) minus liabilities (loans). Accounts linked to a broker dynamically evaluate active portfolio investment values instead of static manual balances.
    *   `getMonthlyEMIBurden()`, `getMonthlySubscriptionBurden()`.
    *   `getCategorySpending(budgetId, year, month)`.

---

## 5. Business Logic & Financial Calculations

### 📈 Internal Rate of Return (XIRR)
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L10-L33)
*   **Methodology**: Newton-Raphson numerical iterative solver.
*   **Formula**:
    $$\sum_{i=1}^{n} \frac{CF_i}{(1 + rate)^{d_i / 365}} = 0$$
    Where $CF_i$ is cashflow transaction amount (positive/negative), $d_i$ represents the number of days elapsed since the first transaction. The solver iterates up to 100 times to converge at a precision of $10^{-6}$.

### 🚀 Future Wealth Projection
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L35-L124)
*   **Methodology**: Monthly compounded returns on base value, plus recurring SIP contributions that step up annually by a given percentage. Optionally discounts the final projected value by the annual inflation rate ($6\%$ default) to show current purchasing power.

### 🩺 Portfolio Health Grading
*   **Location**: [usePortfolioHealth.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/usePortfolioHealth.ts)
*   **Rules**: Max score is 100, broken into four dimensions (25 points each):
    1.  **Diversity**: Checks count of sectors ($\ge 5$), asset types ($\ge 3$), and total stocks ($\ge 12$).
    2.  **Performance & Cost**: Checks total return percentage, proportion of green (profitable) holdings, and XIRR performance.
    3.  **Concentration & Risk**: Verifies if any single stock dominates $>25\%$ of the total valuation, or if cash/ETFs act as buffers.
    4.  **Activity & Consistency**: Scores based on frequency of investments (Activity heat maps) and timeframe of holding.

### 💡 Portfolio Insights Trigger Rules
*   **Location**: [useInsights.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/useInsights.ts)
*   **Triggers**:
    *   **Sell**: Concentration $> 25\%$ (High Risk), Stop Loss $< -15\%$ (Tax-Loss Harvesting).
    *   **Hold**: Profit Book $> 30\%$ (Booking Profit).
    *   **Buy / Add**: Concentration $< 2\%$ (Sub-scale Holding), Large-cap buffer tracking, DCA Opportunity.
    *   **Not Sure**: Extreme volatility, 52W high/low proximity, winning/losing streaks, sector concentration, sync freshness.

### 💡 Money Insights Trigger Rules
*   **Location**: [useMoneyInsights.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/useMoneyInsights.ts)
*   **Triggers**:
    *   **Success**: Monthly savings rate $\ge 20\%$, healthy Debt-to-Income (DTI) ratio $\le 15\%$.
    *   **Warning**: Spending deficit (savings rate $\le 0\%$), budget overspent ($\ge 100\%$), credit card utilization $> 50\%$, cash cover below 1.5x of monthly EMIs, low emergency fund savings (covers $< 3$ months of average expenses), high DTI ratio $> 35\%$, high credit card outstanding debt relative to savings ($> 50\%$).
    *   **Tip**: Low savings rate ($< 10\%$), budget nearing limit ($\ge 85\%$), unbudgeted category spend (spent $\ge ₹2000$ without category limit configured), high idle cash (savings cover $\ge 6$ months of average expenses), high subscription cost burden ($> 8\%$ of income) or active subscription count $\ge 5$, upcoming subscription renewals (within 3 days).

### 🤖 AI Co-pilot Chat & Natural Language Action Execution
*   **Location**: [ai-chat.tsx](file:///Users/akashsharma/Documents/Gainbase/app/ai-chat.tsx) & [useAiStore.ts](file:///Users/akashsharma/Documents/Gainbase/store/useAiStore.ts)
*   **Capabilities**:
    *   **Transaction Necessity Guidance ("Was it needed or not?")**: Evaluates every user expense, peer loan, or purchase intent with candid financial feedback (Essential Need vs Discretionary Want vs Receivable / Peer Loan vs Investment).
    *   **Natural Language Action Detection**: Parses ledger commands directly from conversational chat (e.g. *"I gave 500rs to Rajat"*, *"Spent 450 on food"*, *"Paid 15000 home loan EMI"*, *"Paid Netflix subscription"*).
    *   **Interactive Approval Card**: Displays a dedicated card UI inline in chat showing account targets, loan/subscription linkages, amounts, necessity badges, and explicit **Approve Action** / **Dismiss** buttons before mutating local stores.
    *   **Automatic Account & EMI Linkage**:
        *   Creates `receivable`, `payable`, `wallet`, or `savings` accounts automatically on confirmation if the target account does not yet exist.
        *   When an EMI payment is approved, automatically links to the loan in `loans`, registers the payment via `addEMIPayment` (reducing outstanding balance and logging into amortization history on the EMI page), and posts the expense transaction.
        *   When a subscription payment is approved, logs via `addSubscriptionPayment` and automatically advances the subscription renewal cycle.

---

---

## 6. Background Automation & Cloud Sync

### A. Background Data Backup
*   **Location**: [backgroundFetch.ts](file:///Users/akashsharma/Documents/Gainbase/tasks/backgroundFetch.ts)
*   **Behavior**: Fires periodically (every 24 hours) in the background. Attempts to serialize user transactions/portfolio data to `Gainbase/data.json` under `FileSystem.documentDirectory` for secure local backup.

### B. Supabase Cloud Sync & Authentication
*   **Location**: [syncEngine.ts](file:///Users/akashsharma/Documents/Gainbase/utils/syncEngine.ts) & [cloud-backup.tsx](file:///Users/akashsharma/Documents/Gainbase/app/cloud-backup.tsx)
*   **Authentication Methods**: Supports Native Google Sign-In (`@react-native-google-signin/google-signin`).
*   **Sync Behavior**: 
    1.  Automatically triggers on app launch (once local Zustand persist hydration from AsyncStorage finishes) and manual trigger on the Cloud Sync screen.
    2.  Compares local and remote database rows by unique `id` and `updatedAt` timestamps.
    3.  Upserts new/edited items in batch to Supabase.
    4.  Processes deletions (hard deletes / synchronization) without losing cloud backups during local device resets.
    5.  When local data is cleared or empty on the device, cloud sync automatically adopts the device and pulls all cloud data down cleanly without device mismatch blocks.
    6.  Sanitizes and normalizes all timestamp and date fields to valid ISO-8601 strings (preventing PostgreSQL empty string timestamp syntax errors).
    7.  Features intelligent content-fingerprint deduplication across all 10 tables, preventing double records and automatically purging duplicate cloud copies on resync.
    8.  Maintains strict foreign key integrity by dynamically remapping parent IDs (e.g. accounts, loans, budgets, subscriptions) on child entities, pushing parent tables first, and deleting child records before parents.
    9.  Syncs the `logo` column for accounts (added to local store and remote Supabase db table `accounts`).

### C. Ticker Price Synchronization & Google Sheet Ingestion
*   **Behavior**:
    1. **Google Sheet & Supabase Integration**: Portfolio ticker metadata (Current Value, Yesterday Close, High52, Low52, Company Name, Asset Type, Sector, PE, Market Cap, Historical data) is ingested directly from the user's Google Sheet into Supabase `public.tickers` table.
    2. **Local Store Hydration (`fetchTickers`)**: `usePortfolioStore` fetches all authentic Google Sheet ticker records directly from Supabase on app start and pull-to-refresh, populating the local state without external polling.
    3. **High-Resolution Stock Logo Engine (`getCompanyLogoUrl`)**: Dynamically resolves official company logos across the application (Stock Details Hero Card, Explore search & watchlist, Top Movers, Holdings/Allocations, and Transaction Pickers) matching against clean company domains and ticker symbols.
    4. **Direct Google Sheet Search**: Search across **Explore** and **Add Transaction** operates directly and exclusively against the user's authentic Google Sheet database (`tickers` store), matching symbols and company names without external dictionaries.

## 7. Maintenance Protocol for AI Agents

Whenever you make updates to the Gainbase codebase:
1.  **Locate Changes**: Note the modified folders/files.
2.  **Update Wiki**: If you change any store schema, calculation parameters, pages, or add new features, **immediately** update the corresponding sections of this `PROJECT_WIKI.md`.
3.  **Commit Document**: Keep the wiki updated in the same pull request or tool execution stream as your implementation.

---
*Wiki last updated: September 6, 2026*
