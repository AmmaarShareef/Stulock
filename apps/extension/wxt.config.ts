import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "StuLock",
    description: "A self-imposed study contract, kept on your device.",
    permissions: ["storage", "tabs", "windows", "idle", "offscreen", "sidePanel"],
    action: { default_title: "StuLock" },
    side_panel: { default_path: "sidepanel.html" },
  },
});
