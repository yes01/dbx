# TestTeam DBX

TestTeam DBX is an internal database management tool maintained for TestTeam workflows.

## Scope

- Desktop database connection management and query execution
- Data browsing, import, export, comparison, and transfer utilities
- Local AI and MCP-assisted database workflows where enabled by internal policy
- Driver and JDBC plugin management through internal distribution channels

## Internal Use

This repository is maintained as an internal tool. Public community links, external issue guidance, contributor badges, and release promotion content have been removed from the product-facing materials.

For support, release packages, security reports, and operational questions, use the TestTeam internal channels.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
```

Desktop packaging still uses Tauri:

```bash
pnpm tauri build
```

