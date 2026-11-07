/**
 * Capa de acceso a datos: pool de conexiones MySQL y utilidades.
 * Todas las consultas usan marcadores `?` (consultas parametrizadas, RNF-04).
 */
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env';

export const pool: Pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true, // DATE y DATETIME llegan como 'YYYY-MM-DD'
  decimalNumbers: true, // DECIMAL llega como number (nota_final)
});

/** Un pool o una conexión dentro de una transacción. */
export type Db = Pool | PoolConnection;

export async function select<T>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await (db as Pool).query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function selectOne<T>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await select<T>(db, sql, params);
  return rows[0];
}

export async function execute(db: Db, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await (db as Pool).query<ResultSetHeader>(sql, params);
  return result;
}

/** Ejecuta `fn` dentro de una transacción; hace rollback si algo falla. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** Construye "SET col1 = ?, col2 = ?" sólo con las claves definidas. */
export function setClause(data: Record<string, unknown>): { sql: string; params: unknown[] } {
  const claves = Object.keys(data).filter((k) => data[k] !== undefined);
  return {
    sql: claves.map((k) => `${k} = ?`).join(', '),
    params: claves.map((k) => data[k]),
  };
}
