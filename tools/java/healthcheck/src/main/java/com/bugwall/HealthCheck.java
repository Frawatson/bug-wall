package com.bugwall;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Probes the Bug Wall app's /api/health endpoint and exits non-zero on failure.
 * Useful for cron-driven uptime checks or as a Kubernetes liveness probe.
 *
 * <p>Usage:
 * <pre>
 *   java -jar healthcheck.jar https://bug-wall.vercel.app
 *   java -jar healthcheck.jar https://bug-wall.vercel.app 3   # retry up to 3 times
 * </pre>
 */
public final class HealthCheck {

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: healthcheck <base-url> [retries]");
            System.exit(2);
        }
        String base = args[0];
        int retries = args.length >= 2 ? Integer.parseInt(args[1]) : 0;

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base + "/api/health"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        for (int i = 0; i <= retries; i++) {
            try {
                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200) {
                    System.out.println("OK " + resp.body());
                    System.exit(0);
                }
                System.err.println("Attempt " + (i + 1) + " failed: HTTP " + resp.statusCode());
            } catch (Exception e) {
                System.err.println("Attempt " + (i + 1) + " failed: " + e.getMessage());
            }
            if (i < retries) {
                try {
                    Thread.sleep(1000L * (i + 1));
                } catch (InterruptedException ignored) {
                }
            }
        }
        System.err.println("Health check failed after " + (retries + 1) + " attempt(s).");
        System.exit(1);
    }

    private HealthCheck() {}
}
