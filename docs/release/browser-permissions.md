# Browser permission review

The production manifest requests only `storage`, `tabs`, `windows`, `idle`, `alarms`, `sidePanel`, and `offscreen` plus the configured StuLock web origin. It does not request `<all_urls>`, `activeTab`, a manifest `camera` permission, or broad remote host access.

Camera access is requested only after a user redeems a separate, short-lived consent code and starts processing. The extension uses a page address transiently to derive a local category during a self-selected intervention tier; it never stores or syncs page addresses, titles, DOM content, or browsing history.

Before store submission, re-check the generated manifest and complete Chrome Web Store’s Limited Use and single-purpose disclosures with this document and the privacy policy as evidence.
