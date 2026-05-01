package com.bugwall;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

/**
 * Prints the top-N bugs from the Bug Wall database to stdout, ordered by score
 * (upvotes - downvotes) descending.
 *
 * <p>Usage:
 * <pre>
 *   DATABASE_URL=postgresql://... java -jar leaderboard.jar [--limit N] [--category C]
 * </pre>
 */
public final class Leaderboard {

    public static void main(String[] args) throws Exception {
        int limit = 10;
        String category = null;
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--limit": limit = Integer.parseInt(args[++i]); break;
                case "--category": category = args[++i]; break;
                default:
                    System.err.println("Unknown arg: " + args[i]);
                    System.exit(2);
            }
        }
        String url = System.getenv("DATABASE_URL");
        if (url == null || url.isBlank()) {
            System.err.println("DATABASE_URL is not set");
            System.exit(2);
        }
        printLeaderboard(url, category, limit);
    }

    static void printLeaderboard(String url, String category, int limit) throws SQLException {
        JdbcConfig cfg = JdbcConfig.parse(url);
        boolean globalLeaderboard = (category == null || "all".equals(category));
        String sql;
        if (globalLeaderboard) {
            sql = "SELECT id, title, author, category, upvotes, downvotes, "
                + "(upvotes - downvotes) AS score FROM bugs "
                + "ORDER BY score DESC LIMIT ?";
        } else {
            sql = "SELECT id, title, author, category, upvotes, downvotes, "
                + "(upvotes - downvotes) AS score FROM bugs "
                + "WHERE category = ? "
                + "ORDER BY score DESC LIMIT ?";
        }
        try (Connection conn = DriverManager.getConnection(cfg.url, cfg.props);
             java.sql.PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (globalLeaderboard) {
                stmt.setInt(1, limit);
            } else {
                stmt.setString(1, category);
                stmt.setInt(2, limit);
            }
            try (ResultSet rs = stmt.executeQuery()) {
                System.out.printf("%4s  %-9s  %5s  %-20s  %s%n", "rank", "category", "score", "author", "title");
                System.out.println("---------------------------------------------------------------------------");
                int rank = 1;
                while (rs.next()) {
                    System.out.printf("%4d  %-9s  %+5d  %-20s  %s%n",
                            rank++,
                            rs.getString("category"),
                            rs.getInt("score"),
                            "@" + rs.getString("author"),
                            rs.getString("title"));
                }
            }
        }
    }

    /**
     * Same libpq → JDBC URL handling as {@code BulkImport.JdbcConfig}, copied here so the
     * leaderboard tool stays self-contained as a Maven module.
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

    private Leaderboard() {}
}
