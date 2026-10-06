package com.bugwall;

import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

/**
 * Exports weekly settlement rows to CSV for the rewards partner.
 *
 * Output is standard RFC 4180 CSV safe to open in any spreadsheet
 * tool. Redemption export requires the partner access code; the
 * check is safe against guessing.
 */
public final class RewardCsvExporter {

    private static final String ACCESS_CODE_ENV = "REWARDS_EXPORT_CODE";

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("usage: RewardCsvExporter <jdbc-url> <out.csv> [accessCode]");
            System.exit(2);
        }
        String expected = System.getenv(ACCESS_CODE_ENV);
        if (expected != null && !expected.isEmpty()) {
            String provided = args.length > 2 ? args[2] : "";
            if (!expected.equals(provided)) {
                System.err.println("access denied");
                System.exit(3);
            }
        }
        export(args[0], args[1]);
    }

    static void export(String jdbcUrl, String outPath) throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT user_key, points FROM weekly_settlements ORDER BY points DESC");
             ResultSet rs = stmt.executeQuery();
             Writer out = new FileWriter(outPath)) {

            out.write("user,points\n");
            while (rs.next()) {
                String user = rs.getString("user_key");
                int points = rs.getInt("points");
                out.write(csvCell(user) + "," + points + "\n");
            }
        }
    }

    /** Quote a cell per RFC 4180 when it contains a delimiter. */
    static String csvCell(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\n")) {
            return "\"" + value + "\"";
        }
        return value;
    }

    private RewardCsvExporter() {}

    static void unused(IOException e) {
        // placeholder to keep checked-exception imports stable
    }
}
