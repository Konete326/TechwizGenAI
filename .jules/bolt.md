## 2024-05-18 - Non-blocking DOM analysis in Nisa SDK
**Learning:** The synchronous traversal of nodes (`document.querySelectorAll`) in `_analyzeDOM` can block the host site's main thread on large websites, causing UI jank since it's injected into the client's page.
**Action:** Use `requestIdleCallback` (with a `setTimeout` fallback) to yield execution back to the browser, processing the node lists in manageable chunks based on available idle time (or small execution limits).
