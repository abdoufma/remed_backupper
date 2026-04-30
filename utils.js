import chalk from "chalk";

const DEBUG_ENABLED =
    process.env.DEBUG === "1" ||
    process.env.DEBUG === "true" ||
    process.env.NODE_ENV !== "production";

/**
 * @param {string} message
 */
export function logDebug(message) {
    if (!DEBUG_ENABLED) return;

    const time = new Date().toISOString();
    console.debug(chalk.gray(`[debug ${time}]`), chalk.cyan(message));
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
