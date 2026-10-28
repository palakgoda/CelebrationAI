/**
 * CelebrationAI API Client
 * Robust fetch wrappers with timeout, error handling, and offline resilience.
 */

const API_BASE = "/api";
const TIMEOUT_MS = 15000;

async function requestWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    // Parse JSON
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { error: "Non-JSON response from server" };
    }

    if (!response.ok) {
      const errorMsg =
        data.detail ||
        data.error ||
        (Array.isArray(data.detail) ? data.detail.map((e) => e.msg).join(", ") : "Request failed");
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const timeoutErr = new Error("The request took too long to respond. Please check your connection and retry.");
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw error;
  }
}

export async function fetchHealth() {
  return await requestWithTimeout(`${API_BASE}/health`, { method: "GET" });
}

export async function generatePlan(planPayload) {
  return await requestWithTimeout(`${API_BASE}/plan`, {
    method: "POST",
    body: JSON.stringify(planPayload),
  });
}

export async function sendChatMessage(message, planContext = {}, history = []) {
  return await requestWithTimeout(`${API_BASE}/chat`, {
    method: "POST",
    body: JSON.stringify({
      message,
      plan_context: planContext,
      history,
    }),
  });
}
