export async function checkMicrophonePermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, error: "Microphone is not supported on this browser" };
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "microphone" });
        if (status.state === "granted") {
          return { granted: true };
        }
        if (status.state === "denied") {
          return {
            granted: false,
            error: "Microphone access is blocked. Please enable microphone permissions in your browser settings."
          };
        }
      } catch {}
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err) {
    const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
    return {
      granted: false,
      error: isDenied
        ? "Microphone access was denied. Please allow microphone access to start the call."
        : "Unable to access microphone. Please check your device audio settings."
    };
  }
}

export default checkMicrophonePermission;
