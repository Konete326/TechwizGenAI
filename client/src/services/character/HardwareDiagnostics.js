/**
 * HardwareDiagnostics — Real-time WebGL, GPU, and Hardware Capability Assessment.
 *
 * Requirements:
 * - Detects WebGL 1.0 / WebGL 2.0 availability.
 * - Queries GPU vendor and renderer information via WEBGL_debug_renderer_info (when allowed by browser privacy).
 * - Distinguishes between:
 *   1. WebGL unavailable
 *   2. WebGL available with integrated graphics
 *   3. Hardware acceleration available
 *   4. Dedicated GPU info available (NVIDIA, AMD, Apple Silicon)
 *   5. Browser privacy masked GPU info (honestly reported)
 *   6. WebGL context lost
 * - Measures runtime FPS and recommends optimal pixel ratio & quality tier.
 */

export const GPU_TIERS = {
  UNAVAILABLE: "UNAVAILABLE",
  INTEGRATED: "INTEGRATED",
  DEDICATED: "DEDICATED",
  HARDWARE_ACCELERATED_GENERIC: "HARDWARE_ACCELERATED_GENERIC",
  SOFTWARE_EMULATED: "SOFTWARE_EMULATED",
};

class HardwareDiagnosticsClass {
  constructor() {
    this._cachedReport = null;
    this._fpsHistory = [];
    this._lastFrameTime = performance.now();
    this._currentFps = 60;
  }

  /**
   * Run a comprehensive diagnostic check of the client's GPU & WebGL environment.
   * @returns {object} Diagnostic report
   */
  checkCapabilities() {
    if (this._cachedReport) return this._cachedReport;

    const report = {
      webglAvailable: false,
      webgl2Available: false,
      tier: GPU_TIERS.UNAVAILABLE,
      vendor: "Unknown",
      renderer: "Unknown",
      isDedicated: false,
      isHardwareAccelerated: false,
      isPrivacyMasked: false,
      recommendedPixelRatio: 1.5,
      maxTextureSize: 0,
      maxAnisotropy: 1,
      warnings: [],
      diagnosticMessage: "",
    };

    // 1. Test Canvas & WebGL Creation
    const canvas = document.createElement("canvas");
    let gl = null;

    try {
      gl = canvas.getContext("webgl2");
      if (gl) report.webgl2Available = true;
    } catch (_) {}

    if (!gl) {
      try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      } catch (_) {}
    }

    if (!gl) {
      report.webglAvailable = false;
      report.tier = GPU_TIERS.UNAVAILABLE;
      report.diagnosticMessage = "WebGL is not supported or is disabled in your browser. Falling back to Voice-Only mode.";
      this._cachedReport = report;
      return report;
    }

    report.webglAvailable = true;

    // 2. Query GPU Parameters
    try {
      report.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

      const extAniso = gl.getExtension("EXT_texture_filter_anisotropic") ||
                        gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
      if (extAniso) {
        report.maxAnisotropy = gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
      }

      const dbgExt = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbgExt) {
        report.vendor = gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) || "Unknown";
        report.renderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) || "Unknown";
      } else {
        report.vendor = gl.getParameter(gl.VENDOR) || "Generic";
        report.renderer = gl.getParameter(gl.RENDERER) || "Generic";
        report.isPrivacyMasked = true;
      }
    } catch (err) {
      report.warnings.push(`Could not query extended GL info: ${err.message}`);
    } finally {
      // Clean up test context
      const loseExt = gl.getExtension("WEBGL_lose_context");
      if (loseExt) loseExt.loseContext();
    }

    // 3. Classify GPU Tier
    const rLower = report.renderer.toLowerCase();
    const vLower = report.vendor.toLowerCase();

    if (rLower.includes("swiftshader") || rLower.includes("llvmpipe") || rLower.includes("software")) {
      report.tier = GPU_TIERS.SOFTWARE_EMULATED;
      report.isHardwareAccelerated = false;
      report.recommendedPixelRatio = 1.0;
      report.diagnosticMessage = "Software rasterizer detected (no GPU hardware acceleration). Reduced quality mode active.";
    } else if (
      rLower.includes("nvidia") || rLower.includes("geforce") || rLower.includes("rtx") || rLower.includes("gtx") ||
      rLower.includes("radeon") || rLower.includes("rx ") ||
      rLower.includes("apple m") || (vLower.includes("apple") && !rLower.includes("software"))
    ) {
      report.tier = GPU_TIERS.DEDICATED;
      report.isDedicated = true;
      report.isHardwareAccelerated = true;
      report.recommendedPixelRatio = Math.min(window.devicePixelRatio || 1, 2.0);
      report.diagnosticMessage = `High-performance GPU detected (${report.renderer}). Full fidelity rendering active.`;
    } else if (rLower.includes("intel") || rLower.includes("uhd") || rLower.includes("iris") || rLower.includes("hd graphics")) {
      report.tier = GPU_TIERS.INTEGRATED;
      report.isDedicated = false;
      report.isHardwareAccelerated = true;
      report.recommendedPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      report.diagnosticMessage = `Integrated graphics detected (${report.renderer}). Balanced high-quality mode active.`;
    } else if (report.isPrivacyMasked || rLower.includes("angle") || rLower.includes("direct3d") || rLower.includes("opengl")) {
      report.tier = GPU_TIERS.HARDWARE_ACCELERATED_GENERIC;
      report.isHardwareAccelerated = true;
      report.isPrivacyMasked = true;
      report.recommendedPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      report.diagnosticMessage = `Hardware acceleration active. Specific GPU name is masked by browser privacy (${report.renderer}).`;
    } else {
      report.tier = GPU_TIERS.HARDWARE_ACCELERATED_GENERIC;
      report.isHardwareAccelerated = true;
      report.recommendedPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      report.diagnosticMessage = "Hardware acceleration active.";
    }

    this._cachedReport = report;
    return report;
  }

  /**
   * Monitor frame rate on each render tick.
   * @param {number} now
   */
  tick(now = performance.now()) {
    const delta = now - this._lastFrameTime;
    this._lastFrameTime = now;
    if (delta > 0) {
      const fps = 1000 / delta;
      this._fpsHistory.push(fps);
      if (this._fpsHistory.length > 60) this._fpsHistory.shift();

      const sum = this._fpsHistory.reduce((a, b) => a + b, 0);
      this._currentFps = Math.round(sum / this._fpsHistory.length);
    }
  }

  getCurrentFps() {
    return this._currentFps;
  }
}

const HardwareDiagnostics = new HardwareDiagnosticsClass();
export default HardwareDiagnostics;
