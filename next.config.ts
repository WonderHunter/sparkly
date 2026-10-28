import type { NextConfig } from "next";

// Cache Components est volontairement désactivé : presque toutes les pages lisent
// le cookie de session Supabase, le rendu dynamique classique est plus simple ici.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// En local, le stockage Supabase est servi depuis 127.0.0.1 : Next 16 bloque ces adresses
// par défaut (protection SSRF). On ne lève ce blocage que pour un Supabase local.
const isLocalSupabase = !supabaseUrl || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(supabaseUrl);

const nextConfig: NextConfig = {
  // forbidden() pour afficher une vraie page 403 dans l'admin.
  experimental: {
    authInterrupts: true,
  },
  images: {
    dangerouslyAllowLocalIP: isLocalSupabase,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "img.youtube.com" },
      ...(supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : []),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
