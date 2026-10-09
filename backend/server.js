const os = require("os");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = 5000;
const app = express();
app.use(cors());

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 3000,
    max: 5,
});

// Idle client errors must not crash the process
pool.on("error", (err) => console.error("pg pool error:", err.message || err.code));

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "backend",
        pod: os.hostname(),
        uptime_s: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/db-check", async (req, res) => {
    const start = Date.now();
    try {
        const { rows } = await pool.query(
            "SELECT version() AS version, now() AS server_time, current_database() AS database"
        );
        res.json({
            status: "connected",
            pod: os.hostname(),
            latency_ms: Date.now() - start,
            database: rows[0].database,
            host: process.env.POSTGRES_HOST || "localhost",
            version: rows[0].version.split(" ").slice(0, 2).join(" "),
            server_time: rows[0].server_time,
        });
    } catch (err) {
        console.error("db-check failed:", err.code || err.message);
        res.status(503).json({
            status: "error",
            latency_ms: Date.now() - start,
            message: err.code || err.message || "Connection failed",
        });
    }
});

const server = app.listen(PORT, "0.0.0.0", () =>
    console.log(`Backend listening on :${PORT}`)
);

// Graceful shutdown for Kubernetes pod termination
const shutdown = () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);