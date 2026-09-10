import pkg from 'pg';
const { Pool } = pkg;
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const isPostgres = Boolean(process.env.DATABASE_URL);

let pool: any = null;
let sqliteDb: any = null;

if (isPostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: false
  });
} else {
  // Use local SQLite database file
  const dbPath = path.resolve(process.cwd(), 'store.db');
  sqliteDb = new DatabaseSync(dbPath);
}

function convertSqlForPg(sql: string): string {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

export async function runQuery(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  if (isPostgres) {
    let querySql = sql.trim();
    const isInsert = /^INSERT\s+INTO/i.test(querySql);
    const hasReturning = /RETURNING\s+/i.test(querySql);

    if (isInsert && !hasReturning) {
      querySql = `${querySql} RETURNING *`;
    }

    const res = await pool.query(convertSqlForPg(querySql), params);
    const firstRow = res.rows?.[0];
    const lastID = firstRow ? Number(firstRow.id || firstRow.telegram_user_id || 0) : 0;
    return { lastID, changes: res.rowCount || 0 };
  } else {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { lastID: Number(info.lastInsertRowid || 0), changes: Number(info.changes || 0) };
  }
}

export async function allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isPostgres) {
    const res = await pool.query(convertSqlForPg(sql), params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params) as T[];
  }
}

export async function getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  if (isPostgres) {
    const res = await pool.query(convertSqlForPg(sql), params);
    return res.rows[0];
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }
}

let dbInitialized = false;
let initDbPromise: Promise<void> | null = null;

export async function ensureDatabase(): Promise<void> {
  if (dbInitialized) return;
  if (!initDbPromise) {
    initDbPromise = initDatabase()
      .then(() => {
        dbInitialized = true;
      })
      .catch(err => {
        initDbPromise = null;
        throw err;
      });
  }
  return initDbPromise;
}

export async function initDatabase() {
  if (dbInitialized) return;
  console.log(`Running database initialization (Engine: ${isPostgres ? 'PostgreSQL' : 'SQLite Local'})...`);
  
  if (isPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        stock INTEGER DEFAULT 0,
        digital_content TEXT,
        image_url TEXT,
        fake_stock INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        details TEXT NOT NULL,
        instructions TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        telegram_user_id BIGINT,
        telegram_username TEXT,
        telegram_first_name TEXT,
        admin_message_id BIGINT,
        status TEXT DEFAULT 'pending_approval',
        total_price NUMERIC,
        wallet_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        rejection_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        price NUMERIC,
        quantity INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS payment_proofs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER,
        file_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        telegram_user_id BIGINT PRIMARY KEY,
        first_name TEXT,
        username TEXT,
        balance NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'EGP',
        language TEXT DEFAULT 'ar',
        referral_code TEXT,
        referred_by BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS balance_deposits (
        id SERIAL PRIMARY KEY,
        telegram_user_id BIGINT,
        amount NUMERIC,
        wallet_id INTEGER,
        proof_file_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        telegram_bot_token TEXT,
        telegram_admin_chat_id TEXT,
        maintenance_mode BOOLEAN DEFAULT FALSE,
        maintenance_message TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        api_type TEXT DEFAULT 'xprostore',
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        profit_type TEXT DEFAULT 'percentage',
        profit_value NUMERIC DEFAULT 20,
        balance NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'EGP',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS provider_orders (
        id SERIAL PRIMARY KEY,
        order_id INTEGER,
        provider_id INTEGER,
        provider_order_id TEXT,
        provider_service_id TEXT,
        status TEXT DEFAULT 'pending',
        response_data TEXT,
        delivered_items TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bot_sessions (
        telegram_user_id BIGINT PRIMARY KEY,
        session_type TEXT NOT NULL,
        session_data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    try {
      await pool.query(`
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS icon TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_content TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_first_name TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_message_id BIGINT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS fake_stock INTEGER DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS is_provider_service BOOLEAN DEFAULT FALSE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_id INTEGER;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_service_id TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_price NUMERIC;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_fields TEXT;
        ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_message TEXT;

        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (telegram_user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
        CREATE INDEX IF NOT EXISTS idx_products_cat ON products (category_id);
        CREATE INDEX IF NOT EXISTS idx_balance_deposits_user ON balance_deposits (telegram_user_id);
      `);
    } catch (err) {
      // Ignored
    }

    try {
      const adminCheck = await pool.query('SELECT * FROM admin_users LIMIT 1');
      if (!adminCheck.rows || adminCheck.rows.length === 0) {
        await pool.query("INSERT INTO admin_users (username, password) VALUES ('admin', 'admin123')");
      }
    } catch (e) {}
  } else {
    // SQLite Tables
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        digital_content TEXT,
        image_url TEXT,
        fake_stock INTEGER DEFAULT 0,
        is_provider_service INTEGER DEFAULT 0,
        provider_id INTEGER,
        provider_service_id TEXT,
        provider_price REAL,
        custom_fields TEXT
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        details TEXT NOT NULL,
        instructions TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER,
        telegram_username TEXT,
        telegram_first_name TEXT,
        admin_message_id INTEGER,
        status TEXT DEFAULT 'pending_approval',
        total_price REAL,
        wallet_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        rejection_reason TEXT,
        delivered_content TEXT
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        price REAL,
        quantity INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS payment_proofs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        file_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        telegram_user_id INTEGER PRIMARY KEY,
        first_name TEXT,
        username TEXT,
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'EGP',
        language TEXT DEFAULT 'ar',
        referral_code TEXT,
        referred_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS balance_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER,
        amount REAL,
        wallet_id INTEGER,
        proof_file_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        telegram_bot_token TEXT,
        telegram_admin_chat_id TEXT,
        maintenance_mode INTEGER DEFAULT 0,
        maintenance_message TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        api_type TEXT DEFAULT 'xprostore',
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        profit_type TEXT DEFAULT 'percentage',
        profit_value REAL DEFAULT 20,
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'EGP',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS provider_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        provider_id INTEGER,
        provider_order_id TEXT,
        provider_service_id TEXT,
        status TEXT DEFAULT 'pending',
        response_data TEXT,
        delivered_items TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_sessions (
        telegram_user_id INTEGER PRIMARY KEY,
        session_type TEXT NOT NULL,
        session_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      sqliteDb.exec('ALTER TABLE categories ADD COLUMN icon TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE categories ADD COLUMN image_url TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN icon TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE orders ADD COLUMN delivered_content TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE settings ADD COLUMN maintenance_mode INTEGER DEFAULT 0;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE settings ADD COLUMN maintenance_message TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN is_provider_service INTEGER DEFAULT 0;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN provider_id INTEGER;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN provider_service_id TEXT;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN provider_price REAL;');
    } catch (e) {}
    try {
      sqliteDb.exec('ALTER TABLE products ADD COLUMN custom_fields TEXT;');
    } catch (e) {}
  }

  console.log('Database tables verified/created successfully.');
}

let cachedSettings: any = null;
let lastSettingsFetch = 0;

export async function getSettings(forceRefresh = false): Promise<{ 
  telegram_bot_token?: string; 
  telegram_admin_chat_id?: string;
  maintenance_mode?: boolean | number;
  maintenance_message?: string;
}> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && (now - lastSettingsFetch < 30000)) {
    return cachedSettings;
  }
  try {
    const row = await getQuery<any>('SELECT * FROM settings LIMIT 1');
    cachedSettings = row || {};
    lastSettingsFetch = now;
    return cachedSettings;
  } catch (e) {
    return cachedSettings || {};
  }
}

export async function saveSettings(token: string, adminChatId: string) {
  const current = await getSettings();
  const mMode = Boolean(current.maintenance_mode);
  const mMsg = current.maintenance_message || '🛠️ عذراً، البوت قيد الصيانة والتطوير حالياً لتحسين خدماتنا. سنعود للعمل قريباً جداً! 🙏';
  await runQuery('DELETE FROM settings');
  await runQuery('INSERT INTO settings (telegram_bot_token, telegram_admin_chat_id, maintenance_mode, maintenance_message) VALUES (?, ?, ?, ?)', [token, adminChatId, mMode, mMsg]);
  cachedSettings = { telegram_bot_token: token, telegram_admin_chat_id: adminChatId, maintenance_mode: mMode, maintenance_message: mMsg };
  lastSettingsFetch = Date.now();
}

export async function getMaintenanceSettings(forceRefresh = false): Promise<{ maintenance_mode: boolean; maintenance_message: string }> {
  const settings = await getSettings(forceRefresh);
  return {
    maintenance_mode: Boolean(settings?.maintenance_mode),
    maintenance_message: settings?.maintenance_message || '🛠️ عذراً، البوت قيد الصيانة والتطوير حالياً لتحسين خدماتنا. سنعود للعمل قريباً جداً! 🙏'
  };
}

export async function saveMaintenanceSettings(enabled: boolean, message: string) {
  const current = await getSettings();
  const token = current.telegram_bot_token || '';
  const adminChatId = current.telegram_admin_chat_id || '';
  await runQuery('DELETE FROM settings');
  await runQuery('INSERT INTO settings (telegram_bot_token, telegram_admin_chat_id, maintenance_mode, maintenance_message) VALUES (?, ?, ?, ?)', [
    token,
    adminChatId,
    Boolean(enabled),
    message
  ]);
  cachedSettings = { telegram_bot_token: token, telegram_admin_chat_id: adminChatId, maintenance_mode: Boolean(enabled), maintenance_message: message };
  lastSettingsFetch = Date.now();
}

export async function getAdminUser() {
  const row = await getQuery<any>('SELECT * FROM admin_users LIMIT 1');
  if (!row) {
    await runQuery("INSERT INTO admin_users (username, password) VALUES (?, ?)", ['admin', 'admin123']);
    return { username: 'admin', password: 'admin123' };
  }
  return row;
}

export async function saveAdminUser(username: string, password: string) {
  await runQuery('DELETE FROM admin_users');
  await runQuery('INSERT INTO admin_users (username, password) VALUES (?, ?)', [username, password]);
}

export async function getSession(userId: number): Promise<{ type: string; data: any } | null> {
  try {
    const row = await getQuery<any>('SELECT session_type, session_data FROM bot_sessions WHERE telegram_user_id = ?', [userId]);
    if (!row) return null;
    return { type: row.session_type, data: JSON.parse(row.session_data || '{}') };
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}

export async function setSession(userId: number, type: string, data: any): Promise<void> {
  try {
    const dataStr = JSON.stringify(data || {});
    if (isPostgres) {
      await runQuery(`
        INSERT INTO bot_sessions (telegram_user_id, session_type, session_data, updated_at)
        VALUES (?, ?, ?, NOW())
        ON CONFLICT (telegram_user_id) 
        DO UPDATE SET session_type = EXCLUDED.session_type, session_data = EXCLUDED.session_data, updated_at = NOW()
      `, [userId, type, dataStr]);
    } else {
      await runQuery(`
        INSERT INTO bot_sessions (telegram_user_id, session_type, session_data)
        VALUES (?, ?, ?)
        ON CONFLICT(telegram_user_id) DO UPDATE SET session_type = excluded.session_type, session_data = excluded.session_data, updated_at = CURRENT_TIMESTAMP
      `, [userId, type, dataStr]);
    }
  } catch (err) {
    console.error('setSession error:', err);
  }
}

export async function clearSession(userId: number): Promise<void> {
  try {
    await runQuery('DELETE FROM bot_sessions WHERE telegram_user_id = ?', [userId]);
  } catch (err) {
    console.error('clearSession error:', err);
  }
}

