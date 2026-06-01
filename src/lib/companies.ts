import { randomUUID } from "crypto";
import { execute, queryAll, queryOne } from "./db";

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export async function listCompanies(): Promise<Company[]> {
  return queryAll<Company>(
    `SELECT id, name, created_at as createdAt FROM companies ORDER BY name ASC`
  );
}

export async function getCompany(companyId: string): Promise<Company | null> {
  return queryOne<Company>(
    `SELECT id, name, created_at as createdAt FROM companies WHERE id = ?`,
    [companyId]
  );
}

export async function createCompany(name: string, id?: string): Promise<string> {
  const companyId = id ?? randomUUID();
  await execute(`INSERT INTO companies (id, name) VALUES (?, ?)`, [
    companyId,
    name.trim(),
  ]);
  return companyId;
}
