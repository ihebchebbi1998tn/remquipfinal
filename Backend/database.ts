import mysql from 'mysql2/promise';
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * Database connection pool for REMQUIP backend
 * Handles all MySQL operations with connection pooling
 */

const pool: Pool = mysql.createPool({
  host: 'luccybcdb.mysql.db',
  port: 3306,
  user: 'luccybcdb',
  password: 'Dadouhibou2025',
  database: 'luccybcdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

/**
 * Execute database query with parameters
 */
export async function query(
  sql: string,
  params?: any[]
): Promise<[any[], any[]]> {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.query(sql, params);
    connection.release();
    return [rows, fields];
  } catch (error) {
    console.error('[Database] Query error:', { sql, params, error });
    throw error;
  }
}

/**
 * Execute transaction
 */
export async function transaction<T>(
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('[Database] Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get connection for direct use
 */
export async function getConnection(): Promise<PoolConnection> {
  return pool.getConnection();
}

export const db = {
  query,
  transaction,
  getConnection,
  pool
};
