import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readServerEnv } from "@/server/env";
import * as schema from "./schema";

const globalDatabase = globalThis as typeof globalThis & { sinapsePool?: Pool };

const pool = globalDatabase.sinapsePool ?? new Pool({ connectionString: readServerEnv().DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalDatabase.sinapsePool = pool;

export const db = drizzle(pool, { schema });
export { pool };
export type Database = typeof db;
