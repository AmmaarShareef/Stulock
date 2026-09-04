// THE BACK OFFICE. Runs the session, owns all truth, decides everything.
// Chrome kills this when idle - persist the XState snapshot to chrome.storage.session
// on every transition and rehydrate on wake.
// Listens: chrome.tabs.onActivated, chrome.windows.onFocusChanged, chrome.idle.
// Spec: 03, 05.
