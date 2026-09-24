import { readdir, readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const files = (await readdir(new URL('../migrations/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort();
for (const file of files) await pool.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
await pool.end();
console.log('Database migration complete');