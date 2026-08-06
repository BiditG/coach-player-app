import { pgSchema, uuid } from 'drizzle-orm/pg-core';

// `auth.users` lives in Supabase's own schema and is managed entirely by
// Supabase Auth. We only declare the columns Drizzle needs to resolve the
// cross-schema foreign key from `public.users.id` in schema.ts.
//
// This deliberately lives OUTSIDE schema.ts: `drizzle(client, { schema })`
// (lib/db/drizzle.ts) builds its relational query config from every table
// `schema.ts` exports, and Drizzle's relational query builder keys tables by
// their SQL table name only (not by Postgres schema). Exporting a second
// table also named "users" from schema.ts — even in a different schema —
// collides with `public.users` there and breaks `db.query.*.with` typing.
const authSchema = pgSchema('auth');
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});
