package com.bugwall;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;

/**
 * Export the {@code bugs} table to a CSV file. Useful for spreadsheet analysis,
 * sharing snapshots, or piping into other tooling that doesn't speak Postgres.
 *
 * <p>Usage:
 * <pre>
 *   DATABASE_URL=postgresql://... java -jar csv-exporter.jar --out=bugs.csv
 *   DATABASE_URL=postgresql://... java -jar csv-exporter.jar --out=ai.csv --category=ai
 * </pre>
 */
public final class CsvExporter {

    private static final String[] HEADERS = {
            "id", "title", "description", "category", "author",
            "upvotes", "downvotes", "score", "created_at"
    };

    public static void main(String[] args) {
        String out = null;
        String category = null;
        for (int i = 0; i < args.length; i++) {
            String a = args[i];
            if (a.startsWith("--out=")) out = a.substring("--out=".length());
            else if (a.startsWith("--category=")) category = a.substring("--category=".length());
            else {
                System.err.println("Unknown argument: " + a);
                System.exit(2);
            }
        }
        if (out == null) {
            System.err.println("Usage: csv-exporter --out=<path> [--category=<cat>]");
            System.exit(2);
        }

        String url = System.getenv("DATABASE_URL");
        if (url == null || url.isBlank()) {
            System.err.println("DATABASE_URL is not set");
            System.exit(2);
        }

        File outFile = new File(out);
        FileWriter writer = new FileWriter(outFile);

        int written = 0;
        JdbcConfig cfg = JdbcConfig.parse(url);
        try (Connection conn = DriverManager.getConnection(cfg.url, cfg.props)) {
            String sql = "SELECT id, title, description, category, author, "
                    + "upvotes, downvotes, (upvotes - downvotes)::int AS score, "
                    + "created_at FROM bugs"
                    + (category != null ? " WHERE category = ?::category" : "")
                    + " ORDER BY id";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                if (category != null) ps.setString(1, category);
                try (ResultSet rs = ps.executeQuery()) {
                    writer.write(String.join(",", HEADERS));
                    writer.write("\n");
                    while (rs.next()) {
                        writer.write(rs.getInt("id") + ",");
                        writer.write(rs.getString("title") + ",");
                        writer.write(rs.getString("description") + ",");
                        writer.write(rs.getString("category") + ",");
                        writer.write(rs.getString("author") + ",");
                        writer.write(rs.getInt("upvotes") + ",");
                        writer.write(rs.getInt("downvotes") + ",");
                        writer.write(rs.getInt("score") + ",");
                        writer.write(rs.getTimestamp("created_at").toInstant().toString());
                        writer.write("\n");
                        written++;
                    }
                }
            }
        }

        writer.flush();
        System.out.println("Wrote " + written + " row(s) to " + outFile.getAbsolutePath());
    }

    /**
     * Same libpq -> JDBC URL handling used in the leaderboard tool, copied
     * here so this Maven module stays self-contained.
     */
    static final class JdbcConfig {
        final String url;
        final Properties props;

        private JdbcConfig(String url, Properties props) {
            this.url = url;
            this.props = props;
        }

        static JdbcConfig parse(String raw) {
            if (raw.startsWith("jdbc:")) {
                return new JdbcConfig(raw, new Properties());
            }
            URI uri;
            try {
                uri = new URI(raw);
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException("invalid DATABASE_URL: " + e.getMessage());
            }
            String host = uri.getHost();
            if (host == null || host.isEmpty()) {
                throw new IllegalArgumentException(
                        "invalid DATABASE_URL: host is missing (Unix-socket style URLs are not supported)");
            }
            int port = uri.getPort() == -1 ? 5432 : uri.getPort();
            String db = uri.getPath() == null || uri.getPath().isEmpty()
                    ? "" : uri.getPath().substring(1);
            String jdbc = "jdbc:postgresql://" + host + ":" + port + "/" + db;
            Properties props = new Properties();
            String userInfo = uri.getRawUserInfo();
            if (userInfo != null && !userInfo.isEmpty()) {
                int colon = userInfo.indexOf(':');
                if (colon >= 0) {
                    props.setProperty("user",
                            URLDecoder.decode(userInfo.substring(0, colon), StandardCharsets.UTF_8));
                    props.setProperty("password",
                            URLDecoder.decode(userInfo.substring(colon + 1), StandardCharsets.UTF_8));
                } else {
                    props.setProperty("user", URLDecoder.decode(userInfo, StandardCharsets.UTF_8));
                }
            }
            props.setProperty("sslmode", "require");
            return new JdbcConfig(jdbc, props);
        }
    }

    private CsvExporter() {}
}
