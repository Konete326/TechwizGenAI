import { ALLOWED_ROUTES } from "./nesaToolGuards";

export const NESA_TARGET_KEYS = [
  "nav_dashboard", "nav_studio", "nav_assets", "nav_analytics", "nav_settings", "nav_profile",
  "sidebar_toggle", "theme_toggle", "user_menu", "logout_btn", "new_chat", "chat_input",
  "chat_send", "chat_mic", "chat_attach", "chat_history_btn", "model_selector", "persona_selector",
  "clear_chat_btn", "export_chat_btn", "upload_btn", "delete_asset", "preview_asset",
  "asset_search", "asset_filter_all", "asset_filter_images", "asset_filter_documents",
  "analytics_refresh_btn", "settings_save_btn", "settings_profile_tab", "settings_security_tab",
  "modal_confirm_btn", "modal_close_btn", "field_name", "field_bio", "field_email", "field_title", "field_role"
];

export const NESA_TOOL_DECLARATIONS = [
  {
    name: "navigatePage",
    description: "Navigate to a specific platform route or view such as assets, analytics, dashboard, studio, or settings.",
    parameters: { type: "OBJECT", properties: { route: { type: "STRING", enum: ALLOWED_ROUTES, description: "Target route, must be one of the allowed app routes" } }, required: ["route"] }
  },
  {
    name: "spotlightElement",
    description: "Highlight or spotlight an on-screen UI element with guidance text.",
    parameters: {
      type: "OBJECT",
      properties: { targetKey: { type: "STRING", enum: NESA_TARGET_KEYS, description: "Exact target key to highlight." }, label: { type: "STRING", description: "Short guidance text" } },
      required: ["targetKey"]
    }
  },
  {
    name: "clickElement",
    description: "Clicks, activates, or triggers any button, tab, link, or interactive control on the current screen.",
    parameters: {
      type: "OBJECT",
      properties: { targetKey: { type: "STRING", enum: NESA_TARGET_KEYS, description: "Exact target identifier of the button or control to click." } },
      required: ["targetKey"]
    }
  },
  {
    name: "fillFormField",
    description: "Fills or updates a text input, textarea, or form field on the current screen with a specified value.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetKey: { type: "STRING", description: "Target field identifier (e.g. field_name, field_bio, field_email, field_title)" },
        value: { type: "STRING", description: "The text value to enter into the field" }
      },
      required: ["targetKey", "value"]
    }
  },
  {
    name: "controlSidebar",
    description: "Controls the application sidebar state. Open, close, or toggle the sidebar drawer on mobile and desktop.",
    parameters: { type: "OBJECT", properties: { action: { type: "STRING", enum: ["open", "close", "toggle"], description: "open, close, or toggle" } }, required: ["action"] }
  },
  {
    name: "repositionWidget",
    description: "Change the layout position or minimize the floating Nesa voice interface.",
    parameters: { type: "OBJECT", properties: { position: { type: "STRING", description: "Target dock: top-left, top-right, bottom-left, bottom-right, minimize, maximize" } }, required: ["position"] }
  },
  {
    name: "openDynamicModal",
    description: "Trigger and open a dynamic modal dialog in the application.",
    parameters: {
      type: "OBJECT",
      properties: {
        modalType: { type: "STRING", description: "upload_asset, text_note, translation, input_prompt, logout_confirm" },
        title: { type: "STRING", description: "Modal title" },
        content: { type: "STRING", description: "Rich text explanation, translation, or prompt details" },
        inputPlaceholder: { type: "STRING", description: "Placeholder text for input field" }
      },
      required: ["modalType"]
    }
  },
  {
    name: "closeModal",
    description: "Dismiss or close any active modal popup or dynamic dialog.",
    parameters: { type: "OBJECT", properties: { reason: { type: "STRING", description: "Optional dismissal reason" } } }
  },
  {
    name: "executeLogout",
    description: "Terminates user session, clears auth tokens, and redirects to login page. Only invoke AFTER user explicitly confirms the logout warning.",
    parameters: { type: "OBJECT", properties: {} }
  },
];