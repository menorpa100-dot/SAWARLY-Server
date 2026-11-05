// Supabase access for this server is implemented with the authenticated Auth REST endpoint
// and server-only PostgREST requests in src/auth.ts and src/support.ts.
// Keep this module dependency-free so TypeScript does not require a client SDK in the server bundle.
export {};
