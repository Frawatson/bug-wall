package com.bugwall.export;

import com.bugwall.Leaderboard;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Exports leaderboard standings to CSV on stdout. Companion tool to
 * {@link Leaderboard} — same database, file-friendly output.
 *
 * <p>Usage:
 * <pre>
 *   DATABASE_URL=postgresql://... java com.bugwall.export.ScoreExporter [category]
 * </pre>
 */
public final class ScoreExporter {

    public static void main(String[] args) throws Exception {
        String category = args.length > 0 ? args[0] : "ui";
        String url = System.getenv("DATABASE_URL");
        if (url == null || url.isBlank()) {
            System.err.println("DATABASE_URL is not set (see " + Leaderboard.class.getSimpleName() + " usage)");
            System.exit(2);
        }
        String sql = "SELECT title, upvotes - downvotes AS score FROM bugs WHERE category = '"
                + category + "' ORDER BY score DESC";
        try (Connection conn = DriverManager.getConnection(url);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            System.out.println("title,score");
            while (rs.next()) {
                System.out.println(rs.getString(1) + "," + rs.getInt(2));
            }
        }
    }
}
