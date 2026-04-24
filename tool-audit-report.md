# Hyperliquid Radar Tool Audit

Context: address `0x0b8aa35c28b7c6ab18f11dc168f437a8a69fd4f8`, asset `HYPE`, compare assets `BTC, ETH, HYPE`

| Tool | Pass/Fail | Shape Notes | Realism Notes | Broken/Confusing Behavior |
| --- | --- | --- | --- | --- |
| get_top_liquidation_risks | PASS | top-level keys: queried_addresses, successful_queries, total_positions_found, returned, positions | Scanned 60/60; found 17 positions. |  |
| liquidation_heatmap | PASS | top-level keys: asset, current_price, bucket_pct, range_pct, addresses_scanned, total_long_usd, total_short_usd, buckets, note | Scanned 60 addresses, 0 buckets. |  |
| simulate_cascade | PASS | top-level keys: asset, current_price, stress_pct, trigger_price, final_price_estimate, total_liq_usd, waves, top_losers, addresses_scanned, disclaimer | Trigger 39.1276, final 39.1276, liq $0. |  |
| my_position_risk | PASS | top-level keys: address, account_value_usd, total_margin_used_usd, withdrawable_usd, position_count, positions, at_risk_count, warnings | Address has 1 open positions; 0 flagged near liq. |  |
| simulate_my_liq_price | PASS | top-level keys: address, asset, side, current_mark_price, current_size_usd, current_liq_price, current_distance_to_liq_pct, delta_size_usd, projected_size_usd, projected_leverage, projected_liq_price, projected_distance_to_liq_pct | Projected liq 33.7616, leverage 11.1062. |  |
| get_recent_liquidations | PASS | top-level keys: addresses_scanned, successful, seed_mode, hours, min_size_usd, total_liquidations, liquidations | Found 7 liquidations in 24h scan. |  |
| whale_pnl_leaderboard | PASS | top-level keys: window, sort_by, total, returned, top_traders, note | Top row 0x0b8aa3… account $19583401.926141, pnl $3113048.454878. |  |
| get_whale_flows | PASS | top-level keys: addresses_scanned, successful, hours, min_size_usd, total_flows, flows | Found 150 flows over $250000. |  |
| address_position_history | FAIL | call failed | No result | HL API 429: null |
| smart_money_flow | PASS | top-level keys: asset, addresses_scanned, total_long_usd, total_short_usd, net_usd, long_short_ratio, net_bias, top_longs, top_shorts, note | Net bias long, long/short ratio Infinity. | Output note says addresses must be provided explicitly, but the tool actually defaults to seed addresses. |
| get_funding_pnl | PASS | top-level keys: address, days, event_count, total_net_usd, total_paid_usd, total_received_usd, by_asset, interpretation | Funding pnl over 7d: $undefined. |  |
| get_funding_divergence | PASS | top-level keys: asset, hl_funding_annual_pct, hl_mark_price, exchanges, best_arb, disclaimer | Compared hyperliquid. |  |
| asset_snapshot | PASS | top-level keys: asset, mark_price, oracle_price, mid_price, prev_day_price, change_24h_pct, funding_per_hour_pct, funding_annual_pct, open_interest_base, open_interest_usd, day_volume_usd, max_leverage | Asset HYPE. |  |
| get_all_asset_ctxs | PASS | top-level keys: total, returned, sorted_by, assets | Returned 20/230 assets sorted by volume. |  |
| hlp_metrics | PASS | top-level keys: vault_address, name, apr, leader_commission, leader_fraction, follower_count, max_withdrawable, max_distributable, allow_deposits, is_closed, disclaimer | HLP Hyperliquidity Provider (HLP), APR -0.0018052797369904512, followers 100. |  |
| orderbook_imbalance | PASS | top-level keys: asset, mid_price, depth_pct, price_low, price_high, bid_depth_usd, ask_depth_usd, imbalance_ratio, dominant_side, top_5_bids, top_5_asks | Asset HYPE. |  |
| compare_perps | PASS | top-level keys: count, table | Compared BTC, ETH, HYPE. |  |
| historical_context | PASS | top-level keys: asset, current, price_context, interpretation | Asset HYPE. |  |
| detect_anomalies | PASS | top-level keys: scanned_assets, filtered_out_low_oi, total_oi_usd, total_volume_24h_usd, median_volume_24h_usd, thresholds, anomalies, headline_summary | MAVIA funding at +518.8%/yr · APE +62.37% in 24h · BTC volume 3350.1× the HL median |  |
| explain_market_structure | PASS | top-level keys: lang, markdown, structured | Markdown length 844. |  |
| asset_snapshot_narrative | PASS | top-level keys: asset, lang, markdown, structured | Asset HYPE. |  |
| daily_briefing | PASS | top-level keys: lang, date, markdown, summary | Markdown length 424. |  |
