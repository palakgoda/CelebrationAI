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
  SAMPLE_PRESETS,
  getSampleFutureDate,
} from "./state.js";

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

document.addEventListener("DOMContentLoaded", () => {
  loadSavedChecklist();
  initDateConstraints();
  initEventTypeRadiogroup();
  initFormCurrencyPreview();
  initInlineValidation();
  initFormSubmission();
  initSampleButtons();
  initKeyboardTabNavigation();
  initChatPanel();

  // Check if saved plan exists in localStorage
  try {
    const lastPlan = localStorage.getItem("celebration_ai_last_plan_v1");
    if (lastPlan) {
      const parsed = JSON.parse(lastPlan);
      const resultsContainer = document.getElementById("results-container");
      if (parsed && resultsContainer) {
        state.currentPlan = parsed;
        renderResults(resultsContainer, parsed);
        document.getElementById("results-section")?.classList.remove("hidden");
        document.getElementById("chat-trigger-btn")?.classList.remove("hidden");
        document.getElementById("nav-link-checklists")?.classList.remove("hidden");
      }
    }
  } catch (e) {
    console.warn("Could not parse saved plan", e);
  }
});

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

  // Click handler
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
