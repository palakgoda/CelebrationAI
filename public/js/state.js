/**
 * CelebrationAI State Management
 * Handles application state, local storage persistence for vendor checklists,
 * and realistic sample datasets for instant demoing.
 */

const STORAGE_KEY_CHECKLIST = "celebration_ai_checklist_v1";
const STORAGE_KEY_LAST_PLAN = "celebration_ai_last_plan_v1";
export const STORAGE_KEY_EVENTS = "celebration_ai_events_v2";
export const STORAGE_KEY_BIN = "celebration_ai_bin_v2";
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const state = {
  activeEventType: "wedding",
  currentPlan: null,
  currentEventId: null,
  isLoading: false,
  error: null,
  activeTab: "budget", // "budget" | "timeline" | "vendors" | "ideas"
  checkedVendors: new Set(),
  chatOpen: false,
  chatMessages: [],
  isChatLoading: false,
};

// Load saved checklist checkboxes from localStorage
export function loadSavedChecklist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKLIST);
    if (raw) {
      const arr = JSON.parse(raw);
      state.checkedVendors = new Set(arr);
    }
  } catch (e) {
    console.warn("Could not load checklist from localStorage", e);
  }
}

// Persist checklist checkboxes
export function toggleVendorTask(taskId) {
  if (state.checkedVendors.has(taskId)) {
    state.checkedVendors.delete(taskId);
  } else {
    state.checkedVendors.add(taskId);
  }
  try {
    localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify([...state.checkedVendors]));
  } catch (e) {
    console.warn("Could not persist checklist", e);
  }
}

// Check if a task is checked
export function isVendorTaskChecked(taskId) {
  return state.checkedVendors.has(taskId);
}

// Dispatch custom event to sync navbar badge and open modals
export function notifyEventsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("celebration_events_updated"));
  }
}

// Get all active saved events
export function getSavedEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not load events from localStorage", e);
  }

  // Fallback / migration from legacy single last plan
  try {
    const legacy = localStorage.getItem(STORAGE_KEY_LAST_PLAN);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed) {
        const migrated = [createEventRecord(parsed, "evt_migrated_" + Date.now())];
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (e) {
    // ignore
  }

  return [];
}

// Get Recycle Bin events with automatic 30-day expiration purge
export function getBinEvents() {
  let binItems = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BIN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) binItems = parsed;
    }
  } catch (e) {
    console.warn("Could not load bin events", e);
    return [];
  }

  // Auto-purge any items older than 30 days
  const now = Date.now();
  const validItems = binItems.filter((item) => {
    if (!item.deletedAt) return false;
    const age = now - item.deletedAt;
    return age <= THIRTY_DAYS_MS;
  });

  // If expired items were removed, save cleaned bin
  if (validItems.length !== binItems.length) {
    try {
      localStorage.setItem(STORAGE_KEY_BIN, JSON.stringify(validItems));
    } catch (e) {
      // ignore
    }
  }

  return validItems;
}

// Calculate days remaining before permanent deletion
export function getDaysRemainingInBin(deletedAt) {
  if (!deletedAt) return 0;
  const now = Date.now();
  const msLeft = (deletedAt + THIRTY_DAYS_MS) - now;
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

// Helper to format an event record
function createEventRecord(plan, id) {
  const eventName = plan.event_type
    ? plan.event_type.charAt(0).toUpperCase() + plan.event_type.slice(1)
    : "Celebration";
  return {
    id: id || plan._id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: `${plan.city || "My"} ${eventName} Master Plan`,
    event_type: plan.event_type || "wedding",
    date: plan.date || "",
    city: plan.city || "",
    guest_count: plan.guest_count || 0,
    total_budget: plan.total_budget || 0,
    total_budget_formatted: plan.total_budget_formatted || `₹${Number(plan.total_budget || 0).toLocaleString("en-IN")}`,
    createdAt: plan._createdAt || new Date().toISOString(),
    plan: plan,
  };
}

// Save or update plan in storage
export function savePlanToStorage(plan, customId = null) {
  const id = customId || plan._id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  plan._id = id;
  plan._createdAt = plan._createdAt || new Date().toISOString();

  state.currentPlan = plan;
  state.currentEventId = id;

  const record = createEventRecord(plan, id);
  const events = getSavedEvents();
  const existingIdx = events.findIndex((e) => e.id === id);

  if (existingIdx >= 0) {
    events[existingIdx] = record;
  } else {
    events.unshift(record);
  }

  try {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    localStorage.setItem(STORAGE_KEY_LAST_PLAN, JSON.stringify(plan));
  } catch (e) {
    console.warn("Could not save event to storage", e);
  }

  notifyEventsUpdated();
  return record;
}

// Move an active event into the Recycle Bin (30-day retention)
export function moveToBin(eventId) {
  const events = getSavedEvents();
  const targetIdx = events.findIndex((e) => e.id === eventId);
  let targetEvent = null;

  if (targetIdx >= 0) {
    targetEvent = events[targetIdx];
    events.splice(targetIdx, 1);
  } else if (state.currentPlan && (state.currentEventId === eventId || state.currentPlan._id === eventId)) {
    targetEvent = createEventRecord(state.currentPlan, eventId);
  }

  if (!targetEvent) return null;

  targetEvent.deletedAt = Date.now();
  const bin = getBinEvents();
  bin.unshift(targetEvent);

  try {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    localStorage.setItem(STORAGE_KEY_BIN, JSON.stringify(bin));
  } catch (e) {
    console.warn("Could not update storage during moveToBin", e);
  }

  // If this was the currently displayed plan, clear it
  if (state.currentEventId === eventId || (state.currentPlan && state.currentPlan._id === eventId)) {
    clearPlan();
  }

  notifyEventsUpdated();
  return targetEvent;
}

// Restore an event from the Recycle Bin back to active events
export function restoreFromBin(eventId, makeCurrent = true) {
  const bin = getBinEvents();
  const targetIdx = bin.findIndex((e) => e.id === eventId);
  if (targetIdx < 0) return null;

  const restoredEvent = bin[targetIdx];
  bin.splice(targetIdx, 1);
  delete restoredEvent.deletedAt;

  const events = getSavedEvents();
  events.unshift(restoredEvent);

  try {
    localStorage.setItem(STORAGE_KEY_BIN, JSON.stringify(bin));
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  } catch (e) {
    console.warn("Could not update storage during restoreFromBin", e);
  }

  if (makeCurrent && restoredEvent.plan) {
    state.currentPlan = restoredEvent.plan;
    state.currentEventId = restoredEvent.id;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PLAN, JSON.stringify(restoredEvent.plan));
    } catch (e) {
      // ignore
    }
  }

  notifyEventsUpdated();
  return restoredEvent;
}

// Permanently delete an event from the Recycle Bin immediately
export function deletePermanently(eventId) {
  const bin = getBinEvents();
  const filtered = bin.filter((e) => e.id !== eventId);
  try {
    localStorage.setItem(STORAGE_KEY_BIN, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Could not delete item permanently", e);
  }
  notifyEventsUpdated();
}

// Empty the entire Recycle Bin immediately
export function emptyBin() {
  try {
    localStorage.removeItem(STORAGE_KEY_BIN);
  } catch (e) {
    console.warn("Could not empty bin", e);
  }
  notifyEventsUpdated();
}

// Clear current plan view
export function clearPlan() {
  state.currentPlan = null;
  state.currentEventId = null;
  state.error = null;
  state.chatMessages = [];
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_PLAN);
  } catch (e) {
    // ignore
  }
  notifyEventsUpdated();
}

// Realistic sample presets for instant 1-click demo
export const SAMPLE_PRESETS = {
  wedding: {
    event_type: "wedding",
    date: getSampleFutureDate(120), // 4 months out
    guest_count: 350,
    total_budget: 1800000, // ₹18,00,000
    city: "Jaipur",
    style_notes: "Royal Marwari wedding with Sangeet night, pastel mandap, and live chaat counters",
    wedding_functions: 3,
  },
  birthday: {
    event_type: "birthday",
    date: getSampleFutureDate(45), // 1.5 months out
    guest_count: 65,
    total_budget: 65000, // ₹65,000
    city: "Bengaluru",
    style_notes: "10th Birthday carnival in residential society clubhouse with magician, game host, and street snacks",
    wedding_functions: 1,
  },
  community: {
    event_type: "community",
    date: getSampleFutureDate(60), // 2 months out
    guest_count: 400,
    total_budget: 250000, // ₹2,50,000
    city: "Pune",
    style_notes: "Ganesh Utsav community aarti, traditional pandal, and Satvik Mahaprasad for 400 devotees",
    wedding_functions: 1,
  },
};

export function getSampleFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
