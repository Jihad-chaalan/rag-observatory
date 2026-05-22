import { sendHeartbeat } from "./api";

let heartbeatInterval = null;

/**
 * Start sending heartbeat every `intervalMs` milliseconds.
 * Clears any existing interval before starting.
 * @param {number} intervalMs - default 30000 (30 seconds)
 */
export function startHeartbeat(intervalMs = 30000) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  // Send immediately, then every interval
  sendHeartbeat();
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, intervalMs);
}

/**
 * Stop sending heartbeat.
 */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
