# The Chronicle

A distraction-free, daily digital newspaper focused on Indian finance, markets, corporate actions, and economic policy. 

The Chronicle automatically crawls, filters, ranks, and archives news from India's most trusted business outlets (such as *The Economic Times*, *Livemint*, *Moneycontrol*, *Times of India*, and *The Hindu BusinessLine*). It presents a curated, high-quality, ad-free edition of the day's critical market movements.

---

## 🌟 Core Features

- **Daily Curated Edition**: A return to the traditional newspaper format — curated front page, clear sections, no ads, and no clickbait.
- **On-Site Full Article View**: Read full articles directly on the website via a server-side scraping engine that removes clutter, ads, and trackings. Includes a "View Source" link to visit the original publisher.
- **Scroll Progress & Fade-In Animations**: Interactive reading indicators and smooth entrance micro-interactions for a premium reading experience.
- **Automated Caches & Local Archiving**: Assembles new editions every 12 hours. Archive snapshots are saved in a lossless JSON database format, accessible through a calendar picker.
- **Market Ticker**: Continuous marquee showing real-time market indices performance (NIFTY 50, SENSEX, BANK NIFTY, USD/INR, Brent Crude, Gold, etc.).

---

## 🛠️ Technology Stack

- **Core Framework**: Next.js 16.2 (App Router, React 19)
- **Styling**: Tailwind CSS v4 with custom serif display, body, and sans-serif labels
- **Icons**: Lucide React
- **Hosting / Storage**: File-backed local JSON databases (no external SQL/NoSQL server needed)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/yusufdhansay/TheChronicle.git
   cd TheChronicle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the daily newspaper.

### Common Commands

- `npm run dev` - Starts the development server.
- `npm run build` - Creates an optimized production build.
- `npm run start` - Runs the production build server locally.
- `npm run lint` - Runs ESLint to check coding style and typescript validations.

---

## 📂 Project Structure

```
/
├── data/                       # Local file system storage (JSON databases)
│   ├── archive/                # Historical IST day snapshots (YYYY-MM-DD.json)
│   └── current.json            # Cached active edition data
├── src/
│   ├── app/                    # Next.js App Router pages and styling
│   │   ├── api/                # API Endpoints (e.g. force refresh trigger)
│   │   ├── article/            # Dynamic article view page (/article/[id])
│   │   ├── edition/            # Archived edition calendar pages
│   │   ├── section/            # Dynamic category focus views
│   │   ├── globals.css         # Theme declarations and Tailwind v4 config
│   │   └── layout.tsx          # Root DOM layout, fonts, and HTML wrappers
│   ├── components/             # Reusable UI components (Masthead, Ticker, Story, etc.)
│   └── lib/                    # Core engines (scraper, rss parser, classifier, store)
```

For a deep-dive into the codebase architecture, algorithms, and request lifecycle, please refer to [brain.md](file:///Users/yusufamin/TheChronicle/brain.md).
