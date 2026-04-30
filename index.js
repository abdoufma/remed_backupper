//@ts-check
import { join, basename, posix } from "node:path";
import { logDebug, logError } from "./utils.js";

import { createReadStream, createWriteStream, unlinkSync } from 'fs';
import { createGzip, } from 'node:zlib';
import SftpClient from 'ssh2-sftp-client';
import { existsSync } from "node:fs";

/** 
 * @param {string} dbPath 
 * @param {string} backupDir 
 * @param {import("node:zlib").ZlibOptions?} gzipOptions
 */
export async function backupWithDriver(dbPath, backupDir, gzipOptions) {
    const formatTime = (ms) => (ms / 1000).toFixed() + "s";
    const { default: Database } = await import('better-sqlite3');
    const start = performance.now();
    const source = new Database(dbPath, { readonly: true });
    const backupFilePath = join(backupDir, `db_bkp_${Date.now()}.db`);
    await source.backup(backupFilePath);
    source.close();
    const backupEnd = performance.now();
    logDebug(`Database backup completed in ${formatTime(backupEnd - start)}`);
    
    if (gzipOptions) {
        const gzipPath = `${backupFilePath}.gz`;
        await gzipFile(backupFilePath, gzipPath, gzipOptions);
        const compressionEnd = performance.now();
        logDebug(`Backup compression completed in ${formatTime(compressionEnd - backupEnd)}`);
        return gzipPath;
    }

    return backupFilePath;
}                       

/**
 * @param {string} tmpPath 
 * @param {string} gzipPath 
 * @param {import("node:zlib").ZlibOptions | undefined} gzipOptions
 */

function gzipFile(tmpPath, gzipPath, gzipOptions){
    const input = createReadStream(tmpPath);
    const gzip = createGzip(gzipOptions);
    const output = createWriteStream(gzipPath);

    return new Promise((resolve, reject) => {
        input.pipe(gzip).pipe(output)
        .on('finish', () => {
            unlinkSync(tmpPath);
            resolve("G-zipping done!")
        })
        .on('error', reject);
    })
}


/** @param {string} sourceFile  */
async function uploadFileToFTPServer(sourceFile) {
    const sftp = new SftpClient();
    
    const config = {
      host: process.env.FTP_HOST,
      port: Number(process.env.FTP_PORT ?? 21),
      username: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    };
  
    try {
      await sftp.connect(config);
      console.log('Connected to SFTP server successfully!\n');
      
      // Upload with progress tracking
      const remoteDir = process.env.REMOTE_BACKUP_DIR ?? '/home/remedchu/ftp/data/';
      console.log('Connected.');
  
      const localFile = sourceFile;
      const remoteFile= posix.join(remoteDir, basename(sourceFile)) ;
      
  
      let uploaded = 0;
      
      await sftp.fastPut(localFile, remoteFile, {
        step: (totalTransferred, chunk, total) => {
          uploaded = totalTransferred;
          const percent = ((uploaded / total) * 100).toFixed(2);
          const mbTransferred = (uploaded / (1024 * 1024)).toFixed(2);
          const mbTotal = (total / (1024 * 1024)).toFixed(2);
          
          // Create progress bar
          const barLength = 40;
          const filled = Math.round((uploaded / total) * barLength);
          const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
          
          process.stdout.write(`\r[${bar}] ${percent}% (${mbTransferred}MB / ${mbTotal}MB)`);
        }
      });
      
      console.log('\n\nUpload completed successfully!');
    } catch (err) {
     throw new Error(`[SFTP ERROR] ${err.message}`, {cause : err.cause})
    } finally {
      await sftp.end();
      console.log('Connection closed');
    }
  }



(async function main() {
    try {
        const dbPath = process.env.REMED_DB_PATH;
        if (!dbPath || !existsSync(dbPath)) { logError(`Database Path '${dbPath}' does not exist. Exitting.`); process.exit(1); }
        const backupDir = process.env.REMED_BACKUPS_DIR;
        if (!backupDir || !existsSync(backupDir)) { logError(`Backup Dir '${backupDir}' does not exist. Exitting.`); process.exit(1); }
        const dbBackupFile = await backupWithDriver(dbPath, backupDir, {level : 1});
        await uploadFileToFTPServer(dbBackupFile)
    } catch (err) {
        logError(err?.message ?? JSON.stringify(err));
        process.exit(1);
    }
})()