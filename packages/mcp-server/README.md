# TestTeam DBX MCP Server

MCP server for TestTeam DBX. It lets approved AI agents query databases using connections already configured in the internal TestTeam DBX app.

## Install

```bash
npm install -g @dbx-app/mcp-server
```

Or run directly:

```bash
npx @dbx-app/mcp-server
```

Requires Node.js 22.13.0 or newer.
需要 Node.js 22.13.0 或更高版本。

## Claude Code Config

```json
{
  "mcpServers": {
    "dbx": {
      "command": "dbx-mcp-server"
    }
  }
}
```

## Tools

- `dbx_list_connections`
- `dbx_add_connection`
- `dbx_remove_connection`
- `dbx_list_tables`
- `dbx_describe_table`
- `dbx_get_schema_context`
- `dbx_execute_query`
- `dbx_open_table`

## Safety

Regular write statements are allowed by default. To force a read-only MCP session:

```bash
DBX_MCP_ALLOW_WRITES=0
```

Dangerous SQL such as `DROP`, `TRUNCATE`, and `ALTER` remains blocked unless explicitly enabled:

```bash
DBX_MCP_ALLOW_DANGEROUS_SQL=1
```

Use TestTeam internal channels for installation, release, and support guidance.
