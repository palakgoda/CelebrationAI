/**
 * CelebrationAI State Management
 * Handles application state, local storage persistence for vendor checklists,
 * and realistic sample datasets for instant demoing.
 */

const STORAGE_KEY_CHECKLIST = "celebration_ai_checklist_v1";
const STORAGE_KEY_LAST_PLAN = "celebration_ai_last_plan_v1";

export const state = {
  activeEventType: "wedding",
  currentPlan: null,
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

// Save last plan for session recovery
export function savePlanToStorage(plan) {
  state.currentPlan = plan;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_PLAN, JSON.stringify(plan));
  } catch (e) {
    console.warn("Could not save plan to storage", e);
  }
}

// Clear current plan
export function clearPlan() {
  state.currentPlan = null;
  state.error = null;
  state.chatMessages = [];
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_PLAN);
  } catch (e) {
    // ignore
  }
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
