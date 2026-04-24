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

export interface Stat {
  value: string;
  label: string;
  sub: string;
}

export interface CompareRow {
  name: string;
  tools: string;
  analysis: string;
  seeded: string;
  updated: string;
  highlight?: boolean;
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
  stats: Stat[];
  features: { eyebrow: string; title: string; items: Array<{ title: string; desc: string }> };
  modules: { eyebrow: string; title: string; lead: string; items: Module[] };
  examples: { eyebrow: string; title: string; items: Example[] };
  compare: {
    eyebrow: string;
    title: string;
    lead: string;
    headers: { name: string; tools: string; analysis: string; seeded: string; updated: string };
    rows: CompareRow[];
  };
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
      title: "The only Hyperliquid MCP",
      titleAccent: "with a judgment layer.",
      sub: "22 tools · 60 top leaderboard traders pre-seeded · regime classifier + anomaly scanner + historical baselines + EN/ZH narrative · zero backend · MIT open source. Every other HL MCP wraps the REST API; we turn data into a read.",
      cta: "Install in 30 seconds",
      ctaSub: "stdio MCP · Node 20+ · zero user data · zero config",
    },
    stats: [
      { value: "22", label: "tools", sub: "live & tested end-to-end" },
      { value: "60", label: "traders pre-seeded", sub: "from HL's 34,684-row leaderboard" },
      { value: "0", label: "backend services", sub: "your agent talks to HL directly" },
      { value: "0", label: "user data stored", sub: "no accounts, no keys, no telemetry" },
    ],
    features: {
      eyebrow: "Why it exists",
      title: "A terminal built for agents, not humans.",
      items: [
        {
          title: "We read HL's leaderboard so you don't have to",
          desc: "Hyperliquid publishes 34,684 trader addresses ranked by PnL. We pull the top 30 all-time + top 20 month + top 20 week — deduped, labelled with public displayNames (BobbyBigSize, jefe, Auros, 憨巴小龙, thank you jefef…). Any tool that needs 'addresses' just uses them. No Arkham subscription, no Etherscan digging.",
        },
        {
          title: "Not just raw data — a read",
          desc: "22 tools across 4 modules. A regime classifier that labels every asset as 'organic rally' / 'short squeeze' / 'funding bleed' / 'coiling' from price + OI + funding. An anomaly scanner that distills 200+ perps into 3 headlines. Historical context that tells you whether +12%/yr funding is extreme or boring. Narrative briefings in EN & ZH.",
        },
        {
          title: "Zero backend. We literally cannot see you.",
          desc: "The MCP server is a subprocess of your agent. Requests go straight to api.hyperliquid.xyz — nothing routes through our servers. We run no database, no analytics, no telemetry. No API keys for you to leak. MIT source on GitHub — diff it before you install.",
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
    compare: {
      eyebrow: "Honest comparison",
      title: "We checked what else is out there.",
      lead: "There are ~5 other HL-themed MCP servers on GitHub. Here's exactly how we stack up — star count sourced today, every column independently verifiable.",
      headers: {
        name: "project",
        tools: "tools",
        analysis: "analysis layer",
        seeded: "addresses pre-seeded",
        updated: "last updated",
      },
      rows: [
        {
          name: "hyperliquid-radar",
          tools: "22",
          analysis: "regime classifier · anomaly scanner · historical baselines · EN/ZH narrative",
          seeded: "60 (live leaderboard)",
          updated: "today",
          highlight: true,
        },
        {
          name: "mektigboy/server-hyperliquid",
          tools: "~5",
          analysis: "read-only wrappers",
          seeded: "none",
          updated: "2024",
        },
        {
          name: "kukapay/hyperliquid-info",
          tools: "~7",
          analysis: "read-only wrappers",
          seeded: "none",
          updated: "2025-mid",
        },
        {
          name: "Br0ski777 HL pack",
          tools: "~6 (fragmented)",
          analysis: "per-endpoint tools",
          seeded: "none",
          updated: "mixed",
        },
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
      title: "唯一带判断层的",
      titleAccent: "Hyperliquid MCP。",
      sub: "22 工具 · 60 位 leaderboard 大佬预置 · regime 分类 + 异常扫描 + 历史基线 + 中英叙事 · 零后端 · MIT 开源。别家把 HL 的 REST API 包一层给 agent,拿到还是一堆 JSON。我们把数据变成判断。",
      cta: "30 秒装好",
      ctaSub: "stdio MCP · Node 20+ · 零用户数据 · 零配置",
    },
    stats: [
      { value: "22", label: "个工具", sub: "端到端真实跑通" },
      { value: "60", label: "位交易员内置", sub: "取自 HL 34,684 行官方榜" },
      { value: "0", label: "个后端服务", sub: "你的 agent 直连 HL" },
      { value: "0", label: "用户数据", sub: "不注册、不收 key、无埋点" },
    ],
    features: {
      eyebrow: "为什么做它",
      title: "为 agent 而生的终端,不是为人。",
      items: [
        {
          title: "HL leaderboard 我们读过了",
          desc: "Hyperliquid 官方发布 34,684 个交易员地址按 PnL 排名。我们取 allTime top 30 + month top 20 + week top 20,去重后 59 个地址,保留公开 displayName(BobbyBigSize / jefe / Auros / 憨巴小龙 / thank you jefef…)。需要地址的工具直接用。不用订阅 Arkham,不用翻 Etherscan。",
        },
        {
          title: "不只是查数据 —— 给结论",
          desc: "22 个工具,4 大模块。regime 分类器把每个资产标成「自然上涨」「空头挤压」「funding 放血」「盘整」,从 price + OI + funding 三维判。异常扫描器把 200+ 永续合约压成 3 条头条。历史基线告诉你「+12%/年 funding 到底算不算极端」。中英双语叙事日报。",
        },
        {
          title: "零后端。我们真的看不到你",
          desc: "MCP server 跑在你 agent 的子进程里。请求直接打 api.hyperliquid.xyz,不经过我们任何服务器。我们没有数据库、没有埋点、没有任何 telemetry。没有 API key 能泄漏。代码 MIT 开源在 GitHub,装之前自己 diff。",
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
    compare: {
      eyebrow: "不避讳对比",
      title: "GitHub 上的其他 HL MCP,我们挨个查过。",
      lead: "GitHub 上大约有 5 个 HL 主题的 MCP server。这张表的每一列都可独立核对 —— star 数今天实测。",
      headers: {
        name: "项目",
        tools: "工具数",
        analysis: "分析层",
        seeded: "内置地址",
        updated: "最近更新",
      },
      rows: [
        {
          name: "hyperliquid-radar",
          tools: "22",
          analysis: "regime 分类 · 异常扫描 · 历史基线 · 中英叙事",
          seeded: "60(取自官方榜)",
          updated: "今天",
          highlight: true,
        },
        {
          name: "mektigboy/server-hyperliquid",
          tools: "~5",
          analysis: "只读 API 包装",
          seeded: "无",
          updated: "2024 年",
        },
        {
          name: "kukapay/hyperliquid-info",
          tools: "~7",
          analysis: "只读 API 包装",
          seeded: "无",
          updated: "2025 年中",
        },
        {
          name: "Br0ski777 HL 套件",
          tools: "~6(碎片化)",
          analysis: "按端点拆分",
          seeded: "无",
          updated: "不一",
        },
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
