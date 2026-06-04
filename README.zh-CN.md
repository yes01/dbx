# TestTeam DBX

TestTeam DBX 是 TestTeam 出品并维护的内部数据库管理工具。

## 范围

- 桌面端数据库连接管理与查询执行
- 数据浏览、导入、导出、比对和迁移工具
- 在内部策略允许时使用本地 AI 与 MCP 辅助数据库工作流
- 通过内部发布渠道管理驱动和 JDBC 插件

## 内部使用

本仓库按内部工具维护。面向外部的社区链接、问题反馈指引、贡献者徽章、Star 记录和发布推广内容已从产品展示材料中移除。

支持、发布包、安全报告和运维问题请走 TestTeam 内部渠道。

## 开发

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
```

桌面端打包仍使用 Tauri：

```bash
pnpm tauri build
```

