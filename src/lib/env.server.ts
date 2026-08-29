import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/**
 * Server-only secrets. The `server-only` import makes bundling this into a
 * client component a build-time error, so the service-role key can never
 * silently end up in a browser bundle (task instructions section 12).
 */
export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
