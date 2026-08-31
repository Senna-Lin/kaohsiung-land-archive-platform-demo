# Dashboard v6 Full-auto Contract

1. Production PRs that change product code, runtime/configuration, governance decisions, or handoff evidence must update `governance/dashboard-evidence.json`; both production repositories enforce this with `Dashboard Evidence Gate`.
2. Evidence freshness is derived from the latest `main` commit that changed the manifest. `sourceHeadSha` remains an audit field and is not used as the freshness source of truth.
3. Dashboard deployment runs on every Dashboard `main` push and hourly at minute 17. It reads both private repositories with the read-only `DASHBOARD_EVIDENCE_TOKEN` and publishes only sanitized fields. Production-only merges therefore appear automatically with at most roughly one-hour latency.
4. The public dashboard never infers missing feature progress as 0%. Uncalibrated functions remain visible as `尚未校準`.
5. Benchmark history is accumulated from sanitized public snapshots and powers trend/forecast views. Forecasts describe evidence readiness, not guaranteed engineering completion dates.
6. Prototype Freeze remains a controlled UI/flow reference and is displayed separately from the two production lines.
