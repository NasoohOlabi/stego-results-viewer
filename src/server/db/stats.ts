import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'stats.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
	CREATE TABLE IF NOT EXISTS file_stats (
		file_path TEXT PRIMARY KEY,
		path_id TEXT NOT NULL,
		mtime INTEGER NOT NULL,
		processed_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS post_stats (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		file_path TEXT NOT NULL,
		path_id TEXT NOT NULL,
		bits REAL,
		ratio REAL,
		angles INTEGER,
		comment_chain INTEGER,
		warnings INTEGER,
		used_dict INTEGER,
		FOREIGN KEY(file_path) REFERENCES file_stats(file_path) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_file_stats_path_id ON file_stats(path_id);
	CREATE INDEX IF NOT EXISTS idx_post_stats_file_path ON post_stats(file_path);
	CREATE INDEX IF NOT EXISTS idx_post_stats_path_id ON post_stats(path_id);
`);

export { db };
