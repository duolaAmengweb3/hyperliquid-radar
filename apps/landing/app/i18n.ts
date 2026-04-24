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
    count: 7,
    tools: [
      { name: "get_top_liquidation_risks", ready: true },
      { name: "liquidation_heatmap", ready: true },
      { name: "simulate_cascade", ready: true },
      { name: "my_position_risk", ready: true },
      { name: "simulate_my_liq_price", ready: true },
      { name: "get_recent_liquidations", ready: true },
      { name: "historical_cascade_replay", ready: false },
    ],
  },
  {
    letter: "B",
    name: "",
    count: 6,
    tools: [
      { name: "whale_pnl_leaderboard", ready: true },
      { name: "get_whale_flows", ready: true },
      { name: "address_position_history", ready: true },
      { name: "smart_money_flow", ready: true },
      { name: "get_funding_pnl", ready: true },
      { name: "new_whale_entries", ready: false },
    ],
  },
  {
    letter: "C",
    name: "",
    count: 9,
    tools: [
      { name: "get_funding_divergence", ready: true },
      { name: "asset_snapshot", ready: true },
      { name: "get_all_asset_ctxs", ready: true },
      { name: "hlp_metrics", ready: true },
      { name: "orderbook_imbalance", ready: true },
      { name: "compare_perps", ready: true },
      { name: "historical_context", ready: true },
      { name: "detect_anomalies", ready: true },
      { name: "insurance_fund_status", ready: false },
    ],
  },
  {
    letter: "D",
    name: "",
    count: 3,
    tools: [
      { name: "explain_market_structure", ready: true },
      { name: "asset_snapshot_narrative", ready: true },
      { name: "daily_briefing", ready: true },
    ],
  },
];

const moduleNamesEn = ["Liquidation Risk", "Whales & Flow", "Market Structure", "Narrative"];

const moduleNamesZh = ["清算风险", "鲸鱼与仓位流", "市场结构", "叙事总结"];

export const strings: Record<Lang, Strings> = {
  en: {
    nav: { tools: "Tools", install: "Install" },
    hero: {
      eyebrow: "Part of cexagent · MIT open source",
      title: "Your agent now speaks",
      titleAccent: "Hyperliquid.",
      sub: "Ask Claude, Cursor, Eliza anything about HL — liquidation risks, whale flows, funding divergence, market narrative. No dashboards. No accounts. No API keys. Just talk.",
      cta: "Install in 30 seconds",
      ctaSub: "stdio MCP · Node 20+ · zero user data",
    },
    features: {
      eyebrow: "Why it exists",
      title: "A terminal built for agents, not humans.",
      items: [
        {
          title: "22 tools, 4 modules",
          desc: "Liquidation risk, whales, market structure, narrative — all under one install. No tab-switching to Hyperdash.",
        },
        {
          title: "Agent-native protocol",
          desc: "MCP stdio server. Works in Claude Desktop, Cursor, Eliza out of the box. Paste a config, restart, talk.",
        },
        {
          title: "Zero data collected",
          desc: "No accounts. No login. No API keys. Queries go straight from your agent to Hyperliquid's public API — nothing through our servers.",
        },
      ],
    },
    modules: {
      eyebrow: "Tool matrix",
      title: "Four modules. One install. All open source.",
      lead: "Each module covers a different shape of HL intelligence. Ship progresses tool by tool — check the dots.",
      items: commonModules.map((m, i) => ({ ...m, name: moduleNamesEn[i] })),
    },
    examples: {
      eyebrow: "Example prompts",
      title: "Say what you mean. The tool call is the agent's problem.",
      items: [
        { q: "What's anomalous on HL right now?", tool: "detect_anomalies" },
        { q: "Top 20 traders on HL this week by PnL.", tool: "whale_pnl_leaderboard" },
        {
          q: "Is BTC funding extreme vs its 30-day baseline?",
          tool: "historical_context",
        },
        { q: "How much funding did 0xabc… collect this week?", tool: "get_funding_pnl" },
        { q: "Give me a trader's read on HL market structure.", tool: "explain_market_structure" },
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
      title: "Nothing to collect. Nothing to leak.",
      body: "The MCP server runs as a subprocess of your agent. Every tool call goes directly from your machine to Hyperliquid's public API. We run no backend. We see no requests. We have no user data to sell, leak, or subpoena. Source-available on GitHub, MIT license.",
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
      sub: "让 Claude、Cursor、Eliza 直接回答 HL 的一切——清算风险、鲸鱼流、funding 偏差、市场叙事。不用开网页、不用注册、不用 API key,一句话就行。",
      cta: "30 秒装好",
      ctaSub: "stdio MCP · Node 20+ · 零用户数据",
    },
    features: {
      eyebrow: "为什么做它",
      title: "为 agent 而生的终端,不是为人。",
      items: [
        {
          title: "22 个工具 4 个模块",
          desc: "清算风险、鲸鱼、市场结构、叙事——一次装完。再也不用开 Hyperdash 网页。",
        },
        {
          title: "Agent-native 协议",
          desc: "MCP stdio 服务。Claude Desktop / Cursor / Eliza 开箱即用。粘一行 config、重启、开始对话。",
        },
        {
          title: "零数据收集",
          desc: "不注册、不登录、不收 API key。请求直接从你 agent 所在机器打 HL 公开接口,不过我们任何服务器。",
        },
      ],
    },
    modules: {
      eyebrow: "工具矩阵",
      title: "四个模块。一次安装。全部开源。",
      lead: "每个模块覆盖 HL 情报的一个维度。逐步发布——看亮点小圆点。",
      items: commonModules.map((m, i) => ({ ...m, name: moduleNamesZh[i] })),
    },
    examples: {
      eyebrow: "对话示例",
      title: "想问什么就问什么。调哪个工具是 agent 的事。",
      items: [
        { q: "HL 现在有什么异常?", tool: "detect_anomalies" },
        { q: "本周 HL PnL 前 20 的交易员是谁?", tool: "whale_pnl_leaderboard" },
        { q: "BTC 当前 funding 相比过去 30 天算不算极端?", tool: "historical_context" },
        { q: "0xabc... 这周收到多少 funding?", tool: "get_funding_pnl" },
        { q: "用交易员的视角讲讲现在的 HL 市场。", tool: "explain_market_structure" },
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
      title: "无数据可收集。无数据可泄露。",
      body: "MCP server 作为你 agent 的子进程运行。每次工具调用都从你的机器直接打 Hyperliquid 公开 API。我们没有后端、看不到任何请求、没有任何用户数据可以贩卖、泄露或被传唤。代码 MIT 开源。",
    },
    footer: {
      matrix: "cexagent 矩阵成员 —— 一组 agent-native 的加密工具。",
      license: "MIT License.",
    },
  },
};
