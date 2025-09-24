import { createKysely } from "@vercel/postgres-kysely";

import type { DB } from "./prisma/types";

export { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export * from "./prisma/types";
export * from "./prisma/enums";

// Lazy initialization to prevent build-time database connections
let _db: ReturnType<typeof createKysely<DB>> | null = null;

export const db = new Proxy({} as ReturnType<typeof createKysely<DB>>, {
  get(_, prop) {
    if (!_db) {
      if (!process.env.POSTGRES_URL) {
        throw new Error(
          'POSTGRES_URL is required but not provided. Please set the POSTGRES_URL environment variable.'
        );
      }
      _db = createKysely<DB>();
    }
    return _db[prop as keyof typeof _db];
  }
});
