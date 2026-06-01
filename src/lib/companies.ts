import { randomUUID } from "crypto";
import { getDb } from "./db";

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export function listCompanies(): Company[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, created_at as createdAt FROM companies ORDER BY name ASC`
    )
    .all() as Company[];
}

export function getCompany(companyId: string): Company | null {
  const db = getDb();
  return (
    (db
      .prepare(`SELECT id, name, created_at as createdAt FROM companies WHERE id = ?`)
      .get(companyId) as Company | undefined) ?? null
  );
}

export function createCompany(name: string): string {
  const db = getDb();
  const id = randomUUID();
  db.prepare(`INSERT INTO companies (id, name) VALUES (?, ?)`).run(id, name.trim());
  return id;
}
