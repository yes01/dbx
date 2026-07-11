package com.dbx.agent.gbase8a;

import com.dbx.agent.ConfiguredJdbcAgent;
import com.dbx.agent.JdbcIdentifiers;
import com.dbx.agent.JdbcAgentProfile;
import com.dbx.agent.JsonRpcServer;
import com.dbx.agent.ObjectSource;
import com.dbx.agent.TableInfo;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class Gbase8aAgent extends ConfiguredJdbcAgent {
    public static final JdbcAgentProfile GBASE8A_PROFILE = new JdbcAgentProfile(
        "com.gbase.jdbc.Driver",
        "jdbc:gbase://{host}:{port}/{database}?useSSL=false",
        5258,
        false,
        java.util.Collections.emptySet(),
        java.util.Arrays.asList("TABLE", "VIEW", "BASE TABLE"),
        "`",
        "USE",
        true,
        false,
        true,
        false
    );

    public Gbase8aAgent() {
        super(GBASE8A_PROFILE);
    }

    @Override
    public List<TableInfo> listTables(String schema) {
        return unchecked(() -> {
            List<TableInfo> result = new ArrayList<>();
            String sql;
            if (schema != null && !schema.trim().isEmpty()) {
                sql = "SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME";
            } else {
                sql = "SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'gclusterdb', 'gctmpdb') ORDER BY TABLE_SCHEMA, TABLE_NAME";
            }
            try (PreparedStatement stmt = requireConnection().prepareStatement(sql)) {
                if (schema != null && !schema.trim().isEmpty()) {
                    stmt.setString(1, schema);
                }
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        String tableType = rs.getString("TABLE_TYPE");
                        if ("BASE TABLE".equals(tableType)) {
                            tableType = "TABLE";
                        }
                        result.add(new TableInfo(rs.getString("TABLE_NAME"), tableType, null));
                    }
                }
            }
            result.sort(Comparator.comparing(TableInfo::getName));
            return result;
        });
    }

    @Override
    public ObjectSource getObjectSource(String schema, String name, String objectType) {
        return unchecked(() -> {
            String normalizedType = objectType.toUpperCase(java.util.Locale.ROOT);
            String sql = switch (normalizedType) {
                case "VIEW" -> "SHOW CREATE VIEW ";
                case "PROCEDURE" -> "SHOW CREATE PROCEDURE ";
                case "FUNCTION" -> "SHOW CREATE FUNCTION ";
                default -> throw new IllegalArgumentException("Unsupported object type: " + objectType);
            };
            String qualifiedName = schema != null && !schema.trim().isEmpty()
                ? JdbcIdentifiers.INSTANCE.backtick(schema) + "." + JdbcIdentifiers.INSTANCE.backtick(name)
                : JdbcIdentifiers.INSTANCE.backtick(name);

            String source = "";
            try (Statement stmt = requireConnection().createStatement();
                 ResultSet rs = stmt.executeQuery(sql + qualifiedName)) {
                if (rs.next()) {
                    ResultSetMetaData metadata = rs.getMetaData();
                    for (int index = 1; index <= metadata.getColumnCount(); index++) {
                        String label = metadata.getColumnLabel(index);
                        if (label != null && label.toUpperCase(java.util.Locale.ROOT).startsWith("CREATE ")) {
                            String value = rs.getString(index);
                            source = value == null ? "" : value;
                            break;
                        }
                    }
                }
            }
            return new ObjectSource(name, normalizedType, schema, source);
        });
    }

    public static void main(String[] args) {
        new JsonRpcServer(new Gbase8aAgent()).run();
    }
}
