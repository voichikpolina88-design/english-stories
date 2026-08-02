import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  return {
    plugins: [react() as PluginOption],
    define: {
      "import.meta.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    },
    build: {
      target: "es2018",
    },
  };
});
