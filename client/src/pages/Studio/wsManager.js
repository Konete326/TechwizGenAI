export function handleWsClose(event, {
  isCallActiveRef,
  keyIndexRef,
  retryCountRef,
  retryTimerRef,
  setIsConnected,
  setConnectionError,
  keys,
  connectFn,
  disconnectFn
}) {
  setIsConnected(false);
  const reason = (event?.reason || "").toLowerCase();
  const isRateLimit =
    event?.code === 4429 ||
    event?.code === 1011 ||
    reason.includes("429") ||
    reason.includes("quota") ||
    reason.includes("exhausted");

  if (isRateLimit && isCallActiveRef.current) {
    keyIndexRef.current = (keyIndexRef.current + 1) % keys.length;
    retryTimerRef.current = setTimeout(() => {
      if (isCallActiveRef.current) connectFn(true);
    }, 200);
    return;
  }

  if (event?.code !== 1000 && isCallActiveRef.current) {
    const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current) + Math.random() * 500, 15000);
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      if (isCallActiveRef.current) connectFn(true);
    }, delay);
    return;
  }

  if (event?.code !== 1000 && event?.code !== 1005) {
    setConnectionError(event.reason ? String(event.reason).trim() : "Connection closed unexpectedly.");
  }
  disconnectFn();
}
