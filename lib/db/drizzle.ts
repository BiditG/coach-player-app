import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Copy .env.example to .env and fill in your database connection string (see README → Getting Started).'
  );
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema });
