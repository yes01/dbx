# TestTeam DBX

TestTeam 内部数据库管理工具，基于 Tauri + Vue 构建的跨平台桌面应用。

## 功能

- 多数据库连接管理（MySQL、PostgreSQL、SQLite、MongoDB、Redis 等）
- SQL 查询编辑与执行
- 数据浏览、导入导出、结构对比与数据迁移
- AI 辅助 SQL 生成
- JDBC 驱动管理
- MCP Server 集成

## 开发

```bash
pnpm install
pnpm dev          # 启动 Web 开发服务
pnpm tauri dev    # 启动桌面应用开发
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
```

## 构建

```bash
pnpm tauri build  # 构建桌面安装包
```
