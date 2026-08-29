/** Shared between the server-only loader and client components -- no
 * "server-only" import here so client components can pull these in
 * without dragging the loader (and its Supabase server client) into the
 * browser bundle. */
export const ZONE_OF_INVESTMENT_MIN_MAPPED = 10;
export const ZONE_OF_INVESTMENT_MAX_MAPPED = 12;
