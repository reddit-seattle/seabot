import Database from 'better-sqlite3';
import { Environment } from '../utils/constants';

const dbPath = process.env.NODE_ENV === 'production' ? Environment.telemetryDbPath : './telemetry.db';
const db = new Database(dbPath);

export default db;
