import { defineConfig } from "wxt";

const webOrigin = new URL(process.env.WXT_PUBLIC_STULOCK_WEB_ORIGIN ?? "http://localhost:3000").origin;

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "StuLock",
    description: "A self-imposed study contract, kept on your device.",
    permissions: ["storage", "tabs", "windows", "idle", "alarms", "sidePanel", "offscreen"],
    host_permissions: [`${webOrigin}/*`],
    action: { default_title: "StuLock" },
    side_panel: { default_path: "sidepanel.html" },
  },
});
