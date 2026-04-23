export type Lang = "en" | "zh";

export interface Module {
  letter: string;
  name: string;
  count: number;
  tools: Array<{ name: string; ready: boolean }>;
}

export interface Example {
  q: string;
  tool: string;
}

export interface Strings {
  nav: { tools: string; install: string };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    sub: string;
    cta: string;
    ctaSub: string;
  };
  features: { eyebrow: string; title: string; items: Array<{ title: string; desc: string }> };
  modules: { eyebrow: string; title: string; lead: string; items: Module[] };
  examples: { eyebrow: string; title: string; items: Example[] };
  install: {
    eyebrow: string;
    title: string;
    lead: string;
    claudeDesktop: string;
    cursor: string;
    path: string;
    copy: string;
    copied: string;
  };
  privacy: { eyebrow: string; title: string; body: string };
  footer: { matrix: string; license: string };
}

const commonModules: Module[] = [
  {
    letter: "A",
    name: "",
    count: 5,
    tools: [
      { name: "get_top_liquidation_risks", ready: true },
      { name: "liquidation_heatmap", ready: false },
      { name: "simulate_cascade", ready: false },
      { name: "my_position_risk", ready: false },
      { name: "historical_cascade_replay", ready: false },
    ],
  },
  {
    letter: "B",
    name: "",
    count: 5,
    tools: [
      { name: "get_whale_flows", ready: false },
      { name: "new_whale_entries", ready: false },
      { name: "whale_pnl_leaderboard", ready: false },
      { name: "address_position_history", ready: false },
      { name: "smart_money_flow", ready: false },
    ],
  },
  {
    letter: "C",
    name: "",
    count: 6,
    tools: [
      { name: "get_funding_divergence", ready: true },
      { name: "asset_snapshot", ready: true },
      { name: "get_all_asset_ctxs", ready: true },
      { name: "hlp_metrics", ready: true },
      { name: "orderbook_imbalance", ready: true },
      { name: "insurance_fund_status", ready: false },
    ],
  },
  {
    letter: "D",
    name: "",
    count: 3,
    tools: [
      { name: "explain_market_structure", ready: false },
      { name: "asset_snapshot_narrative", ready: false },
      { name: "daily_briefing", ready: false },
    ],
  },
  {
    letter: "E",
    name: "",
    count: 7,
    tools: [
      { name: "subscribe_wallet", ready: false },
      { name: "subscribe_liq_threshold", ready: false },
      { name: "subscribe_whale_entry", ready: false },
      { name: "subscribe_cascade_risk", ready: false },
      { name: "subscribe_funding_extreme", ready: false },
      { name: "cancel_subscription", ready: false },
      { name: "extend_subscription", ready: false },
    ],
  },
];

const moduleNamesEn = [
  "Liquidation Risk",
  "Whales & Flow",
  "Market Structure",
  "Narrative",
  "Alerts & Subscriptions",
];

const moduleNamesZh = ["清算风险", "鲸鱼与仓位流", "市场结构", "叙事总结", "订阅告警"];

export const strings: Record<Lang, Strings> = {
  en: {
    nav: { tools: "Tools", install: "Install" },
    hero: {
      eyebrow: "Part of cexagent · MIT open source",
      title: "Your agent now speaks",
      titleAccent: "Hyperliquid.",
      sub: "Ask Claude, Cursor, Eliza anything about HL — liquidation risks, whale flows, funding divergence, market narrative, wallet alerts. No dashboards. No accounts. No API keys. Just talk.",
      cta: "Install in 30 seconds",
      ctaSub: "stdio MCP · Node 20+ · zero user data",
    },
    features: {
      eyebrow: "Why it exists",
      title: "A terminal built for agents, not humans.",
      items: [
        {
          title: "23 tools, 5 modules",
          desc: "Liquidation risk, whales, market structure, narrative, alerts — all under one install. No tab-switching to Hyperdash.",
        },
        {
          title: "Agent-native protocol",
          desc: "MCP stdio server. Works in Claude Desktop, Cursor, Eliza out of the box. Paste a config, restart, talk.",
        },
        {
          title: "Zero user identity",
          desc: "No accounts, no login, no tokens. Subscriptions store only push destination with 30-day TTL. No PII.",
        },
      ],
    },
    modules: {
      eyebrow: "Tool matrix",
      title: "Five modules. One install. All open source.",
      lead: "Each module covers a different shape of HL intelligence. Ship progresses module by module — check the dots.",
      items: commonModules.map((m, i) => ({ ...m, name: moduleNamesEn[i] })),
    },
    examples: {
      eyebrow: "Example prompts",
      title: "Say what you mean. The tool call is the agent's problem.",
      items: [
        {
          q: "Who are HL's top 10 most-at-risk positions right now?",
          tool: "get_top_liquidation_risks",
        },
        {
          q: "What's the BTC funding gap between HL, Binance, Bybit and OKX?",
          tool: "get_funding_divergence",
        },
        { q: "Give me a snapshot of HYPE — funding, OI, 24h move.", tool: "asset_snapshot" },
        {
          q: "List the 20 perps with the most extreme funding right now.",
          tool: "get_all_asset_ctxs",
        },
        { q: "How is the HLP vault doing this week?", tool: "hlp_metrics" },
      ],
    },
    install: {
      eyebrow: "Install",
      title: "Paste one line. Restart. Done.",
      lead: "The stdio MCP server runs locally in your agent's process. Your queries hit Hyperliquid's public API directly — nothing flows through our servers.",
      claudeDesktop: "Claude Desktop",
      cursor: "Cursor",
      path: "~/Library/Application Support/Claude/claude_desktop_config.json",
      copy: "Copy",
      copied: "Copied",
    },
    privacy: {
      eyebrow: "Privacy",
      title: "We don't know who you are. By design.",
      body: "No accounts. No login. No API keys. Queries hit Hyperliquid's public API directly from your agent's host. When the alert module ships, subscription records will store only the push destination (Telegram chat_id or webhook URL) plus criteria — no user identity column. 30-day auto-expiry. Source-available on GitHub.",
    },
    footer: {
      matrix: "Part of cexagent — a matrix of agent-native crypto tools.",
      license: "MIT License.",
    },
  },
  zh: {
    nav: { tools: "工具", install: "安装" },
    hero: {
      eyebrow: "cexagent 矩阵 · MIT 开源",
      title: "让你的 agent 真正会用",
      titleAccent: "Hyperliquid。",
      sub: "让 Claude、Cursor、Eliza 直接回答 HL 的一切——清算风险、鲸鱼流、funding 偏差、市场叙事、钱包告警。不用开网页、不用注册、不用 API key,一句话就行。",
      cta: "30 秒装好",
      ctaSub: "stdio MCP · Node 20+ · 零用户数据",
    },
    features: {
      eyebrow: "为什么做它",
      title: "为 agent 而生的终端,不是为人。",
      items: [
        {
          title: "23 个工具 5 个模块",
          desc: "清算风险、鲸鱼、市场结构、叙事、告警——一次装完。再也不用开 Hyperdash 网页。",
        },
        {
          title: "Agent-native 协议",
          desc: "MCP stdio 服务。Claude Desktop / Cursor / Eliza 开箱即用。粘一行 config、重启、开始对话。",
        },
        {
          title: "零用户身份",
          desc: "不注册、不登录、不收 token。订阅只存推送目标和 30 天 TTL,不关联任何 PII。",
        },
      ],
    },
    modules: {
      eyebrow: "工具矩阵",
      title: "五个模块。一次安装。全部开源。",
      lead: "每个模块覆盖 HL 情报的一个维度。按模块逐步发布——看亮点小圆点。",
      items: commonModules.map((m, i) => ({ ...m, name: moduleNamesZh[i] })),
    },
    examples: {
      eyebrow: "对话示例",
      title: "想问什么就问什么。调哪个工具是 agent 的事。",
      items: [
        { q: "HL 现在最危险的 10 个仓位是谁?", tool: "get_top_liquidation_risks" },
        {
          q: "BTC 在 HL 和 Binance、Bybit、OKX 之间的 funding 差多少?",
          tool: "get_funding_divergence",
        },
        { q: "给我看一下 HYPE 的情况 —— funding、OI、24h 涨跌。", tool: "asset_snapshot" },
        { q: "列出现在 funding 最极端的 20 个 perp。", tool: "get_all_asset_ctxs" },
        { q: "HLP 这周表现怎么样?", tool: "hlp_metrics" },
      ],
    },
    install: {
      eyebrow: "安装",
      title: "粘一行。重启。完事。",
      lead: "stdio MCP server 跑在你 agent 的子进程里。请求直接打 Hyperliquid 公开 API,不经过我们任何服务器。",
      claudeDesktop: "Claude Desktop",
      cursor: "Cursor",
      path: "~/Library/Application Support/Claude/claude_desktop_config.json",
      copy: "复制",
      copied: "已复制",
    },
    privacy: {
      eyebrow: "隐私",
      title: "我们不知道你是谁。设计如此。",
      body: "不注册、不登录、不收 API key。请求直接从你 agent 所在机器打 Hyperliquid 公开接口。告警模块上线后,订阅记录只存推送目标(Telegram chat_id 或 webhook URL)和触发条件——没有用户身份这一列。30 天自动过期。代码 MIT,GitHub 可查。",
    },
    footer: {
      matrix: "cexagent 矩阵成员 —— 一组 agent-native 的加密工具。",
      license: "MIT License.",
    },
  },
};
