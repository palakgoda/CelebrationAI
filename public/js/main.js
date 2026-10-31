/**
 * CelebrationAI Main Application Controller
 * Handles user interactions, inline form validation, live INR currency preview,
 * keyboard accessibility, radiogroup navigation, sample preset loaders, and chat assistant.
 */

import { generatePlan, sendChatMessage } from "./api.js";
import { renderResults, ICONS } from "./render.js";
import {
  state,
  loadSavedChecklist,
  savePlanToStorage,
  getSavedEvents,
  getBinEvents,
  getDaysRemainingInBin,
  moveToBin,
  restoreFromBin,
  deletePermanently,
  emptyBin,
  clearPlan,
  SAMPLE_PRESETS,
  getSampleFutureDate,
} from "./state.js";
import { triggerCelebrationConfetti } from "./confetti.js";

// Format number to Indian numbering notation (₹18,00,000)
function formatIndianCurrency(num) {
  if (!num || isNaN(num)) return "";
  const val = Math.round(Number(num));
  const s = String(Math.abs(val));
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  let rem = s.slice(0, -3);
  const chunks = [];
  while (rem.length > 0) {
    chunks.push(rem.slice(-2));
    rem = rem.slice(0, -2);
  }
  chunks.reverse();
  return `₹${chunks.join(",")},${last3}`;
}

// Convert numbers into Lakh / Crore readable helper text
function getIndianWordsHelper(num) {
  if (!num || isNaN(num) || num < 1000) return "";
  const val = Number(num);
  if (val >= 10000000) {
    const cr = (val / 10000000).toFixed(2).replace(/\.00$/, "");
    return `${cr} Crore`;
  }
  if (val >= 100000) {
    const lk = (val / 100000).toFixed(2).replace(/\.00$/, "");
    return `${lk} Lakh`;
  }
  if (val >= 1000) {
    const th = (val / 1000).toFixed(1).replace(/\.0$/, "");
    return `${th} Thousand`;
  }
  return "";
}

function initApp() {
  loadSavedChecklist();
  initDateConstraints();
  initEventTypeRadiogroup();
  initFormCurrencyPreview();
  initInlineValidation();
  initFormSubmission();
  initSampleButtons();
  initKeyboardTabNavigation();
  initChatPanel();
  initEventsManager();

  // Restore latest active event if one exists in active saved events
  try {
    const activeEvents = getSavedEvents();
    if (activeEvents.length > 0) {
      const latest = activeEvents[0];
      const resultsContainer = document.getElementById("results-container");
      if (latest && latest.plan && resultsContainer) {
        state.currentPlan = latest.plan;
        state.currentEventId = latest.id;
        renderResults(resultsContainer, latest.plan);
        document.getElementById("results-section")?.classList.remove("hidden");
        document.getElementById("chat-trigger-btn")?.classList.remove("hidden");
        document.getElementById("nav-link-checklists")?.classList.remove("hidden");
      }
    } else {
      // No active events, make sure results section stays hidden
      document.getElementById("results-section")?.classList.add("hidden");
      document.getElementById("chat-trigger-btn")?.classList.add("hidden");
      document.getElementById("nav-link-checklists")?.classList.add("hidden");
    }
  } catch (e) {
    console.warn("Could not load initial event", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

/**
 * Set min on the date input to today and default to 90 days out
 */
function initDateConstraints() {
  const dateInput = document.getElementById("input-date");
  if (!dateInput) return;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  dateInput.min = todayStr;
  if (!dateInput.value) {
    dateInput.value = getSampleFutureDate(90);
  }
}

/**
 * Event Type Radio Group with Arrow-Key Keyboard Navigation & ARIA States
 */
function initEventTypeRadiogroup() {
  const container = document.getElementById("event-type-radiogroup");
  const cards = Array.from(document.querySelectorAll(".event-type-card"));
  const functionsField = document.getElementById("field-wedding-functions");

  if (!container || cards.length === 0) return;

  function selectCard(cardToSelect, shouldFocus = false) {
    const type = cardToSelect.getAttribute("data-type");
    state.activeEventType = type;

    cards.forEach((c) => {
      const isSelected = c === cardToSelect;
      c.classList.toggle("selected", isSelected);
      c.setAttribute("aria-checked", isSelected ? "true" : "false");
      c.setAttribute("tabindex", isSelected ? "0" : "-1");
    });

    if (shouldFocus) {
      cardToSelect.focus();
    }

    if (functionsField) {
      if (type === "wedding") {
        functionsField.classList.remove("hidden");
        const funcSelect = document.getElementById("input-functions");
        if (funcSelect && (!funcSelect.value || funcSelect.value === "1")) {
          funcSelect.value = "3";
        }
      } else {
        functionsField.classList.add("hidden");
        const funcSelect = document.getElementById("input-functions");
        if (funcSelect) {
          funcSelect.value = "1";
        }
      }
    }
  }

  // Container delegation ensures clicks anywhere within card boundaries trigger selection
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".event-type-card");
    if (card && cards.includes(card)) {
      selectCard(card, false);
    }
  });

  // Direct click handler on each card
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      selectCard(card, false);
    });

    // Keyboard navigation (Arrow keys, Space, Enter)
    card.addEventListener("keydown", (e) => {
      const currentIndex = cards.indexOf(card);
      let targetIndex = -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        targetIndex = (currentIndex + 1) % cards.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        targetIndex = (currentIndex - 1 + cards.length) % cards.length;
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        selectCard(card, true);
        return;
      }

      if (targetIndex !== -1) {
        selectCard(cards[targetIndex], true);
      }
    });
  });
}

/**
 * Live ₹ format preview while typing budget
 */
function initFormCurrencyPreview() {
  const budgetInput = document.getElementById("input-budget");
  const budgetHelper = document.getElementById("budget-live-helper");

  if (!budgetInput || !budgetHelper) return;

  function updatePreview() {
    const val = Number(budgetInput.value);
    if (val && val >= 1000) {
      const formatted = formatIndianCurrency(val);
      const words = getIndianWordsHelper(val);
      budgetHelper.textContent = words ? `${formatted} (${words})` : formatted;
      budgetHelper.classList.remove("hidden");
    } else {
      budgetHelper.textContent = "";
      budgetHelper.classList.add("hidden");
    }
  }

  budgetInput.addEventListener("input", updatePreview);
  updatePreview();
}

/**
 * Inline field validation tied via aria-describedby and aria-invalid
 */
function validateField(inputEl, errorEl, validatorFn, errorMsg) {
  if (!inputEl || !errorEl) return true;
  const isValid = validatorFn(inputEl.value);
  if (!isValid) {
    inputEl.setAttribute("aria-invalid", "true");
    errorEl.textContent = errorMsg;
    errorEl.classList.remove("hidden");
    return false;
  } else {
    inputEl.removeAttribute("aria-invalid");
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return true;
  }
}

function initInlineValidation() {
  const dateInput = document.getElementById("input-date");
  const dateError = document.getElementById("date-error");
  const guestsInput = document.getElementById("input-guests");
  const guestsError = document.getElementById("guests-error");
  const budgetInput = document.getElementById("input-budget");
  const budgetError = document.getElementById("budget-error");
  const cityInput = document.getElementById("input-city");
  const cityError = document.getElementById("city-error");

  const todayStr = new Date().toISOString().split("T")[0];

  dateInput?.addEventListener("blur", () => {
    validateField(dateInput, dateError, (val) => Boolean(val) && val >= todayStr, "Please choose a valid celebration date (today or future).");
  });

  guestsInput?.addEventListener("blur", () => {
    validateField(guestsInput, guestsError, (val) => {
      const n = Number(val);
      return !isNaN(n) && n >= 1 && n <= 5000;
    }, "Guest count must be between 1 and 5,000.");
  });

  budgetInput?.addEventListener("blur", () => {
    validateField(budgetInput, budgetError, (val) => {
      const b = Number(val);
      return !isNaN(b) && b >= 5000 && b <= 500000000;
    }, "Total budget must be at least ₹5,000 and under ₹50 Crore.");
  });

  cityInput?.addEventListener("blur", () => {
    validateField(cityInput, cityError, (val) => Boolean(val) && val.trim().length >= 2, "Please enter a valid city or destination name (e.g., Jaipur, Mumbai).");
  });
}

/**
 * Form Submission & Skeleton Loader
 */
function initFormSubmission() {
  const form = document.getElementById("event-form");
  const resultsSection = document.getElementById("results-section");
  const resultsContainer = document.getElementById("results-container");
  const skeleton = document.getElementById("plan-skeleton");
  const errorBanner = document.getElementById("form-error-banner");
  const submitBtn = document.getElementById("btn-submit-plan");

  const dateInput = document.getElementById("input-date");
  const dateError = document.getElementById("date-error");
  const guestsInput = document.getElementById("input-guests");
  const guestsError = document.getElementById("guests-error");
  const budgetInput = document.getElementById("input-budget");
  const budgetError = document.getElementById("budget-error");
  const cityInput = document.getElementById("input-city");
  const cityError = document.getElementById("city-error");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const todayStr = new Date().toISOString().split("T")[0];

    // Validate all inputs with inline errors
    const isDateValid = validateField(dateInput, dateError, (val) => Boolean(val) && val >= todayStr, "Please choose a valid celebration date (today or future).");
    const isGuestsValid = validateField(guestsInput, guestsError, (val) => {
      const n = Number(val);
      return !isNaN(n) && n >= 1 && n <= 5000;
    }, "Guest count must be between 1 and 5,000.");
    const isBudgetValid = validateField(budgetInput, budgetError, (val) => {
      const b = Number(val);
      return !isNaN(b) && b >= 5000 && b <= 500000000;
    }, "Total budget must be at least ₹5,000 and under ₹50 Crore.");
    const isCityValid = validateField(cityInput, cityError, (val) => Boolean(val) && val.trim().length >= 2, "Please enter a valid city or destination name.");

    if (!isDateValid || !isGuestsValid || !isBudgetValid || !isCityValid) {
      showError("Please correct the errors marked in the form.");
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const payload = {
      event_type: state.activeEventType,
      date: dateInput.value,
      guest_count: Number(guestsInput.value),
      total_budget: Number(budgetInput.value),
      city: cityInput.value.trim(),
      style_notes: document.getElementById("input-notes")?.value?.trim() || "",
      wedding_functions: state.activeEventType === "wedding" ? Number(document.getElementById("input-functions")?.value) || 3 : 1,
    };

    // Show loading state
    clearError();
    state.isLoading = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Synthesizing Plan...</span>`;
    }
    if (resultsSection) resultsSection.classList.remove("hidden");
    if (skeleton) skeleton.classList.remove("hidden");
    if (resultsContainer) resultsContainer.innerHTML = "";

    // Smooth scroll to loading section
    resultsSection?.scrollIntoView({ behavior: "smooth" });

    try {
      const plan = await generatePlan(payload);
      savePlanToStorage(plan);

      if (skeleton) skeleton.classList.add("hidden");
      if (resultsContainer) {
        renderResults(resultsContainer, plan);
      }

      // Show Chat Floating button & Nav Checklists link
      document.getElementById("chat-trigger-btn")?.classList.remove("hidden");
      document.getElementById("nav-link-checklists")?.classList.remove("hidden");

      // Reset submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Generate Celebration Plan</span>`;
      }
    } catch (err) {
      console.error("Plan generation error:", err);
      if (skeleton) skeleton.classList.add("hidden");
      showError(err.message || "Failed to generate plan. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Retry Plan Generation</span>`;
      }
    } finally {
      state.isLoading = false;
    }
  });

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.classList.remove("hidden");
      errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.textContent = "";
      errorBanner.classList.add("hidden");
    }
  }
}

/**
 * Sample Preset Fillers for instant demoing & hero preview card click
 */
function initSampleButtons() {
  const sampleBtn = document.getElementById("btn-sample-wedding");
  const heroPreviewCard = document.getElementById("hero-preview-card");
  const birthdayPresetBtn = document.getElementById("btn-sample-birthday");
  const communityPresetBtn = document.getElementById("btn-sample-community");

  function fillAndSubmit(presetKey) {
    const preset = SAMPLE_PRESETS[presetKey];
    if (!preset) return;

    // 1. Select card
    const card = document.querySelector(`.event-type-card[data-type="${preset.event_type}"]`);
    if (card) {
      card.click();
    }

    // 2. Populate inputs
    const dateInput = document.getElementById("input-date");
    const guestsInput = document.getElementById("input-guests");
    const budgetInput = document.getElementById("input-budget");
    const cityInput = document.getElementById("input-city");
    const notesInput = document.getElementById("input-notes");
    const functionsInput = document.getElementById("input-functions");

    if (dateInput) dateInput.value = preset.date;
    if (guestsInput) guestsInput.value = preset.guest_count;
    if (budgetInput) {
      budgetInput.value = preset.total_budget;
      budgetInput.dispatchEvent(new Event("input"));
    }
    if (cityInput) cityInput.value = preset.city;
    if (notesInput) notesInput.value = preset.style_notes || "";
    if (functionsInput) {
      functionsInput.value = preset.event_type === "wedding" ? (preset.wedding_functions || 3) : 1;
    }

    // Clear any previous inline errors
    document.querySelectorAll(".inline-error-msg").forEach((e) => e.classList.add("hidden"));
    document.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
    clearError();

    // 3. Submit form automatically
    const form = document.getElementById("event-form");
    if (form) {
      form.dispatchEvent(new Event("submit"));
    }
  }

  if (sampleBtn) {
    sampleBtn.addEventListener("click", () => fillAndSubmit("wedding"));
  }
  if (heroPreviewCard) {
    heroPreviewCard.addEventListener("click", () => fillAndSubmit("wedding"));
  }
  if (birthdayPresetBtn) {
    birthdayPresetBtn.addEventListener("click", () => fillAndSubmit("birthday"));
  }
  if (communityPresetBtn) {
    communityPresetBtn.addEventListener("click", () => fillAndSubmit("community"));
  }
}

/**
 * Keyboard Navigation for Tab Pattern (role="tablist")
 */
function initKeyboardTabNavigation() {
  document.addEventListener("keydown", (e) => {
    const activeTab = document.activeElement;
    if (!activeTab || activeTab.getAttribute("role") !== "tab") return;

    const tabList = activeTab.parentElement;
    if (!tabList || tabList.getAttribute("role") !== "tablist") return;

    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(activeTab);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = tabs[(index + 1) % tabs.length];
      nextTab.focus();
      nextTab.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevTab = tabs[(index - 1 + tabs.length) % tabs.length];
      prevTab.focus();
      prevTab.click();
    }
  });
}

/**
 * Follow-up Chat Assistant Drawer / Side Panel
 */
function initChatPanel() {
  const triggerBtn = document.getElementById("chat-trigger-btn");
  const closeBtn = document.getElementById("chat-close-btn");
  const panel = document.getElementById("chat-panel");
  const backdrop = document.getElementById("chat-backdrop");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  function openChat() {
    state.chatOpen = true;
    panel?.classList.add("is-open");
    backdrop?.classList.add("is-open");
    panel?.setAttribute("aria-hidden", "false");
    chatInput?.focus();

    // If initial empty state, append welcome message
    if (state.chatMessages.length === 0 && chatMessages) {
      appendChatMessage(
        "assistant",
        "Namaste! I am your CelebrationAI advisor. Ask me anything about catering menus, negotiation tips, day-of schedules, or vendor milestones in " +
          (state.currentPlan?.city || "your city") +
          "!"
      );
      renderChatSuggestions([
        "How can I cut catering costs without losing pomp?",
        "What should I ask during a venue site visit?",
        "Suggest a fun Sangeet timeline",
      ]);
    }
  }

  function closeChat() {
    state.chatOpen = false;
    panel?.classList.remove("is-open");
    backdrop?.classList.remove("is-open");
    panel?.setAttribute("aria-hidden", "true");
    triggerBtn?.focus();
  }

  if (triggerBtn) triggerBtn.addEventListener("click", openChat);
  if (closeBtn) closeBtn.addEventListener("click", closeChat);
  if (backdrop) backdrop.addEventListener("click", closeChat);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.chatOpen) {
      closeChat();
    }
  });

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg || state.isChatLoading) return;

      appendChatMessage("user", msg);
      chatInput.value = "";
      state.isChatLoading = true;

      // Add thinking bubble
      const loadingBubble = document.createElement("div");
      loadingBubble.className = "chat-bubble bubble-assistant is-thinking";
      loadingBubble.id = "chat-thinking";
      loadingBubble.textContent = "Consulting celebration guidelines...";
      chatMessages?.appendChild(loadingBubble);
      chatMessages?.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });

      try {
        const response = await sendChatMessage(
          msg,
          state.currentPlan || {},
          state.chatMessages.slice(-6)
        );

        loadingBubble.remove();
        appendChatMessage("assistant", response.reply);

        if (response.suggested_actions && response.suggested_actions.length > 0) {
          renderChatSuggestions(response.suggested_actions);
        }
      } catch (err) {
        loadingBubble.remove();
        appendChatMessage(
          "assistant",
          "I encountered a temporary connection issue. Please feel free to retry your question!"
        );
      } finally {
        state.isChatLoading = false;
      }
    });
  }

  function appendChatMessage(role, text) {
    state.chatMessages.push({ role, content: text });
    if (!chatMessages) return;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble bubble-${role}`;

    const sender = document.createElement("div");
    sender.className = "bubble-sender";
    sender.textContent = role === "user" ? "You" : "CelebrationAI";

    const content = document.createElement("div");
    content.className = "bubble-text";
    content.textContent = text;

    bubble.appendChild(sender);
    bubble.appendChild(content);
    chatMessages.appendChild(bubble);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }

  function renderChatSuggestions(suggestions) {
    const existing = document.getElementById("chat-suggestions-row");
    if (existing) existing.remove();

    const row = document.createElement("div");
    row.id = "chat-suggestions-row";
    row.className = "chat-suggestions";

    suggestions.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-chip";
      chip.textContent = s;
      chip.addEventListener("click", () => {
        if (chatInput) {
          chatInput.value = s;
          chatForm?.dispatchEvent(new Event("submit"));
        }
      });
      row.appendChild(chip);
    });

    chatMessages?.appendChild(row);
    chatMessages?.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }
}

/**
 * ============================================================================
 * Event Manager & 30-Day Recycle Bin Controller
 * ============================================================================
 */
let pendingDeletePlan = null;

function updateEventsBadges() {
  const activeEvents = getSavedEvents();
  const binEvents = getBinEvents();

  const navBadge = document.getElementById("events-badge-count");
  if (navBadge) {
    navBadge.textContent = String(activeEvents.length);
    if (activeEvents.length > 0) {
      navBadge.classList.add("has-items");
    } else {
      navBadge.classList.remove("has-items");
    }
  }

  const badgeActive = document.getElementById("badge-active-events");
  if (badgeActive) badgeActive.textContent = String(activeEvents.length);

  const badgeBin = document.getElementById("badge-bin-events");
  if (badgeBin) badgeBin.textContent = String(binEvents.length);
}

function initEventsManager() {
  updateEventsBadges();
  window.addEventListener("celebration_events_updated", updateEventsBadges);

  const openBtn = document.getElementById("btn-open-events-bin");
  const modal = document.getElementById("events-bin-modal");
  const backdrop = document.getElementById("events-bin-backdrop");
  const closeBtn = document.getElementById("btn-close-events-modal");

  const tabActive = document.getElementById("tab-btn-active-events");
  const tabBin = document.getElementById("tab-btn-bin-events");
  const panelActive = document.getElementById("panel-active-events");
  const panelBin = document.getElementById("panel-bin-events");

  const btnCreateNew = document.getElementById("btn-modal-create-new");
  const btnEmptyBin = document.getElementById("btn-modal-empty-bin");

  // Open modal
  openBtn?.addEventListener("click", () => {
    openEventsModal("active");
  });

  // Close modal
  closeBtn?.addEventListener("click", closeEventsModal);
  backdrop?.addEventListener("click", closeEventsModal);

  // Tab switching
  tabActive?.addEventListener("click", () => switchEventsTab("active"));
  tabBin?.addEventListener("click", () => switchEventsTab("bin"));

  // Create new from modal
  btnCreateNew?.addEventListener("click", () => {
    closeEventsModal();
    window.location.hash = "#planner-form";
    const form = document.getElementById("event-form");
    if (form) form.scrollIntoView({ behavior: "smooth" });
  });

  // Empty bin
  btnEmptyBin?.addEventListener("click", () => {
    const bin = getBinEvents();
    if (bin.length === 0) {
      showToast("Recycle Bin is already empty.");
      return;
    }
    if (window.confirm("Are you sure you want to permanently delete all events in the Recycle Bin? This action cannot be undone.")) {
      emptyBin();
      renderBinEventsList();
      showToast("Recycle Bin emptied.");
    }
  });

  // Delete confirmation modal setup
  const confirmModal = document.getElementById("delete-confirm-modal");
  const confirmBackdrop = document.getElementById("delete-confirm-backdrop");
  const btnCancelDelete = document.getElementById("btn-cancel-delete");
  const btnConfirmDelete = document.getElementById("btn-confirm-delete");

  btnCancelDelete?.addEventListener("click", closeDeleteConfirmModal);
  confirmBackdrop?.addEventListener("click", closeDeleteConfirmModal);

  btnConfirmDelete?.addEventListener("click", () => {
    if (!pendingDeletePlan) {
      closeDeleteConfirmModal();
      return;
    }

    const targetId = pendingDeletePlan._id || state.currentEventId;
    const deletedEvent = moveToBin(targetId);
    closeDeleteConfirmModal();

    // Hide results section and reset view
    const resultsSection = document.getElementById("results-section");
    const chatBtn = document.getElementById("chat-trigger-btn");
    const checklistsLink = document.getElementById("nav-link-checklists");

    if (resultsSection) resultsSection.classList.add("hidden");
    if (chatBtn) chatBtn.classList.add("hidden");
    if (checklistsLink) checklistsLink.classList.add("hidden");

    window.location.hash = "#planner-form";
    const form = document.getElementById("event-form");
    if (form) form.scrollIntoView({ behavior: "smooth" });

    showToast("Event moved to Recycle Bin (safe for 30 days).", () => {
      if (deletedEvent) {
        const restored = restoreFromBin(deletedEvent.id, true);
        if (restored && restored.plan) {
          const resultsContainer = document.getElementById("results-container");
          if (resultsContainer) {
            renderResults(resultsContainer, restored.plan);
            resultsSection?.classList.remove("hidden");
            chatBtn?.classList.remove("hidden");
            checklistsLink?.classList.remove("hidden");
            triggerCelebrationConfetti();
            showToast("Event restored successfully!");
          }
        }
      }
    });

    pendingDeletePlan = null;
  });

  // Expose global delete requester for render.js
  window.requestDeleteCurrentPlan = function (plan) {
    pendingDeletePlan = plan;
    const descEl = document.getElementById("delete-confirm-desc");
    if (descEl && plan) {
      const typeName = plan.event_type.charAt(0).toUpperCase() + plan.event_type.slice(1);
      descEl.innerHTML = `Are you sure you want to delete <strong>${plan.city} ${typeName} Master Plan</strong>? It will be moved to your <strong>Recycle Bin</strong> and safely retained for <strong>30 days</strong> before permanent deletion.`;
    }
    confirmModal?.classList.remove("hidden");
    confirmBackdrop?.classList.remove("hidden");
  };
}

function openEventsModal(defaultTab = "active") {
  const modal = document.getElementById("events-bin-modal");
  const backdrop = document.getElementById("events-bin-backdrop");
  modal?.classList.remove("hidden");
  backdrop?.classList.remove("hidden");
  switchEventsTab(defaultTab);
}

function closeEventsModal() {
  const modal = document.getElementById("events-bin-modal");
  const backdrop = document.getElementById("events-bin-backdrop");
  modal?.classList.add("hidden");
  backdrop?.classList.add("hidden");
}

function closeDeleteConfirmModal() {
  const confirmModal = document.getElementById("delete-confirm-modal");
  const confirmBackdrop = document.getElementById("delete-confirm-backdrop");
  confirmModal?.classList.add("hidden");
  confirmBackdrop?.classList.add("hidden");
  pendingDeletePlan = null;
}

function switchEventsTab(tabKey) {
  const tabActive = document.getElementById("tab-btn-active-events");
  const tabBin = document.getElementById("tab-btn-bin-events");
  const panelActive = document.getElementById("panel-active-events");
  const panelBin = document.getElementById("panel-bin-events");

  if (tabKey === "active") {
    tabActive?.classList.add("is-active");
    tabActive?.setAttribute("aria-selected", "true");
    tabBin?.classList.remove("is-active");
    tabBin?.setAttribute("aria-selected", "false");
    panelActive?.classList.remove("hidden");
    panelBin?.classList.add("hidden");
    renderActiveEventsList();
  } else {
    tabBin?.classList.add("is-active");
    tabBin?.setAttribute("aria-selected", "true");
    tabActive?.classList.remove("is-active");
    tabActive?.setAttribute("aria-selected", "false");
    panelBin?.classList.remove("hidden");
    panelActive?.classList.add("hidden");
    renderBinEventsList();
  }
}

function renderActiveEventsList() {
  const container = document.getElementById("active-events-list");
  if (!container) return;
  const events = getSavedEvents();

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-events-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <p class="empty-title">No Active Plans Yet</p>
        <p class="empty-sub">Fill out the planner form above to generate your first celebration plan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  events.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "event-item-card";

    const typeBadge = `<span class="event-type-pill pill-${ev.event_type || 'wedding'}">${ev.event_type || 'wedding'}</span>`;
    const isCurrent = state.currentEventId === ev.id;

    card.innerHTML = `
      <div class="event-card-header">
        <div class="event-card-title-row">
          <h4 class="event-card-name">${ev.name}</h4>
          ${typeBadge}
          ${isCurrent ? '<span class="event-current-badge">Currently Viewing</span>' : ""}
        </div>
        <p class="event-card-meta">
          <span>📅 ${ev.date || 'TBD'}</span> · 
          <span>📍 ${ev.city || 'India'}</span> · 
          <span>👥 ${ev.guest_count} Guests</span> · 
          <span class="event-card-budget tabular-nums">${ev.total_budget_formatted}</span>
        </p>
      </div>
      <div class="event-card-actions">
        <button type="button" class="btn-primary btn-sm btn-open-plan">
          <span>${isCurrent ? "View Current Plan" : "Open Plan"}</span>
        </button>
        <button type="button" class="btn-secondary btn-sm btn-bin-plan" title="Move to Recycle Bin">
          ${ICONS.trash}<span>Move to Bin</span>
        </button>
      </div>
    `;

    // Open Plan button
    card.querySelector(".btn-open-plan")?.addEventListener("click", () => {
      if (ev.plan) {
        state.currentPlan = ev.plan;
        state.currentEventId = ev.id;
        const resultsContainer = document.getElementById("results-container");
        if (resultsContainer) {
          renderResults(resultsContainer, ev.plan);
          document.getElementById("results-section")?.classList.remove("hidden");
          document.getElementById("chat-trigger-btn")?.classList.remove("hidden");
          document.getElementById("nav-link-checklists")?.classList.remove("hidden");
          document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
        }
      }
      closeEventsModal();
    });

    // Move to Bin button
    card.querySelector(".btn-bin-plan")?.addEventListener("click", () => {
      const deleted = moveToBin(ev.id);
      renderActiveEventsList();
      showToast(`Moved "${ev.name}" to Recycle Bin.`, () => {
        if (deleted) {
          restoreFromBin(deleted.id, false);
          renderActiveEventsList();
          showToast("Event restored!");
        }
      });
    });

    container.appendChild(card);
  });
}

function renderBinEventsList() {
  const container = document.getElementById("bin-events-list");
  if (!container) return;
  const bin = getBinEvents();

  if (bin.length === 0) {
    container.innerHTML = `
      <div class="empty-events-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <p class="empty-title">Recycle Bin is Empty</p>
        <p class="empty-sub">When you delete an event, it will stay here for 30 days before being permanently removed.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  bin.forEach((ev) => {
    const daysLeft = getDaysRemainingInBin(ev.deletedAt);
    const card = document.createElement("div");
    card.className = "event-item-card is-deleted";

    const daysText = daysLeft > 1 ? `${daysLeft} days left` : "Auto-deletes today";

    card.innerHTML = `
      <div class="event-card-header">
        <div class="event-card-title-row">
          <h4 class="event-card-name">${ev.name}</h4>
          <span class="bin-expiry-pill">⏰ ${daysText}</span>
        </div>
        <p class="event-card-meta">
          <span>📅 ${ev.date || 'TBD'}</span> · 
          <span>📍 ${ev.city || 'India'}</span> · 
          <span class="event-card-budget tabular-nums">${ev.total_budget_formatted}</span>
        </p>
      </div>
      <div class="event-card-actions">
        <button type="button" class="btn-secondary btn-sm btn-restore-plan" title="Restore back to Active Plans">
          ${ICONS.restore}<span>Restore</span>
        </button>
        <button type="button" class="btn-secondary btn-sm btn-perm-delete btn-danger-text" title="Delete permanently right now">
          <span>Delete Forever</span>
        </button>
      </div>
    `;

    // Restore button
    card.querySelector(".btn-restore-plan")?.addEventListener("click", () => {
      const restored = restoreFromBin(ev.id, true);
      renderBinEventsList();
      triggerCelebrationConfetti();
      showToast(`Restored "${ev.name}" to Active Plans!`);

      // If restored, show in results view
      if (restored && restored.plan) {
        const resultsContainer = document.getElementById("results-container");
        if (resultsContainer) {
          renderResults(resultsContainer, restored.plan);
          document.getElementById("results-section")?.classList.remove("hidden");
          document.getElementById("chat-trigger-btn")?.classList.remove("hidden");
          document.getElementById("nav-link-checklists")?.classList.remove("hidden");
        }
      }
    });

    // Permanent delete button
    card.querySelector(".btn-perm-delete")?.addEventListener("click", () => {
      if (window.confirm(`Permanently erase "${ev.name}"? This cannot be restored.`)) {
        deletePermanently(ev.id);
        renderBinEventsList();
        showToast("Event permanently deleted.");
      }
    });

    container.appendChild(card);
  });
}

function showToast(message, undoAction = null, duration = 6500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-banner";
  toast.setAttribute("role", "alert");

  const msgSpan = document.createElement("span");
  msgSpan.className = "toast-text";
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (undoAction && typeof undoAction === "function") {
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      undoAction();
      toast.remove();
    });
    toast.appendChild(undoBtn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close-btn";
  closeBtn.setAttribute("aria-label", "Close notification");
  closeBtn.innerHTML = `&times;`;
  closeBtn.addEventListener("click", () => toast.remove());
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

