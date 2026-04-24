# 让 Codex 验收 hyperliquid-radar v0.4.1

## 1. 给 Codex 的配置

把下面这段加到 `~/.codex/config.toml`:

```toml
[mcp_servers.hyperliquid-radar]
command = "npx"
args = ["-y", "hyperliquid-radar@0.4.1"]
```

然后 `codex` 启动。

## 2. 给 Codex 的测试指令

直接复制粘贴下面整段:

---

请帮我验收 hyperliquid-radar v0.4.1 这个 MCP 服务器。它应该提供 22 个工具,按 4 个模块分组(A 清算 / B 鲸鱼 / C 市场结构 / D 叙事)。

验收要求:

一、列所有工具,确认数量是 22,并按模块归类打印。

二、选一个真实上下文跑完整流程:

- 地址:选你通过 `whale_pnl_leaderboard` 拿到的 top 1 by allTime 地址
- 主要资产:HYPE
- 对比资产:BTC / ETH / HYPE

三、每个工具各跑一次真实调用,返回值判断:

1. 数据结构是否合理(不该 null 的字段有没有 null,不该 undefined 的字段有没有 undefined)
2. 数值是否合乎常理(价格、funding、size_usd 是否合理范围)
3. 工具返回的 `note` / `disclaimer` / `headline_summary` 等自然语言字段是否可读

四、重点检查以下 v0.4.1 修复点是否到位:

- smart_money_flow:多空都空的时候 long_short_ratio 应该返回 null(不能返回 Infinity),应该有 short_side_empty / long_side_empty / seed_mode / net_bias 几个字段。net_bias 的枚举值包括 long / short / balanced / all_long / all_short / no_positions。不传 addresses 时 seed_mode 应该是 true,note 应该说 "Scanned the built-in seed list"。

- get_funding_divergence:返回应该包含 venue_status 字段,记录 hyperliquid / binance / bybit / okx 四家每家的 ok 状态和失败 error。某家失败时,disclaimer 尾部应该出现 "Missing: ..." 字样,明确告诉用户哪家缺。

- info() 重试:HLClient.info() 在收到 429 或 5xx 时会重试最多 2 次(指数退避 + jitter)。如果单地址 userFills 之前被限流,现在应该能多拿到一些。不需要刻意测,看批量压测时 429 是否大幅减少即可。

- smart_money_flow 工具描述和 input schema 现在说 addresses 是 optional。确认这个 description 和实际行为一致,不再有旧版"必须传 addresses"的残留文案。

五、压一下批量(可选):

- get_whale_flows 不传 addresses 跑一次(默认 60 个地址)
- address_position_history 对同一个地址连续调用 5 次,看 429 发生率
- 前后对比 v0.4.0 vs v0.4.1,理论上 429 应该下降

六、输出格式:

- 每个工具一段
- 每段:工具名 + 本次入参 + 状态(pass / fail / partial) + 一句话说明
- 最后给结论:go / no-go 和理由

特别注意:如果你发现 description / inputSchema 和实际 handler 行为不一致,单独列出来 —— 这类一致性 bug 对 agent-native 产品最致命,因为 agent 靠 description 决定传什么参数。

---

## 3. 你拿到 Codex 报告后怎么处理

- 告诉我哪几个 tool 出了 **description 和 handler 行为不一致** 的,这是最高优先级 bug
- 如果 Codex 说某个工具"数据结构合理但可解释性差",那是 UX 问题,不是 bug,可以下一版再做
- 429 如果还出现,告诉我哪个工具触发的,可能需要把重试从 2 次加到 3 次,或者降低并发

## 4. 顺便帮 Codex 看这些点,他可能会漏

v0.4.1 之前 Codex 提到但他这次可以重点核:

- `smart_money_flow` 之前的文案冲突(note 说"必须传地址")—— 现在应该是"已扫描内置 seed 列表"或"已扫描调用方提供的地址集"
- `get_funding_divergence` 之前只有 hyperliquid 一家成功时,其他三家静默消失 —— 现在 venue_status 里必须看得到 binance/bybit/okx 的 ok 或 error

我这边对外宣传时直接按 Codex 的原话摘录他的分类("有明确实用价值 / 能用但依赖样本 / 能用但值得打磨可解释性"),所以他的结论很重要,越严苛越好。
