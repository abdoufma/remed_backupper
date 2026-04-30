//@ts-check
import chalk from "chalk";

const DEBUG_ENABLED =
    process.env.DEBUG === "1" ||
    process.env.DEBUG === "true" ||
    process.env.NODE_ENV !== "production";

/** @param {Array<string>} message */
export function logDebug(...message) {
    if (!DEBUG_ENABLED) return;

    const time = new Date().toISOString();
    console.debug(chalk.gray(`[DEBUG ${time}]`), chalk.cyan(...message));
}

/** @param {Array<string>} message */
export function logSuccess(...message) {
    if (!DEBUG_ENABLED) return;

    const time = new Date().toISOString();
    console.debug(chalk.gray(`[DEBUG ${time}]`), chalk.green(...message));
}

/** @param {Array<string>} message */
export function logInfo(...message) {
    if (!DEBUG_ENABLED) return;

    const time = new Date().toISOString();
    console.debug(chalk.gray(`[DEBUG ${time}]`), chalk.white(...message));
}

/**
 * @param {unknown} error
 */
export function logError(error) {
    const time = new Date().toISOString();
    const normalizedError =
        error instanceof Error
            ? error.stack || error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error);

    console.error(chalk.gray(`[error ${time}]`), chalk.red(normalizedError));
}
