import path from "path";

/** 
 * @param {string} dbPath 
 * @param {string} backupDir 
 */
export async function backupWithDriver(dbPath, backupDir) {
    const formatTime = (ms) => (ms / 1000).toFixed() + "s";
    const { default: Database } = await import('better-sqlite3');
    const start = performance.now();
    const source = new Database(dbPath, { readonly: true });
    const backupFilePath = path.join(backupDir, `db_bkp_${Date.now()}.db`);
    await source.backup(backupFilePath);
    source.close();
    const backupEnd = performance.now();
    logDebug(`Database backup completed in ${formatTime(backupEnd - start)}`);
    return backupFilePath;
}


const dbPath = process.env.REMED_DB_PATH ?? "./test.db";
const backupDir = process.env.REMED_BACKUPS_DIR || "./backups";


backupWithDriver(dbPath, backupDir).catch((e) => console.error(e));