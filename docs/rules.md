# Project Rules
This document contains strict coding and formatting rules that any AI Agent MUST follow during development. These rules are mandatory to prevent common AI mistakes and ensure scalable architecture.

## 1. Modular Architecture & File Size Limits
* **Strict Structural Organization:** Work must follow the existing folder structures strictly (Client and Server). Everything must be appropriately categorized (e.g., proper routes, proper models, proper controllers).
* **Frontend Components:** Always split frontend code into proper, reusable React components. Never write massive components or files containing 1200-1300 lines of code. Every distinct UI part should be its own component.
* **Server File Organization:** Backend logic must be properly divided into specific files. As a general rule, a single server file **should not exceed 120 lines**. Only exceed this limit if absolutely necessary and unavoidable.

## 2. Fully Functional & Secure Implementations
* **No Dummy Code:** Everything you implement must be **properly functional**. Do not use dummy data, placeholder functions, or fake UI elements.
* **Security & Stability:** Ensure that there are absolutely no security vulnerabilities or logical issues in the code. Code must be safe and production-ready to prevent future breaks.

## 3. Clean Code Requirements
* **No Comments:** Absolutely **no comments** should be written in the generated code.

## 4. UI & Design Standards
* **Professional Icons:** Do not use generic icons that look "AI-generated" or amateurish. Ensure all icons and UI aesthetics feel professional and premium.

## 5. Proactive Suggestions & Issue Reporting
* **End of Task Reports:** After finishing any task, the Agent MUST suggest related new features or improvements.
* **Troubleshooting Suggestions:** If the Agent spots a potential issue in the codebase or a flaw that could cause problems in the future, it MUST report it and suggest how to fix it immediately.

## 6. Dependencies & Installations
* **Latest Versions Only:** Every package, library, or framework installed (such as React, Node.js, Express.js, Tailwind CSS, etc.) MUST ALWAYS be downloaded/installed in its latest available stable version. This applies strictly to all future dependencies and installations as well.
## 7. Interaction Standards
* **No Native Alerts:** Never use native browser `alert()` or `confirm()` dialogs. Always implement professional, theme-aware **Custom Modals** or **Alert Dialogs** for user confirmations and warnings.
