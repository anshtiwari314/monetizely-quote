import { companiesCol } from "./db";
import { uuidv4 } from "./uuid";

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

function toCompany(doc: { _id: string; name: string; createdAt: string }): Company {
  return { id: doc._id, name: doc.name, createdAt: doc.createdAt };
}

export async function listCompanies(): Promise<Company[]> {
  const col = await companiesCol();
  const docs = await col.find().sort({ name: 1 }).toArray();
  return docs.map(toCompany);
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const col = await companiesCol();
  const doc = await col.findOne({ _id: companyId });
  return doc ? toCompany(doc) : null;
}

export async function createCompany(name: string, id?: string): Promise<string> {
  const companyId = id ?? uuidv4();
  const col = await companiesCol();
  await col.insertOne({
    _id: companyId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });
  return companyId;
}
