//@ts-check
import { logError, logInfo } from "./utils.js";
import { runBackup } from "./index.js"

const intervalSeconds = Number(process.env.BACKUP_INTERVAL);

if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    logError("BACKUP_INTERVAL must be a positive number of seconds.");
    process.exit(1);
}

const intervalMs = intervalSeconds * 1000;

let timer = null;
let isRunning = false;
let shuttingDown = false;

async function tick() {
    if (isRunning) {
        logInfo("Previous backup still in progress, skipping this tick.");
        return;
    }

    if (shuttingDown) return;

    isRunning = true;
    try {
        await runBackup();
    } catch (err) {
        logError(err?.message ?? JSON.stringify(err));
    } finally {
        isRunning = false;
        if (shuttingDown) {
            process.exit(0);
        }
    }
}

function start() {
    logInfo(`Starting periodic backups every ${intervalSeconds}s.`);
    tick(); // run immediately on start
    timer = setInterval(tick, intervalMs);
}

function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;

    logInfo("Shutdown signal received. Stopping scheduler...");

    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    if (!isRunning) {
        process.exit(0);
    }
    // If a backup is in progress, tick() will call process.exit(0) in its finally block.
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
