import { defineContentScript } from "wxt/utils/define-content-script";

// Reserved for Phase 4. The impossible match keeps it out of real webpages until
// the policy engine and its review flow have passed their own tests.
export default defineContentScript({
  matches: ["*://*.invalid/*"],
  main() {},
});
