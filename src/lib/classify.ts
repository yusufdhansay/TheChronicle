import type { TopicSlug } from "./types";

/**
 * Keyword-driven topic classification and quality scoring.
 * Feeds already carry a topic hint; these rules re-route stories whose
 * content clearly belongs elsewhere (e.g. an M&A story on a markets feed)
 * and score how strongly a story belongs to the finance universe.
 */

interface Rule {
  topic: TopicSlug;
  strong: RegExp; // decisive signals
  weak: RegExp; // supporting signals
}

const RULES: Rule[] = [
  {
    topic: "ma",
    strong:
      /\b(merger|acquisit\w+|acquires?|acquired|takeover|buyout|to buy \w+ stake|buys? \d+(\.\d+)?% stake|amalgamation|demerger|open offer|delist\w*)\b/i,
    weak: /\b(stake sale|controlling stake|all-cash deal|swap ratio|CCI approv\w+|antitrust)\b/i,
  },
  {
    topic: "ipos-listings",
    strong:
      /\b(IPO|initial public offer\w*|listing (day|gains?|date)|lists? (at|on) (a )?(premium|discount|NSE|BSE)|grey market premium|GMP|anchor (book|investor)|price band|DRHP|RHP|FPO|OFS|SME (IPO|listing)|public issue|subscri\w+ \d+(\.\d+)?x)\b/i,
    weak: /\b(retail portion|QIB|NII|allotment|debut\w*|primary market)\b/i,
  },
  {
    topic: "pe-vc",
    strong:
      /\b(private equity|venture capital|\bVC\b|seed (round|funding)|series [A-H]\b|funding round|raises? \$?\d+(\.\d+)? ?(million|billion|mn|bn|crore|cr) (in|from|led)|unicorn|startup fund\w*|angel invest\w*|growth capital|PE (firm|fund|player)|exits? its stake|secondary sale)\b/i,
    weak: /\b(startup|valuation of|term sheet|cap table|fund of funds|LP\b|general partner)\b/i,
  },
  {
    topic: "investment-banking",
    strong:
      /\b(investment bank\w*|i-bank\w*|book[- ]?runn\w+|underwrit\w+|lead manager|merchant bank\w*|QIP\b|qualified institutional placement|block (deal|trade)|bond (sale|issuance|offering)|debt (issue|sale|raise)|rights issue|syndicated loan|ECM\b|DCM\b|advisory fees?|league table)\b/i,
    weak: /\b(Goldman Sachs|Morgan Stanley|JPMorgan|Jefferies|Kotak Investment|ICICI Securities|Axis Capital|placement)\b/i,
  },
  {
    topic: "finance-banking",
    strong:
      /\b(bank\w*|NBFC|RBI (penal\w+|licen\w+|circular|norms|guidelines)|deposit\w*|lend\w+|loan\w*|credit growth|NPA|bad loans?|microfinance|insur\w+|IRDAI|mutual fund|AMC\b|SIP\b|fintech|UPI|payments? bank|small finance|housing finance|gold loan|credit card)\b/i,
    weak: /\b(CASA|net interest margin|NIM\b|provisioning|capital adequacy|Basel|branch\w*)\b/i,
  },
  {
    topic: "economy-policy",
    strong:
      /\b(GDP|inflation|CPI|WPI|monetary policy|repo rate|rate (cut|hike)|fiscal (deficit|policy)|budget\w*|GST|tax\w*|RBI\b|central bank|IMF|World Bank|current account|trade deficit|IIP\b|PMI\b|employment|subsid\w+|disinvestment|PLI scheme|policy|ministry|cabinet|parliament|regulat\w+|SEBI\b)\b/i,
    weak: /\b(growth forecast|economic survey|stimulus|reform\w*|crore outlay)\b/i,
  },
  {
    topic: "geopolitics",
    strong:
      /\b(sanction\w*|tariff\w*|trade (war|deal|talks|pact|agreement)|geopolit\w+|NATO|OPEC\+?|United Nations|\bUN\b|White House|Kremlin|Beijing|cease-?fire|military|border|diplomat\w+|embassy|Trump admin\w*|Xi Jinping|Putin|Israel|Iran|Russia|Ukraine|China|Taiwan|Red Sea|strait)\b/i,
    weak: /\b(bilateral|summit|alliance|export controls?|visa|supply chain shift)\b/i,
  },
  {
    topic: "markets",
    strong:
      /\b(Sensex|Nifty|BSE|NSE|stock market|equit\w+|share price|shares? (surge|jump|fall|slip|rally|crash|gain)|rupee|bond yield\w*|F&O|derivativ\w+|futures|FII|DII|crude oil|gold price|silver price|bullion|market (cap|rally|crash|close|open)|intraday|Dalal Street|Wall Street|Nasdaq|Dow Jones|S&P 500)\b/i,
    weak: /\b(bull\w*|bear\w*|correction|all-time high|52-week|volatil\w+|breadth|midcap|smallcap)\b/i,
  },
];

/** Stories matching these are noise regardless of feed. */
const NOISE = [
  /\b(horoscope|astrolog\w+|numerolog\w+)\b/i,
  /\b(bollywood|celebrit\w+|cricket\w*|IPL match|box office|film|movie|actor|actress|T20|world cup)\b/i,
  /\b(recipe|lifestyle|fashion|travel diar\w+|viral video|watch:|WATCH\b)\b/i,
  /\bstocks? to (buy|watch|sell) today\b/i,
  /\b(multibagger|penny stock)\b/i,
  /\btop \d+ (stocks|shares|picks)\b/i,
  // "top 5 midcap stocks", "top 10 mutual funds…" listicles (word between number and noun)
  /\btop \d+ [\w &-]{0,24}\b(stocks|shares|funds|mutual funds|picks)\b/i,
  /\b(intraday picks|trading calls|buy or sell:)\b/i,
  /\bshould you (buy|invest|subscribe)\b/i,
  // Advisory / evergreen personal-finance listicles (not news)
  /\bbest [\w &-]{0,40}\b(fund|funds|stocks?|scheme|schemes|sip) to (invest|buy)\b/i,
  /\bbest [\w &-]{0,30}(mutual funds?|funds?) (to invest|for)\b/i,
  /\b(mf tracker|know your fund manager|fund manager talk)\b/i,
  /\bnfo (alert|update|insight|review)\b/i,
  /\bare you \d+ (or (older|younger)|years? old)\b/i,
  /\bdeserves a place in your\b/i,
  /\b(bank|share market|stock market) holiday (today|tomorrow|this week)\b/i,
  /\bare (banks|markets|stock markets?) (open|closed)\b/i,
  /\b(daily quiz|crossword|wordle|sudoku)\b/i,
  /\bhow to (download|check|apply|link aadhaar)\b/i,
  /\b(gold rate today|silver rate today|petrol price today|diesel price)\b/i,
  /\bdream ?11\b/i,
  /\bsalary|appraisal season\b/i,
  /\bbb \d+|bigg boss\b/i,
  // Motivational/filler features that masquerade as finance content
  /\b(quote|word|thought|photo|pic|chart) of the (day|week)\b/i,
  /\bpsychology\b/i,
  /\bmotivation\w*\b/i,
  /\blife lessons?\b/i,
  /\bsuccess (story|stories|mantra|secrets?)\b/i,
  /\bwords? of wisdom\b/i,
  /\b(inspiring|inspirational)\b/i,
  /\boptical illusion\b/i,
  /\bbrain teaser\b/i,
  /\bpersonality (test|traits?)\b/i,
  /\b(puzzle|riddle)s?\b/i,
  /\bnet worth of\b/i,
  /\b(bank|school) holiday list\b/i,
  /\btop \d+ (richest|most|best|worst)\b/i,
  /\bzodiac\b/i,
  /\bthis day in history\b/i,
  /\bdid you know\b/i,
];

/** Signals of substantive, institutional-grade reporting. */
const QUALITY = [
  /\b(crore|billion|million|bps|basis points|\d+(\.\d+)?%)\b/i,
  /\b(RBI|SEBI|IRDAI|government|ministry|regulator|court|tribunal|NCLT)\b/i,
  /\b(quarterly|Q[1-4]|results|earnings|profit|revenue|guidance)\b/i,
  /\b(deal|agreement|approval|filing|report|data|survey)\b/i,
];

export function isNoise(text: string): boolean {
  return NOISE.some((re) => re.test(text));
}

export function classify(
  text: string,
  hint?: TopicSlug,
): { topic: TopicSlug; score: number } | null {
  if (isNoise(text)) return null;

  let best: { topic: TopicSlug; score: number } | null = null;
  for (const rule of RULES) {
    let s = 0;
    if (rule.strong.test(text)) s += 3;
    if (rule.weak.test(text)) s += 1;
    if (hint === rule.topic) s += 2;
    if (s > (best?.score ?? 0)) best = { topic: rule.topic, score: s };
  }

  // No topical signal at all → not part of the finance universe.
  if (!best || best.score < 2) return null;

  let quality = 0;
  for (const re of QUALITY) if (re.test(text)) quality += 1;

  return { topic: best.topic, score: best.score + quality };
}
