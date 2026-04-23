# hyperliquid-radar 产品需求文档(PRD)

**版本**:v1.1(一次性定稿版)
**日期**:2026-04-24
**所有者**:cexagent
**产品级别**:矩阵旗舰 · Tier S · L4 · 4-5 周交付
**上位文档**:`../docs/products.md`(cexagent 产品矩阵全景)

---

## 0. TL;DR

| 项 | 说明 |
|---|---|
| 一句话 | Hyperliquid 上所有事的 agent 查询入口 —— 用户让 Claude / Cursor / Eliza 说一句话,直接拿到 HL 清算风险、鲸鱼流、funding 偏差、市场叙事、订阅告警 |
| 核心交付物 | stdio MCP(用户本地 `npx`)+ 告警 API / 守护进程 + 3 通道(TG/Discord/Webhook)+ Vercel 托管的落地页 + 文档站 |
| 能力规模 | 23 个工具,5 模块(清算风险 / 鲸鱼 / 市场结构 / 叙事总结 / 订阅告警) |
| 数据源 | 全免费(HL 公共 API + Binance/Bybit/OKX 公开 funding + CoinGecko 历史价) |
| 基础设施 | 前端 Vercel 免费 + 后端 1 核 1GB VPS 即可(告警 daemon 自备)+ Cloudflare DNS + SQLite + Sentry + UptimeRobot + 4 家 registry 上架 |
| 差异化 | 唯一做"整合 + 叙事 + 告警"三合一的 HL 产品;**全链路开源**(MCP / 告警 / bot / 落地页 / 文档 / 部署代码全部 MIT) |
| 用户隐私 | **零用户身份存储**。订阅记录用匿名 subscription_id + 30 天 TTL,不关联用户 |
| 开源哲学 | 除了用户订阅数据和环境 secret,其他一切上 GitHub。任何人可 fork 并自托管完整产品 |
| 目标指标 | 发布 6 周累计 Smithery useCount 2000+ / GitHub star 200+ / 告警订阅 300+ |

---

## 1. 产品定义

### 1.1 定位

**矩阵唯一「日常打开型」产品,承担用户留存地基角色。**

其他 Tier S 产品(funding-arb-scanner / token-xray / pre-tx safety hook)都是场景触发型 —— 用户想套利 / 查币 / 下单时才调用。hyperliquid-radar 是每天会被 HL 用户打开多次的入口。

### 1.2 对用户的价值

| 用户类型 | 价值 |
|---|---|
| HL 主力交易者 | 不用开 Hyperdash,agent 一句话拿清算风险 / 鲸鱼动向 / funding 偏差 |
| 跟单信号党 | 公开 KOL 地址订阅 + top PnL 玩家仓位监控 |
| 套利党 | HL vs Binance/Bybit/OKX funding 差 + 实时机会 |
| 内容作者 | 叙事化模块自动生成推文素材 |
| HYPE 持有者 | HLP 表现 + 保险基金 + 平台健康一键查询 |

### 1.3 对 cexagent 的价值

- **留存地基**(唯一日常打开型)
- **基础设施复用**(告警层可复用到 new-token-radar、smart-money-radar;鲸鱼追踪逻辑可复用到 smart-money-radar)
- **内容引爆点**(大爆仓 / 鲸鱼大动作自带传播,每次 HL 事件都是矩阵流量入口)
- **护城河**(23 工具互锁 + 叙事 prompt 库 + 告警规则库,后来者无法一夜复制)

---

## 2. 交付物清单(生产级,一次性到位)

### 2.0 开源原则(第一公民)

**全链路 MIT 开源**。除了以下两项,其他所有代码 / 配置 / 基础设施描述都 push 到 GitHub:
- **不开源**:用户订阅数据(SQLite 文件)、环境 secret(`.env`)、我方服务器私钥
- **全开源**:MCP server 代码、cascade 算法、告警服务、TG bot、Discord bot、落地页源码、文档站源码、部署脚本、systemd unit、Docker Compose、CI/CD workflow

**含义**:
- 我方运营的 `api.hyperliquid-radar.com` 是"官方实例",但任何人可以 fork 后自建 `api.xxx.com/mcp` 跑完整产品
- 社区可以 PR 贡献新工具 / 新数据源 / 新通道
- 我们的护城河**不**依赖源码封闭,而是:品牌 + 第一个发 + 矩阵互锁 + 运营节奏

### 2.1 代码资产(单 mono-repo)

**主仓库**:`github.com/cexagent/hyperliquid-radar`(MIT)

```
hyperliquid-radar/
├── packages/
│   ├── core/              # 共享业务逻辑(HL / CEX 数据客户端 / cascade 算法 / 叙事 prompt)
│   ├── mcp-server/        # @cexagent/hyperliquid-radar npm 包(stdio 模式,用户 npx 本地跑)
│   ├── alert-daemon/      # 告警服务(常驻进程)
│   ├── tg-bot/            # Telegram bot
│   └── discord-bot/       # Discord bot
├── apps/
│   ├── landing/           # hyperliquid-radar.com 源码(Next.js,部署 Vercel)
│   └── docs/              # docs.hyperliquid-radar.com(Docusaurus,部署 Vercel)
├── deploy/
│   ├── docker-compose.yml # 后端一键起(alert-daemon + bots)
│   ├── Dockerfile.*       # 各后端服务的镜像定义
│   ├── caddy/             # Caddyfile(仅反代 api.hyperliquid-radar.com)
│   └── systemd/           # systemd units
├── .github/workflows/     # CI/CD(test / lint / publish / deploy)
├── LICENSE                # MIT
└── README.md              # 安装 + 自托管指南
```

**对外产物**(CI 自动发布):
- npm:`@cexagent/hyperliquid-radar`(mcp-server 包,`npx` 即用)
- Docker 镜像:`ghcr.io/cexagent/{alert-daemon,tg-bot,discord-bot}:latest`(用户自托管后端用;mcp-server 只发 npm 不发 Docker)
- Vercel 部署:`apps/landing` 和 `apps/docs` 通过 Vercel GitHub 集成自动部署
- GitHub Release:每版本带 changelog + SBOM

### 2.2 域名矩阵

| 域名 | 作用 | 部署 | TLS |
|---|---|---|---|
| `hyperliquid-radar.com` | 品牌官网 / 落地页(Next.js) | **Vercel** | Vercel 自动 |
| `www.hyperliquid-radar.com` | 301 到 apex | Vercel | — |
| `api.hyperliquid-radar.com` | 告警 API + TG/Discord webhook | **自备 VPS(Caddy)** | Caddy LE |
| `docs.hyperliquid-radar.com` | Docusaurus 文档站 | **Vercel** | Vercel 自动 |
| `status.hyperliquid-radar.com` | 状态页(UptimeRobot 嵌入,可选;v1 可砍) | Cloudflare | LE |
| `radar.cexagent.com` | 302 → `hyperliquid-radar.com`(矩阵互链) | Vercel / Cloudflare | — |

**域名成本**:`hyperliquid-radar.com` 一次性 ~$12/年,其他都是子域(免费)
**DNS 托管**:apex + www + docs 指向 Vercel;api 指向自备 VPS;其他可以都放 Cloudflare 统一管

### 2.3 API / 服务端点

| 端点 | 作用 | 协议 |
|---|---|---|
| `api.hyperliquid-radar.com/v1/alerts/subscribe` | 订阅接口,MCP E 模块工具调用这个 | HTTP POST |
| `api.hyperliquid-radar.com/v1/alerts/cancel` | 取消订阅 | HTTP POST |
| `api.hyperliquid-radar.com/v1/alerts/extend` | 延长订阅 30 天 | HTTP POST |
| `api.hyperliquid-radar.com/v1/tg/webhook` | TG bot webhook 接收(处理 /myid 等命令) | HTTP POST |
| `api.hyperliquid-radar.com/v1/discord/webhook` | Discord bot interactions webhook | HTTP POST |
| `api.hyperliquid-radar.com/health` | 健康检查(UptimeRobot 探针打这里) | HTTP GET |
| `api.hyperliquid-radar.com/metrics` | Prometheus 指标(内部 IP 白名单) | HTTP GET |

### 2.4 第三方平台账户 / 集成

| 平台 | 账户 / handle | 用途 |
|---|---|---|
| GitHub org | `cexagent` | 代码托管 |
| npm org | `cexagent` | 包发布 |
| Docker Hub / ghcr | `cexagent` | 容器镜像(ghcr 免费) |
| Smithery | `@cexagent/hyperliquid-radar` 上架 | 分发 |
| PulseMCP | 上架 | 分发 |
| mcp.so | 上架 | 分发 |
| awesome-mcp-servers(社区 repo) | PR 加入 | 分发 |
| Twitter / X | `@hl_radar` | 品牌传播 |
| Telegram BotFather | `@hl_radar_bot` | 告警推送通道 1 |
| Discord Developer Portal | `hl_radar` app + bot | 告警推送通道 2 |

### 2.5 基础设施服务

**前端走 Vercel,后端走自备 VPS**:

| 服务 | 用途 | 计费 | 位置 |
|---|---|---|---|
| **Vercel** | 前端托管(landing + docs) + TG/Discord webhook 备选入口 | Hobby tier 免费 | 前端 |
| **Cloudflare** | DNS(非 Vercel 管的子域)+ DDoS 保护 | 免费 | 共用 |
| **自备 VPS** | 跑 alert-daemon + TG bot + Discord bot + SQLite + Caddy | 用户自备 | 后端 |
| Caddy | `api.hyperliquid-radar.com` 反代 + 自动 TLS | 免费 | VPS 上 |
| PM2 | Node.js 进程守护 | 免费 | VPS 上 |
| Upstash Redis | 热数据缓存(仓位 / funding / 订单簿) | 免费档 10k req/day | 托管 |
| SQLite(VPS 本地文件)| 订阅记录持久化 | 免费 | VPS 上 |
| Sentry | 错误追踪 | 免费档 5k events/月 | 托管 |
| UptimeRobot | 外部 uptime 监控 | 免费档 50 monitors | 托管 |
| Grafana Cloud | Prometheus metrics dashboard | 免费档 | 托管 |
| Vercel Analytics | 落地页 / 文档站流量 | 免费 | 托管 |
| GitHub Actions | CI/CD(npm publish / docker build / Vercel deploy 触发) | 公开仓库免费 | 托管 |

### 2.6 内容资产

| 项 | 内容 | 位置 |
|---|---|---|
| 品牌 README(中英双语) | Tool 列表 / 安装步骤 / demo prompt / FAQ | GitHub repo + docs 站 |
| 落地页 | 23 工具展示 / 一键安装 / demo 视频嵌入 | `hyperliquid-radar.com` |
| 文档站 | 每个 tool 的输入输出 schema + 错误码 + 示例 | `docs.hyperliquid-radar.com` |
| 推特发布 thread | 主 thread + 3 条 demo 视频 | `@hl_radar` |
| 中文发布内容 | 小红书 / 公众号 / 微信群 | 分发渠道各自 |

### 2.7 法务 / 合规资产

| 项 | 位置 |
|---|---|
| Terms of Service | `hyperliquid-radar.com/terms` |
| Privacy Policy(声明不存用户身份) | `hyperliquid-radar.com/privacy` |
| 风险披露 / Disclaimer(非投资建议) | 每页页脚 + 每次叙事输出末尾 |
| Open Source License | MIT,repo 根目录 |

### 2.8 明确不做(避免功能蔓延)

- **不做 Web dashboard** —— Claude 就是前端
- **不做移动 APP** —— 分散精力
- **不做独立 CLI** —— `npx` 就是 CLI
- **不做 MCP SSE remote 模式** —— 只提供 stdio(用户本地 `npx`),装机 30 秒足够;SSE 长连接不匹配 serverless,徒增服务器压力和隐私敏感度;留作 v2 候选
- **不做账户系统 / 登录 / user_token** —— 用户隐私优先
- **不做实际下单 / 交易执行** —— 是矩阵未来 action 类产品的范围
- **不代管用户资金或私钥**
- **不做投资建议**

---

## 3. 目标用户 & 核心场景

### 3.1 用户画像

| 画像 | 比例估 | 特征 | 核心诉求 |
|---|---|---|---|
| **HL 主力交易者** | 40% | 日交易 $10k+,用 Claude/Cursor | 实时清算 / 鲸鱼 / 套利 |
| **跟单信号党** | 25% | 关注 machi / wynn 等公开 KOL | 24h 追踪 |
| **套利党** | 15% | 跨 HL + CEX delta-neutral | funding 差 + 价差 |
| **内容作者** | 10% | crypto KOL | 叙事材料 + 事件提醒 |
| **HYPE 持有者 / 被动用户** | 10% | 持有 HYPE | HLP / 保险基金 / 日报 |

### 3.2 五个核心场景

#### A. 盘中发现清算机会
```
User: HL 上现在最危险的 10 个仓位是什么
Agent: [get_top_liquidation_risks(10)] → 按离爆仓距离 × 仓位大小排序表 + 叙事分析
User: 如果 BTC 瞬时跌 5%,会发生什么
Agent: [simulate_cascade("BTC", -5)] → 触发 $X 爆仓,价格预估再跌 Y%,top 3 受损者
```

#### B. 追踪鲸鱼
```
User: machi 和 james wynn 最近 24h 干啥了
Agent: [并发 address_position_history] → 时间线 + 盈亏 + 叙事总结
```

#### C. 每日 briefing
```
User: 给我今天的 HL 日报
Agent: [daily_briefing()] → 昨日大事件 / 鲸鱼净多空 / funding 异常 / HLP / 今日焦点
```

#### D. 自查持仓风险
```
User: 我的 HL 地址 0xabc...,我离爆仓多远
Agent: [my_position_risk("0xabc...")] → 每个仓位的爆仓价 / 距离 / 相邻仓位密度
```

#### E. 订阅告警(零账户设计)
```
User: machi 一开单就叫我,推到我的 TG chat_id 12345
Agent: [subscribe_wallet(machi_addr, "telegram_chat_id", "12345")]
       → {subscription_id: "sub_abc123", expires_at: "2026-05-24"}
Agent(告诉用户):订阅已创建,ID 是 sub_abc123,30 天后失效,到期前可续订
之后 machi 任何动作 → 告警服务推到 TG chat_id 12345
```

**用户获取 TG chat_id 的方式**:去 `@hl_radar_bot` 发一句 `/myid`,bot 直接回复 chat_id

---

## 4. 功能需求(23 个 Tool 详规)

### 4.1 模块 A — 清算风险(5 个)

#### `get_top_liquidation_risks`
- **签名**:`(n: number = 10, asset?: string) → LiqRisk[]`
- **描述**:HL 上离爆仓最近的 N 个仓位
- **参数**:`n`(默认 10,上限 100)/ `asset`(可选限定)
- **返回 schema**:
```json
[{
  "address": "0x...",
  "asset": "BTC",
  "side": "long",
  "size_usd": 1234567,
  "leverage": 25,
  "entry_price": 68450,
  "liq_price": 65230,
  "current_price": 65900,
  "distance_to_liq_pct": 1.02,
  "unrealized_pnl_usd": -8234,
  "opened_at": "2026-04-22T14:30:00Z"
}]
```
- **排序**:`distance_to_liq_pct ASC, size_usd DESC` 加权
- **延迟**:p50 < 1s / p99 < 3s
- **新鲜度**:< 30s

#### `liquidation_heatmap`
- **签名**:`(asset: string, range_pct: number = 20) → Heatmap`
- **描述**:当前价 ±X% 范围内,每 0.5% 分桶的累计清算金额
- **返回**:`{current_price, buckets: [{price, cum_liq_usd_long, cum_liq_usd_short}]}`

#### `simulate_cascade`
- **签名**:`(asset: string, stress_pct: number) → CascadeResult`
- **描述**:模拟价格瞬时冲击 X% 的连锁清算链(3 轮迭代)
- **返回**:
```json
{
  "trigger_price": 62600,
  "initial_liq_usd": 45000000,
  "cascade_waves": [
    {"wave": 1, "price_impact_pct": -2.1, "additional_liq_usd": 18000000},
    {"wave": 2, "price_impact_pct": -1.3, "additional_liq_usd": 7200000},
    {"wave": 3, "price_impact_pct": -0.4, "additional_liq_usd": 1800000}
  ],
  "total_liq_usd": 72000000,
  "final_price_estimate": 59800,
  "top_losers": [{"address": "0x...", "loss_usd": 3400000}],
  "disclaimer": "估算值,非价格预测"
}
```
- **算法**:基于订单簿深度 + cascade 公式迭代(**全开源**)

#### `my_position_risk`
- **签名**:`(address: string) → MyRisk`
- **描述**:用户自查地址的仓位风险 + 相邻仓位密度 + 是否带 cascade
- **注意**:**不需要私钥/API key**,公开地址足够

#### `historical_cascade_replay`
- **签名**:`(date: string) → HistoricalEvent`
- **描述**:回放某日最大 cascade 事件 + 后续 24h 走势

### 4.2 模块 B — 鲸鱼 / 仓位流(5 个)

#### `get_whale_flows`
`(hours: number = 24, min_size_usd: number = 1000000) → WhaleFlow[]` —— 大仓位开平动作时间线

#### `new_whale_entries`
`(asset: string, hours: number = 24) → WhaleEntry[]` —— 新开仓(不含加仓)的鲸鱼

#### `whale_pnl_leaderboard`
`(timeframe: "24h"|"7d"|"30d" = "7d", n: number = 50) → LeaderboardEntry[]` —— 赚钱/亏钱榜 + 当前持仓

#### `address_position_history`
`(address: string, days: number = 30) → PositionHistory` —— 单地址历史仓位 + PnL 曲线

#### `smart_money_flow`
`(asset: string, top_n: number = 20) → SmartFlow` —— Top PnL 玩家在标的上净多/净空

### 4.3 模块 C — 市场结构(6 个)

#### `get_funding_divergence`
`(asset: string) → FundingDivergence` —— HL vs Binance/Bybit/OKX funding 偏差 + 8h 套利预估

#### `orderbook_imbalance`
`(asset: string, depth_pct: number = 1) → Imbalance` —— ±X% 盘口多空失衡

#### `oi_change`
`(asset: string, hours: number = 1) → OIChange` —— OI 变化 + 方向推断

#### `spread_analysis`
`(asset: string) → Spread` —— HL vs CEX 价差 + 历史 p50/p95

#### `hlp_metrics`
`() → HLPStatus` —— TVL / 7 天 PnL / 持仓构成 / 胜率

#### `insurance_fund_status`
`() → InsuranceFund` —— 余额 + 近期消耗

### 4.4 模块 D — 叙事总结(3 个)

#### `explain_market_structure`
`(lang: "zh"|"en" = "zh") → string` —— 3-5 段"HL 当下状态"(Markdown)

#### `asset_snapshot`
`(asset: string) → AssetSnapshot` —— 单标的全景 + Markdown 摘要

#### `daily_briefing`
`(date?: string) → string` —— 当日大事件总结(Markdown)

### 4.5 模块 E — 订阅告警(7 个,零账户设计)

**核心设计原则**:
- **不存用户身份**。订阅记录只有 `{subscription_id, destination, criteria, expires_at}`
- **destination 是推送目标**(TG chat_id / Discord webhook URL / HTTP webhook URL),不是用户身份
- **TTL 30 天**,到期自动失效,用户想续就再订
- **subscription_id 即权限**。谁拿到 id 谁能取消,和分享链接同款机制
- **不提供"list my subscriptions"** —— 因为我们不知道谁是"你"

#### `subscribe_wallet`
- **签名**:`(address: string, destination_type: "telegram_chat_id"|"discord_webhook"|"http_webhook", destination: string) → {subscription_id, expires_at}`
- **描述**:订阅某钱包每一步动作
- **destination 示例**:
  - `telegram_chat_id`:`"12345678"`(用户从 `@hl_radar_bot` 用 `/myid` 获取)
  - `discord_webhook`:`"https://discord.com/api/webhooks/..."`(用户自己创建的 channel webhook)
  - `http_webhook`:`"https://user.example.com/hooks/hl"`(用户自定义)

#### `subscribe_liq_threshold`
`(address: string, threshold_pct: number, destination_type, destination) → {subscription_id, expires_at}`
当某地址任一仓位离爆仓 < X% 时告警

#### `subscribe_whale_entry`
`(asset: string, min_size_usd: number, destination_type, destination) → {subscription_id, expires_at}`
指定标的出现 ≥ $X 新开仓时告警

#### `subscribe_cascade_risk`
`(threshold_usd: number, destination_type, destination) → {subscription_id, expires_at}`
模拟显示 2% 冲击会触发 ≥ $X 清算时告警

#### `subscribe_funding_extreme`
`(asset: string, bps_threshold: number, destination_type, destination) → {subscription_id, expires_at}`
funding 达极值时告警

#### `cancel_subscription`
`(subscription_id: string) → {ok}`
凭 id 取消。id 是权限,丢了也可以等 30 天自过期

#### `extend_subscription`
`(subscription_id: string) → {expires_at}`
延长 30 天

---

## 5. 技术架构

### 5.1 数据源清单

| 数据源 | 用途 | 计费 | 限流 |
|---|---|---|---|
| HL `api.hyperliquid.xyz` REST | 仓位 / 订单簿 / funding / OI / HLP / 保险基金 | 免费 | 自 throttle 10 req/s |
| HL WebSocket | 实时仓位变化 / 成交(告警服务订阅用) | 免费 | 单连接 |
| Binance REST | 对标 funding / 价格 | 免费 | 1200 req/min |
| Bybit REST | 对标 funding | 免费 | 120 req/s |
| OKX REST | 对标 funding | 免费 | 无明确 |
| CoinGecko free | 历史价格(cascade replay 用) | 免费 | 10-30 req/min |

全免费,符合 products.md Part 1 定位。

### 5.2 系统架构

```
  ┌──── Vercel(免费,前端)─────────────────────────────────────┐
  │                                                                │
  │  hyperliquid-radar.com      Next.js 落地页                    │
  │  docs.hyperliquid-radar.com Docusaurus 文档站                 │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘

  ┌──── 用户本地机器(零我方成本)──────────────────────────────┐
  │                                                                │
  │  Claude Desktop / Cursor / Eliza                              │
  │    └── 子进程: npx @cexagent/hyperliquid-radar(stdio MCP)    │
  │         ├── 23 个 tool 直接调 HL / CEX 公开 API               │
  │         └── 订阅告警时 POST api.hyperliquid-radar.com/v1/alerts │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘

  ┌──── 自备 VPS(1 核 1GB 够,告警后端)────────────────────────┐
  │                                                                │
  │  Caddy (api.hyperliquid-radar.com + 自动 TLS)                 │
  │    ├── /v1/alerts/{subscribe,cancel,extend} → alert-api       │
  │    ├── /v1/tg/webhook                        → tg-bot         │
  │    ├── /v1/discord/webhook                   → discord-bot    │
  │    └── /health                               → health check   │
  │                                                                │
  │  alert-daemon(常驻 Node 进程,PM2 守护)                     │
  │    ├── 订阅 HL WebSocket 实时事件                             │
  │    ├── 每分钟匹配 SQLite 里所有活跃订阅                      │
  │    └── 命中 → 调 TG Bot API / Discord webhook / 用户 webhook │
  │                                                                │
  │  SQLite(本地文件,订阅记录,零用户身份)                    │
  │  Upstash Redis(远程托管,热数据缓存)                        │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘
```

**关键路径**:
- **查询类请求**(模块 A/B/C/D)—— 用户本地 stdio 进程直接调 HL/CEX 免费 API,不经我方服务器
- **订阅类请求**(模块 E)—— 用户本地 stdio → POST 我方 alert-api → 写 SQLite → alert-daemon 读 SQLite + 触发时调 TG/Discord/Webhook
- **前端访问**(落地页 / 文档站)—— 静态托管 Vercel,零我方服务器压力

### 5.3 缓存策略

| 数据类 | TTL | 后端 |
|---|---|---|
| 仓位快照 | 30s | Upstash Redis |
| funding | 60s | Upstash Redis |
| 订单簿 | 10s | Upstash Redis |
| 历史数据 | 永久 | Upstash Redis(含冷数据 LRU) |
| 订阅记录 | 30 天 TTL | SQLite 本地文件 |

### 5.4 技术栈

**后端 / MCP server**
- **语言**:TypeScript(Node.js 20+)
- **MCP SDK**:`@modelcontextprotocol/sdk`(stdio transport)
- **HTTP client**:`undici`
- **WebSocket**:`ws`(alert-daemon 订阅 HL WS 用)
- **缓存**:`@upstash/redis`(远程)+ `lru-cache`(本地)
- **持久化**:`better-sqlite3`(订阅记录)
- **日志**:`pino` → 可选 BetterStack Logs 免费 tier
- **错误追踪**:`@sentry/node`
- **测试**:`vitest`(80% 核心逻辑覆盖)
- **Lint/Format**:`biome`
- **进程管理**:PM2
- **反代 / TLS**:Caddy(自动 Let's Encrypt)

**前端**
- **落地页**:Next.js 14 App Router(Vercel)
- **文档站**:Docusaurus(Vercel)
- **样式**:Tailwind + shadcn/ui
- **分析**:Vercel Analytics(免费)

**CI/CD(GitHub Actions,公开仓库免费)**
- PR 自动跑 test + lint + typecheck
- 打 tag 自动 npm publish + docker build & push ghcr
- main 合并 → Vercel 自动部署前端 + 可选 SSH 到 VPS 滚动更新后端

### 5.5 数据库 schema(订阅记录)

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                     -- UUID,返给用户的 subscription_id
  kind TEXT NOT NULL,                      -- wallet / liq_threshold / whale_entry / cascade_risk / funding_extreme
  criteria_json TEXT NOT NULL,             -- 条件的 JSON
  destination_type TEXT NOT NULL,          -- telegram_chat_id / discord_webhook / http_webhook
  destination TEXT NOT NULL,               -- 目标(chat id 或 webhook url)
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,             -- 30 天后
  last_triggered_at INTEGER,               -- 最近一次推送时间(防抖用)
  trigger_count INTEGER DEFAULT 0
);

CREATE INDEX idx_sub_kind ON subscriptions(kind);
CREATE INDEX idx_sub_expires ON subscriptions(expires_at);
```

**没有 `users` 表**。没有 `user_id` 列。没有任何能把订阅反查到"人"的字段。

### 5.6 部署拓扑

**前端(Vercel,零我方服务器)**
| 部署物 | 说明 |
|---|---|
| Landing | `hyperliquid-radar.com` — Next.js via Vercel GitHub integration,push 即部署 |
| Docs | `docs.hyperliquid-radar.com` — Docusaurus via Vercel,build 产物静态托管 |

**后端(自备 VPS,1 核 1GB 即可)**
| 进程 | 说明 |
|---|---|
| Caddy | 反代 `api.hyperliquid-radar.com`,自动 TLS |
| alert-api | Node.js + PM2,处理 `/v1/alerts/*` 接口,读写 SQLite |
| alert-daemon | Node.js + PM2,常驻订阅 HL WS + 每分钟匹配订阅 + push |
| tg-bot | Node.js + PM2,处理 TG webhook(`/myid` 等命令)|
| discord-bot | Node.js + PM2,处理 Discord interactions webhook |
| SQLite | 本地文件,alert-api 和 alert-daemon 共享读写 |

**用户本地(零我方服务器)**
| 进程 | 说明 |
|---|---|
| stdio MCP server | `npx @cexagent/hyperliquid-radar` 由 Claude Desktop / Cursor 的 MCP 框架 spawn 成子进程,按需拉起 |

---

## 6. 非功能需求

### 6.1 性能

- 单次 tool 调用 p50 < 1s / p99 < 3s
- 并发:50 qps(缓存命中)/ 10 qps(穿透)
- 冷启动 < 500ms(stdio 模式)
- 告警触发到 push 完成 < 60s

### 6.2 可靠性

- HL API 挂时降级返回缓存 + 标 `stale: true`
- 单 tool 失败不影响其他 tool
- 告警服务崩溃重启后从 SQLite 恢复订阅
- 关键接口重试 3 次 + 指数回退
- 过期订阅自动清理 cron(每日 03:00 UTC)

### 6.3 安全

- **绝不接受私钥 / 交易所 API key**
- **不存用户身份 / 不存 user token**(§4.5 核心设计)
- Webhook URL 如果用户要求,可以加 HMAC 签名头(可选)
- Caddy 前自动 HTTPS,不接受 HTTP
- Sentry 日志脱敏地址(debug 模式才原文)

### 6.4 可观测

- 每次 tool 调用记录 `{tool_name, params_hash, latency_ms, status, cache_hit}`
- 关键指标 dashboard(Grafana Cloud):
  - Tool 调用量 by tool(日 / 周)
  - 错误率 by tool
  - 告警触发数 / 告警延迟
  - 活跃订阅数
- 外部 uptime monitoring(UptimeRobot):每 5 分钟 ping `/health`
- 状态页 `status.hyperliquid-radar.com` 实时展示各组件状态

### 6.5 合规

- ToS + Privacy Policy 覆盖 EU GDPR / US CCPA 基本要求(零数据收集的话合规成本极低)
- 免责声明"非投资建议"出现在所有叙事输出末尾
- MIT license,可复用可 fork

---

## 7. 成功指标

### 7.1 阶段目标

| 里程碑 | Smithery useCount | GitHub star | npm 下载 | 告警订阅 |
|---|---|---|---|---|
| 发布 2 周 | 500+ | 50+ | 200/周 | 30+ |
| 发布 6 周 | 2,000+ | 200+ | 1,000/月 | 300+ |
| 发布 3 月 | 8,000+ | 800+ | 4,000/月 | 2,000+ |

**参照基线**:Zerion 官方 4,786 uses · Zarq 5,214 · cryptoiz 9,991 · Polymarket(aryan)54,822

### 7.2 失败阈值

- 发布 4 周 useCount < 100 → PMF 有问题,暂停矩阵后续
- 发布 8 周 useCount < 500 → 重大调整

---

## 8. 发布计划(4-5 周)

| 周 | 产出 |
|---|---|
| **W1** | 项目脚手架(mono-repo + CI)/ stdio MCP SDK 跑通 / 域名 + Vercel 项目初始化 / 模块 C 的 6 个 tool |
| **W2** | 模块 A 的 5 个 tool(重点:cascade 算法实现 + 校准)|
| **W3** | 模块 B 的 5 个 tool + Sentry + Grafana 接入 |
| **W4** | 模块 D 的 3 个 tool + 叙事 prompt 打磨 + Next.js 落地页上线(Vercel)+ Docusaurus 文档站上线(Vercel)+ README 完整 |
| **W5** | 模块 E 的 7 个 tool + alert-api + alert-daemon + TG bot + Discord bot(VPS 上)+ Smithery/PulseMCP/mcp.so 上架 + 推特发布 + 3 条 demo 视频 |

### 8.1 发布周(W5)逐日

| 天 | 动作 |
|---|---|
| D1 | GitHub public + npm publish 1.0.0 + Smithery 提交 |
| D2 | PulseMCP + mcp.so 提交 + 落地页 + 文档站最终检查 |
| D3 | 推特主 thread + 3 条 demo 视频 + `@hl_radar` 首发 |
| D4 | 中文内容(小红书 / 公众号 / 微信群) |
| D5 | 邀请 5 个 HL 生态 KOL 私信试用 |
| D6-7 | 监控首波反馈 + 紧急修 bug + 状态页公开 |

---

## 9. 风险与边界

### 9.1 技术风险

| 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|
| HL API 限流 / 收费 | 中 | 高 | 激进缓存 + 多实例;极端下自建 HL 节点 |
| cascade 算法偏差大 | 高 | 中 | v1 明确 disclaimer;基于真实事件持续校准 |
| 告警 push 延迟 > 60s | 低 | 中 | 独立进程 + 1 min 轮询 + 重试 |
| HL 协议升级破坏兼容 | 中 | 高 | 订阅 changelog + SDK 锁定 + 准备热修 |
| npm 供应链攻击 | 低 | 灾难 | lock + only well-known deps + CI 扫描 + 2FA 强制 |

### 9.2 市场风险

| 风险 | 应对 |
|---|---|
| HL 官方自出 MCP | 差异化在"整合 + 叙事 + 告警",即使官方出仍互补 |
| 社区出现更好竞品 | 第一个发 + 持续迭代 + 矩阵反哺 |
| HL 热度下滑 | HL 是旗舰不是唯一,矩阵对冲 |
| Anthropic/Cursor/Windsurf 官方推自己的 HL 集成 | 我们服务 agent 用户不是平台,MCP 兼容即可 |

### 9.3 明确边界

参见 §2.8。

---

## 10. 竞品分析

| 竞品 | 形态 | 差距 |
|---|---|---|
| Hyperdash(pvp.trade 收购) | Web | 无公开 API |
| mektigboy/server-hyperliquid | MCP 44 star | 功能薄停滞 |
| kukapay/hyperliquid-info | MCP 27 star | 只读裸 API |
| Br0ski777 6 个 HL 子工具 | MCP 套件 | 碎片化,无装机 |
| ClaudeTrader / DexClaude | 品牌化,形态不明 | 主推下单,我们做监控,互补 |
| Coinglass HL 页面 | Web,$29/月 | 付费;我们免费 + agent-native + 叙事 |

### 10.1 综合差异化

1. 23 tool 按 5 模块组织,当下最全的 HL agent 工具集
2. 叙事层独一份
3. 告警订阅独一份(MCP 生态基本做不了 push)
4. **全链路 MIT 开源**(mektigboy / kukapay / Br0ski777 都是单包开源,告警层 / bot / 部署代码 / 落地页没人开过)—— 可自托管完整产品
5. **零用户身份**(唯一不需要注册 / 不收集 PII 的 HL 产品)
6. 官方实例免费 + 不收交易费

---

## 11. 演进路线

### v1.5(M3-M4)
- 叙事 prompt 中英文打磨
- HYPE 代币 staking / 验证者数据补全
- Tool 粒度优化(合并重复度高的 / 拆分过载的)
- **Eliza plugin 版本发布**(覆盖 Virtuals / Eliza 用户)

### v2(M6+)
- **MCP SSE remote 模式**(可选,看用户反馈;加 `api.hyperliquid-radar.com/mcp` SSE 端点,零安装 URL 接入)
- 可选 Glassnode Pro 接入提升 CEX cascade 精度(products.md Part 3)
- Agent-to-agent 格式规范化(让 hyperliquid-radar 输出能被其他 cexagent 产品直接消费)
- 矩阵联动(new-token-radar 检测 HL 新上市 → 自动触发 monitor)
- x402 付费分级(发布 6 月装机破 8k 才考虑)

### v3(未定)
- 扩展到其他 perp DEX → 变成"perp 全景雷达"
- 企业 API(B2B 卖给 HL 生态基金 / 做市商)

---

## 附录 A:基础设施成本汇总(一年)

| 项 | 成本 | 说明 |
|---|---|---|
| 域名 `hyperliquid-radar.com` | $12/年 | Namecheap / Cloudflare Registrar |
| 其他子域 | $0 | 用主域子域 |
| **Vercel** | $0 | Hobby 免费档,无商业限制对我们场景完全够用 |
| **Vercel Analytics** | $0 | 基础版免费 |
| Cloudflare | $0 | 免费档 DNS |
| Upstash Redis | $0 | 免费档 10k req/day |
| Sentry | $0 | 免费档 5k events/月 |
| UptimeRobot | $0 | 免费档 50 monitors |
| Grafana Cloud | $0 | 免费档 |
| GitHub / GHCR | $0 | 公开仓库 |
| npm | $0 | 免费 |
| TG BotFather | $0 | 免费 |
| Discord Developer | $0 | 免费 |
| Docusaurus | $0 | 开源 |

**硬成本**:**$12/年**(只有域名)
**服务器**:用户自备 1 核 1GB VPS(砍 SSE 后负载极轻)
**人力**:4-5 周开发

### 如果免费档不够用的升级路径

| 服务 | 升级触发 | 升级成本 |
|---|---|---|
| Upstash Redis | > 10k req/day | $10/月起(按 req 计费) |
| Sentry | > 5k events/月 | $26/月起 |
| Plausible Cloud | 不想自托管 | $9/月起 |
| BetterStack Logs | 需集中日志 | $10/月起 |

**建议**:先全部走免费档,等真实流量起来后再付费升级,避免过度准备。

---

## 附录 B:README 样例

```markdown
# hyperliquid-radar

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, market narrative, wallet alerts. No more tab-switching to
Hyperdash.

## Install — 30 seconds

### Claude Desktop (stdio, recommended)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

    {
      "mcpServers": {
        "hyperliquid-radar": {
          "command": "npx",
          "args": ["@cexagent/hyperliquid-radar"]
        }
      }
    }

### Cursor

    mcp add @cexagent/hyperliquid-radar

### Self-host(完整后端,可选)

    git clone https://github.com/cexagent/hyperliquid-radar
    cd hyperliquid-radar
    docker compose up -d    # alert-api + alert-daemon + tg-bot + discord-bot

## Example prompts

- "HL 上现在最危险的 10 个仓位"
- "如果 BTC 瞬时跌 5%,会连环爆多少钱"
- "machibigbrother 最近 24 小时干了啥"
- "给我今天的 HL 日报"
- "HL 和 Binance 的 BTC funding 差多少"
- "machi 开单就推到我的 TG"

## 23 Tools in 5 Modules

- **A. Liquidation Risk** (5 tools)
- **B. Whale Flows** (5 tools)
- **C. Market Structure** (6 tools)
- **D. Narrative** (3 tools)
- **E. Alert Subscriptions** (7 tools) — 通过 TG / Discord / Webhook 推送

Full docs: https://docs.hyperliquid-radar.com

## Privacy

**We store zero user identity.** Subscription records only contain the push
destination (TG chat_id / webhook URL) and criteria. No accounts. No tokens.
30-day auto-expiry.
```

---

**PRD 结束**。所有决策已定稿,开发可直接启动。
