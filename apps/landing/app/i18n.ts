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
      eyebrow: "v0.4.0 · Part of cexagent · MIT open source",
      title: "Your agent now speaks",
      titleAccent: "Hyperliquid.",
      sub: "Ask about liquidation risk, whale flows, funding divergence, market regime — all with zero setup. We pre-seed 60 top HL traders so you can just ask 'are HL whales long BTC?' and get a real answer immediately.",
      cta: "Install in 30 seconds",
      ctaSub: "stdio MCP · Node 20+ · zero user data · zero config",
    },
    features: {
      eyebrow: "Why it exists",
      title: "A terminal built for agents, not humans.",
      items: [
        {
          title: "Zero config, real answers",
          desc: "60 top HL traders are pre-seeded from the live public leaderboard (BobbyBigSize, jefe, Auros, 憨巴小龙…). You never have to supply addresses — just ask 'smart money long or short on BTC' and it works.",
        },
        {
          title: "22 tools, 4 modules",
          desc: "Liquidation risk, whales, market structure, narrative — under one install. Regime classifier, anomaly scanner, historical baselines, funding PnL — not just raw data.",
        },
        {
          title: "Zero backend, zero leak",
          desc: "MCP stdio server runs inside your agent. Queries go straight to HL's public API — nothing through our servers. No accounts, no tokens, no telemetry.",
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
      title: "Just talk. No addresses, no config.",
      items: [
        { q: "Are HL whales long or short BTC right now?", tool: "smart_money_flow" },
        { q: "What's anomalous on HL right now?", tool: "detect_anomalies" },
        { q: "Top 20 traders on HL this week by PnL.", tool: "whale_pnl_leaderboard" },
        { q: "If BTC drops 5% how much gets liquidated?", tool: "simulate_cascade" },
        { q: "Is BTC funding extreme vs its 30-day baseline?", tool: "historical_context" },
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
      eyebrow: "v0.4.0 · cexagent 矩阵 · MIT 开源",
      title: "让你的 agent 真正会用",
      titleAccent: "Hyperliquid。",
      sub: "清算风险、鲸鱼仓位、funding 偏差、市场局面——零配置即用。我们内置了 HL 公开 leaderboard 前 60 位真实顶级交易员的地址,所以你可以直接问「HL 大佬现在多还是空 BTC」,立即有答案。",
      cta: "30 秒装好",
      ctaSub: "stdio MCP · Node 20+ · 零用户数据 · 零配置",
    },
    features: {
      eyebrow: "为什么做它",
      title: "为 agent 而生的终端,不是为人。",
      items: [
        {
          title: "零配置,直接出答案",
          desc: "内置 60 位 HL 公开 leaderboard 顶级交易员(BobbyBigSize / jefe / Auros / 憨巴小龙…)。用户不用提供任何地址——直接问「大户多头还是空头」就行。",
        },
        {
          title: "22 个工具 4 个模块",
          desc: "清算风险、鲸鱼、市场结构、叙事——一次装完。包含 regime 分类器、异常扫描器、历史基线对比、funding PnL 统计,不只是查数据。",
        },
        {
          title: "零后端零泄漏",
          desc: "MCP stdio server 跑在你 agent 的子进程里。请求直接打 HL 公开 API,不经过我们任何服务器。不注册、不收 token、无埋点。",
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
      title: "直接说。不用地址,不用参数。",
      items: [
        { q: "HL 大佬现在多还是空 BTC?", tool: "smart_money_flow" },
        { q: "HL 现在有什么异常?", tool: "detect_anomalies" },
        { q: "本周 HL PnL 前 20 的交易员是谁?", tool: "whale_pnl_leaderboard" },
        { q: "BTC 瞬间跌 5% 会爆掉多少仓?", tool: "simulate_cascade" },
        { q: "BTC 当前 funding 相比过去 30 天算不算极端?", tool: "historical_context" },
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
