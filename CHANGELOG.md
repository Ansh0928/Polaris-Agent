# Changelog

## [0.1.1] - 2026-05-08

### Fixed
- `create_purchase_order` tool now validates `product_id` is a real UUID before the Postgres INSERT. Previously, the agent could hallucinate a non-UUID value (e.g. `"12345"`) causing `invalid input syntax for type uuid` errors. The tool now returns a soft error directing the agent to call `check_inventory` first and use the actual `product.id` field.
- Updated `product_id` tool description to explicitly state the value must come from `check_inventory` output — prevents hallucination at the prompt level.

## [0.1.0] - 2026-05-07

### Added
- Initial release: autonomous inventory agent with Hermes tool loop
- `check_inventory`, `flag_alerts`, `fetch_supplier_prices`, `write_memory`, `read_memory`, `check_website_prices`, `monitor_competitor_prices`, `create_purchase_order`, `log_decision` tools
- Draft purchase orders with 1-tap email approval link
- Decision audit trail via `decision_log` table
- Self-healing loop with jittered retry, checkpoint every 3 iterations, reflection
- Groq cloud fallback when Ollama is unavailable
- GitHub Actions cron — daily 6am AEST
