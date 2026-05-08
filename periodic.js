//@ts-check
import { spawn } from "node:child_process";
import { logError, logInfo } from "./utils.js";

const intervalSeconds = Number(process.env.BACKUP_INTERVAL);

if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    logError("BACKUP_INTERVAL must be a positive number of seconds.");
    process.exit(1);
}

const intervalMs = intervalSeconds * 1000;
let stopping = false;
let activeChild = null;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function runBackupOnce() {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, ["index.js"], {
            env: process.env,
            stdio: "inherit",
        });

        activeChild = child;

        child.on("error", (err) => {
            logError(err);
            resolve(1);
        });

        child.on("close", (code, signal) => {
            activeChild = null;

            if (signal) {
                logError(`Backup process exited from signal ${signal}.`);
                resolve(1);
                return;
            }

            resolve(code ?? 1);
        });
    });
}

function stop(signal) {
    stopping = true;

    if (activeChild) {
        activeChild.kill(signal);
    }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

while (!stopping) {
    const exitCode = await runBackupOnce();

    if (exitCode !== 0) {
        logError(`Backup run failed with exit code ${exitCode}.`);
    }

    if (!stopping) {
        logInfo(`Waiting ${intervalSeconds}s before next backup run.`);
        await wait(intervalMs);
    }
}
