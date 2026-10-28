/**
 * CelebrationAI Rendering Engine
 * Editorial design system, safe DOM operations (no raw innerHTML for user/AI data),
 * accessible ARIA landmarks, and Indian currency presentation.
 */

import { state, toggleVendorTask, isVendorTaskChecked } from "./state.js";

// Clean inline SVG icon helpers (No emojis)
export const ICONS = {
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  rupee: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="M6 13l8.5 8"></path><path d="M6 13h3a4 4 0 0 0 0-8"></path></svg>`,
  alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  sparkle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
};

/**
 * Format date into "15 Nov 2026"
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Render the full results container
 */
export function renderResults(container, plan) {
  if (!container || !plan) return;
  container.innerHTML = "";

  // 1. Plan Action Header (Download / Reset / Title)
  const actionHeader = document.createElement("div");
  actionHeader.className = "results-header";

  const titleBlock = document.createElement("div");
  const eventName = plan.event_type.charAt(0).toUpperCase() + plan.event_type.slice(1);
  const functionsText = plan.wedding_functions ? ` · ${plan.wedding_functions} Functions` : "";

  const heading = document.createElement("h2");
  heading.className = "results-title";
  heading.textContent = `${plan.city} ${eventName} Master Plan`;

  const metaSub = document.createElement("p");
  metaSub.className = "results-meta";
  metaSub.textContent = `${formatDisplayDate(plan.date)} · ${plan.guest_count} Guests${functionsText}`;

  titleBlock.appendChild(heading);
  titleBlock.appendChild(metaSub);

  const actionsBlock = document.createElement("div");
  actionsBlock.className = "results-actions";

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "btn-secondary btn-sm";
  downloadBtn.id = "btn-download-plan";
  downloadBtn.innerHTML = `${ICONS.download}<span>Print / Save PDF</span>`;
  downloadBtn.addEventListener("click", () => window.print());

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn-secondary btn-sm";
  resetBtn.id = "btn-start-over";
  resetBtn.textContent = "Plan Another Event";
  resetBtn.addEventListener("click", () => {
    window.location.hash = "#planner-form";
    const form = document.getElementById("event-form");
    if (form) form.scrollIntoView({ behavior: "smooth" });
  });

  actionsBlock.appendChild(downloadBtn);
  actionsBlock.appendChild(resetBtn);

  actionHeader.appendChild(titleBlock);
  actionHeader.appendChild(actionsBlock);
  container.appendChild(actionHeader);

  // 1b. Fallback Notice if Gemini enrichment is unavailable
  if (plan.ai_enriched === false || plan.is_fallback === true) {
    const notice = document.createElement("div");
    notice.className = "alert-box alert-notice";
    notice.setAttribute("role", "status");
    notice.innerHTML = `
      <span class="alert-icon">${ICONS.alert}</span>
      <div class="alert-body">
        <div class="alert-title">Notice</div>
        <div class="alert-message">AI-personalized ideas are unavailable right now. Showing the rule-based plan.</div>
      </div>
    `;
    container.appendChild(notice);
  }

  // 2. Summary KPI Strip
  const kpiStrip = document.createElement("div");
  kpiStrip.className = "kpi-grid";

  const kpis = [
    { label: "Total Budget", value: plan.total_budget_formatted, icon: ICONS.rupee },
    { label: "Cost Per Guest", value: plan.per_guest_formatted, icon: ICONS.users },
    { label: "Days Until Event", value: `${plan.days_until_event} Days`, icon: ICONS.calendar },
    {
      label: "Budget Tier",
      value: plan.budget.budget_tier.charAt(0).toUpperCase() + plan.budget.budget_tier.slice(1),
      icon: ICONS.sparkle,
    },
  ];

  kpis.forEach((k) => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML = `
      <div class="kpi-header">
        <span class="kpi-label">${k.label}</span>
        <span class="kpi-icon">${k.icon}</span>
      </div>
      <div class="kpi-value tabular-nums">${k.value}</div>
    `;
    kpiStrip.appendChild(card);
  });
  container.appendChild(kpiStrip);

  // 3. Realism Warnings Callout (if any)
  if (plan.realism_warnings && plan.realism_warnings.length > 0) {
    const warnContainer = document.createElement("div");
    warnContainer.className = "warnings-wrapper";

    plan.realism_warnings.forEach((warn) => {
      const box = document.createElement("div");
      box.className = `alert-box alert-${warn.level}`;

      const alertIcon = document.createElement("div");
      alertIcon.className = "alert-icon";
      alertIcon.innerHTML = ICONS.alert;

      const alertContent = document.createElement("div");
      alertContent.className = "alert-content";

      const alertTitle = document.createElement("div");
      alertTitle.className = "alert-title";
      alertTitle.textContent = warn.title;

      const alertMessage = document.createElement("p");
      alertMessage.className = "alert-message";
      alertMessage.textContent = warn.message;

      const alertSuggestion = document.createElement("div");
      alertSuggestion.className = "alert-suggestion";
      const sugLabel = document.createElement("strong");
      sugLabel.textContent = "Smart Adjustment: ";
      alertSuggestion.appendChild(sugLabel);
      alertSuggestion.appendChild(document.createTextNode(warn.suggestion));

      alertContent.appendChild(alertTitle);
      alertContent.appendChild(alertMessage);
      alertContent.appendChild(alertSuggestion);

      box.appendChild(alertIcon);
      box.appendChild(alertContent);
      warnContainer.appendChild(box);
    });

    container.appendChild(warnContainer);
  }

  // 4. Mobile Tabs + Desktop Section Layout
  const tabsNav = document.createElement("div");
  tabsNav.className = "tabs-nav";
  tabsNav.setAttribute("role", "tablist");
  tabsNav.setAttribute("aria-label", "Event Plan Sections");

  const tabDefs = [
    { id: "budget", label: "Budget Breakdown" },
    { id: "timeline", label: "Milestones Timeline" },
    { id: "vendors", label: "Vendor Checklist" },
    { id: "ideas", label: "Cultural Ideas & Tips" },
  ];

  tabDefs.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab-btn ${state.activeTab === t.id ? "active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("id", `tab-${t.id}`);
    btn.setAttribute("aria-controls", `panel-${t.id}`);
    btn.setAttribute("aria-selected", state.activeTab === t.id ? "true" : "false");
    btn.textContent = t.label;

    btn.addEventListener("click", () => {
      state.activeTab = t.id;
      document.querySelectorAll(".tab-btn").forEach((b) => {
        const isCurrent = b.id === `tab-${t.id}`;
        b.classList.toggle("active", isCurrent);
        b.setAttribute("aria-selected", isCurrent ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.toggle("hidden", p.id !== `panel-${t.id}`);
      });
    });

    tabsNav.appendChild(btn);
  });
  container.appendChild(tabsNav);

  // Panels Container
  const panelsWrapper = document.createElement("div");
  panelsWrapper.className = "panels-wrapper";

  // PANEL 1: Budget
  const budgetPanel = document.createElement("div");
  budgetPanel.className = `tab-panel ${state.activeTab === "budget" ? "" : "hidden"}`;
  budgetPanel.id = "panel-budget";
  budgetPanel.setAttribute("role", "tabpanel");
  budgetPanel.setAttribute("aria-labelledby", "tab-budget");
  renderBudgetSection(budgetPanel, plan.budget);
  panelsWrapper.appendChild(budgetPanel);

  // PANEL 2: Timeline
  const timelinePanel = document.createElement("div");
  timelinePanel.className = `tab-panel ${state.activeTab === "timeline" ? "" : "hidden"}`;
  timelinePanel.id = "panel-timeline";
  timelinePanel.setAttribute("role", "tabpanel");
  timelinePanel.setAttribute("aria-labelledby", "tab-timeline");
  renderTimelineSection(timelinePanel, plan.timeline);
  panelsWrapper.appendChild(timelinePanel);

  // PANEL 3: Vendor Checklist
  const vendorsPanel = document.createElement("div");
  vendorsPanel.className = `tab-panel ${state.activeTab === "vendors" ? "" : "hidden"}`;
  vendorsPanel.id = "panel-vendors";
  vendorsPanel.setAttribute("role", "tabpanel");
  vendorsPanel.setAttribute("aria-labelledby", "tab-vendors");
  renderVendorsSection(vendorsPanel, plan.vendors);
  panelsWrapper.appendChild(vendorsPanel);

  // PANEL 4: Ideas & Tips
  const ideasPanel = document.createElement("div");
  ideasPanel.className = `tab-panel ${state.activeTab === "ideas" ? "" : "hidden"}`;
  ideasPanel.id = "panel-ideas";
  ideasPanel.setAttribute("role", "tabpanel");
  ideasPanel.setAttribute("aria-labelledby", "tab-ideas");
  renderIdeasSection(ideasPanel, plan.ideas, plan.city);
  panelsWrapper.appendChild(ideasPanel);

  container.appendChild(panelsWrapper);
}

/**
 * Render Budget Table & Visual Bars
 */
function renderBudgetSection(panel, budget) {
  panel.innerHTML = "";

  const sectionCard = document.createElement("div");
  sectionCard.className = "card-surface";

  const header = document.createElement("div");
  header.className = "section-card-header";
  header.innerHTML = `
    <div>
      <h3 class="section-title">Itemized Budget Allocation</h3>
      <p class="section-desc">Proportional distribution optimized for guest volume and catering per plate.</p>
    </div>
    <div class="tier-pill tabular-nums">${budget.items.length} Categories · ${budget.total_budget_formatted}</div>
  `;
  sectionCard.appendChild(header);

  // Table
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-responsive";

  const table = document.createElement("table");
  table.className = "budget-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col" style="width: 25%">Category</th>
        <th scope="col" style="width: 40%">Scope & Inclusions</th>
        <th scope="col" style="width: 15%" class="text-right">Share</th>
        <th scope="col" style="width: 20%" class="text-right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  budget.items.forEach((item) => {
    const tr = document.createElement("tr");

    // Category with inline bar
    const tdCat = document.createElement("td");
    const catName = document.createElement("div");
    catName.className = "font-medium text-main";
    catName.textContent = item.category;

    const barBg = document.createElement("div");
    barBg.className = "budget-bar-track";
    const barFill = document.createElement("div");
    barFill.className = "budget-bar-fill";
    barFill.style.width = `${Math.min(100, item.percentage * 2)}%`;
    barBg.appendChild(barFill);

    tdCat.appendChild(catName);
    tdCat.appendChild(barBg);

    // Scope & notes
    const tdScope = document.createElement("td");
    const scopeTitle = document.createElement("div");
    scopeTitle.className = "text-sm text-main";
    scopeTitle.textContent = item.name;
    const scopeNotes = document.createElement("div");
    scopeNotes.className = "text-xs text-muted";
    scopeNotes.textContent = item.notes;
    tdScope.appendChild(scopeTitle);
    tdScope.appendChild(scopeNotes);

    // Share %
    const tdShare = document.createElement("td");
    tdShare.className = "text-right tabular-nums text-sm font-medium";
    tdShare.textContent = `${item.percentage.toFixed(1)}%`;

    // Amount
    const tdAmt = document.createElement("td");
    tdAmt.className = "text-right tabular-nums text-sm font-semibold text-main";
    tdAmt.textContent = item.amount_formatted;

    tr.appendChild(tdCat);
    tr.appendChild(tdScope);
    tr.appendChild(tdShare);
    tr.appendChild(tdAmt);
    tbody.appendChild(tr);
  });

  tableWrapper.appendChild(table);
  sectionCard.appendChild(tableWrapper);
  panel.appendChild(sectionCard);
}

/**
 * Render Milestone Timeline
 */
function renderTimelineSection(panel, milestones) {
  panel.innerHTML = "";

  const sectionCard = document.createElement("div");
  sectionCard.className = "card-surface";

  const header = document.createElement("div");
  header.className = "section-card-header";
  header.innerHTML = `
    <div>
      <h3 class="section-title">Milestones Timeline</h3>
      <p class="section-desc">Backward-scheduled milestones to guarantee smooth vendor locking and rehearsal.</p>
    </div>
    <div class="tier-pill tabular-nums">${milestones.length} Milestones</div>
  `;
  sectionCard.appendChild(header);

  const timelineList = document.createElement("div");
  timelineList.className = "timeline-list";

  milestones.forEach((m) => {
    const item = document.createElement("div");
    item.className = `timeline-item ${m.is_urgent ? "is-urgent" : ""}`;

    const marker = document.createElement("div");
    marker.className = "timeline-marker";

    const content = document.createElement("div");
    content.className = "timeline-content";

    const topMeta = document.createElement("div");
    topMeta.className = "timeline-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "timeline-date tabular-nums";
    dateSpan.textContent = formatDisplayDate(m.target_date);

    const daysSpan = document.createElement("span");
    daysSpan.className = "timeline-days tabular-nums";
    daysSpan.textContent = m.days_before === 0 ? "Day-of Event" : `${m.days_before} days prior`;

    topMeta.appendChild(dateSpan);
    topMeta.appendChild(document.createTextNode(" · "));
    topMeta.appendChild(daysSpan);

    if (m.is_urgent) {
      const urgentTag = document.createElement("span");
      urgentTag.className = "urgent-badge";
      urgentTag.textContent = "Urgent Action";
      topMeta.appendChild(document.createTextNode(" · "));
      topMeta.appendChild(urgentTag);
    }

    const title = document.createElement("h4");
    title.className = "timeline-heading";
    title.textContent = m.title;

    const desc = document.createElement("p");
    desc.className = "timeline-desc";
    desc.textContent = m.description;

    content.appendChild(topMeta);
    content.appendChild(title);
    content.appendChild(desc);

    item.appendChild(marker);
    item.appendChild(content);
    timelineList.appendChild(item);
  });

  sectionCard.appendChild(timelineList);
  panel.appendChild(sectionCard);
}

/**
 * Render Vendor Checklist with Real Checkboxes and Progress Tracking
 */
function renderVendorsSection(panel, vendors) {
  panel.innerHTML = "";

  const sectionCard = document.createElement("div");
  sectionCard.className = "card-surface";

  // Calculate total tasks and checked tasks
  let totalTasks = 0;
  let checkedCount = 0;

  vendors.forEach((v) => {
    v.checklist_tasks.forEach((_, idx) => {
      totalTasks++;
      const taskId = `${v.id}-task-${idx}`;
      if (isVendorTaskChecked(taskId)) {
        checkedCount++;
      }
    });
  });

  const progressPct = totalTasks > 0 ? Math.round((checkedCount / totalTasks) * 100) : 0;

  const header = document.createElement("div");
  header.className = "section-card-header";

  const headerText = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "section-title";
  title.textContent = "Vendor Checklists & Due Dates";
  const desc = document.createElement("p");
  desc.className = "section-desc";
  desc.textContent = "Check off tasks as you interview and finalize service agreements. Saved locally.";
  headerText.appendChild(title);
  headerText.appendChild(desc);

  const progressBlock = document.createElement("div");
  progressBlock.className = "checklist-progress-block";
  progressBlock.innerHTML = `
    <div class="progress-label tabular-nums" id="vendor-progress-label">
      ${checkedCount} of ${totalTasks} tasks completed (${progressPct}%)
    </div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" id="vendor-progress-fill" style="width: ${progressPct}%"></div>
    </div>
  `;

  header.appendChild(headerText);
  header.appendChild(progressBlock);
  sectionCard.appendChild(header);

  // Vendor Cards Grid
  const vendorGrid = document.createElement("div");
  vendorGrid.className = "vendor-grid";

  vendors.forEach((v) => {
    const card = document.createElement("div");
    card.className = "vendor-card";

    // Vendor card header
    const vHeader = document.createElement("div");
    vHeader.className = "vendor-card-header";

    const vTitleBlock = document.createElement("div");
    const vName = document.createElement("h4");
    vName.className = "vendor-title";
    vName.textContent = v.category;
    const vType = document.createElement("div");
    vType.className = "vendor-type";
    vType.textContent = v.vendor_type;
    vTitleBlock.appendChild(vName);
    vTitleBlock.appendChild(vType);

    const vBudgetBlock = document.createElement("div");
    vBudgetBlock.className = "vendor-budget text-right";
    const vAmt = document.createElement("div");
    vAmt.className = "vendor-amount tabular-nums";
    vAmt.textContent = v.suggested_budget_formatted;
    const vDue = document.createElement("div");
    vDue.className = "vendor-due tabular-nums";
    vDue.textContent = `Book by ${formatDisplayDate(v.book_by_date)}`;
    vBudgetBlock.appendChild(vAmt);
    vBudgetBlock.appendChild(vDue);

    vHeader.appendChild(vTitleBlock);
    vHeader.appendChild(vBudgetBlock);
    card.appendChild(vHeader);

    // Checklist Tasks
    const taskList = document.createElement("div");
    taskList.className = "vendor-task-list";

    v.checklist_tasks.forEach((task, idx) => {
      const taskId = `${v.id}-task-${idx}`;
      const checked = isVendorTaskChecked(taskId);

      const label = document.createElement("label");
      label.className = `task-checkbox-label ${checked ? "is-checked" : ""}`;
      label.setAttribute("for", taskId);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = taskId;
      checkbox.className = "task-checkbox";
      checkbox.checked = checked;

      checkbox.addEventListener("change", () => {
        toggleVendorTask(taskId);
        label.classList.toggle("is-checked", checkbox.checked);
        updateVendorProgress();
      });

      const spanText = document.createElement("span");
      spanText.className = "task-text";
      spanText.textContent = task;

      label.appendChild(checkbox);
      label.appendChild(spanText);
      taskList.appendChild(label);
    });
    card.appendChild(taskList);

    // Local Indian vendor tip
    if (v.local_tips) {
      const tipBox = document.createElement("div");
      tipBox.className = "vendor-tip-box";
      const tipHeader = document.createElement("span");
      tipHeader.className = "tip-kicker";
      tipHeader.textContent = "Local Planning Tip: ";
      tipBox.appendChild(tipHeader);
      tipBox.appendChild(document.createTextNode(v.local_tips));
      card.appendChild(tipBox);
    }

    vendorGrid.appendChild(card);
  });

  sectionCard.appendChild(vendorGrid);
  panel.appendChild(sectionCard);

  function updateVendorProgress() {
    let newChecked = 0;
    vendors.forEach((v) => {
      v.checklist_tasks.forEach((_, idx) => {
        const taskId = `${v.id}-task-${idx}`;
        if (isVendorTaskChecked(taskId)) newChecked++;
      });
    });
    const pct = totalTasks > 0 ? Math.round((newChecked / totalTasks) * 100) : 0;
    const lbl = document.getElementById("vendor-progress-label");
    const fill = document.getElementById("vendor-progress-fill");
    if (lbl) lbl.textContent = `${newChecked} of ${totalTasks} tasks completed (${pct}%)`;
    if (fill) fill.style.width = `${pct}%`;
  }
}

/**
 * Render Personalized Ideas & Cultural Insights
 */
function renderIdeasSection(panel, ideas, city) {
  panel.innerHTML = "";

  const sectionCard = document.createElement("div");
  sectionCard.className = "card-surface";

  const header = document.createElement("div");
  header.className = "section-card-header";
  header.innerHTML = `
    <div>
      <h3 class="section-title">Personalized Ideas & Cultural Palette</h3>
      <p class="section-desc">Tailored culinary highlights, meaningful rituals, and smart cost savings for ${city}.</p>
    </div>
    <div class="tier-pill">${ideas.is_ai_generated ? "Gemini Enriched" : "Cultural Blueprint"}</div>
  `;
  sectionCard.appendChild(header);

  // Summary callout
  const summaryBlock = document.createElement("div");
  summaryBlock.className = "ideas-summary-box";
  const summaryP = document.createElement("p");
  summaryP.className = "ideas-summary-text";
  summaryP.textContent = ideas.summary;
  summaryBlock.appendChild(summaryP);
  sectionCard.appendChild(summaryBlock);

  // 2x2 Grid of Ideas
  const grid = document.createElement("div");
  grid.className = "ideas-grid";

  // 1. Theme & Concept
  const themeCard = document.createElement("div");
  themeCard.className = "idea-card";
  themeCard.innerHTML = `<h4 class="idea-card-title">Theme & Decor Concept</h4>`;
  const themeP = document.createElement("p");
  themeP.className = "idea-card-body";
  themeP.textContent = ideas.theme_concept;
  themeCard.appendChild(themeP);
  grid.appendChild(themeCard);

  // 2. Menu Highlights
  const menuCard = document.createElement("div");
  menuCard.className = "idea-card";
  menuCard.innerHTML = `<h4 class="idea-card-title">Curated Menu & Live Counters</h4>`;
  const menuList = document.createElement("ul");
  menuList.className = "idea-card-list";
  ideas.menu_highlights.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = m;
    menuList.appendChild(li);
  });
  menuCard.appendChild(menuList);
  grid.appendChild(menuCard);

  // 3. Activities & Rituals
  const actCard = document.createElement("div");
  actCard.className = "idea-card";
  actCard.innerHTML = `<h4 class="idea-card-title">Interactive Rituals & Memories</h4>`;
  const actList = document.createElement("ul");
  actList.className = "idea-card-list";
  ideas.activities_and_rituals.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = a;
    actList.appendChild(li);
  });
  actCard.appendChild(actList);
  grid.appendChild(actCard);

  // 4. Money-Saving Tips
  const tipsCard = document.createElement("div");
  tipsCard.className = "idea-card";
  tipsCard.innerHTML = `<h4 class="idea-card-title">High-Impact Money-Saving Tips</h4>`;
  const tipsList = document.createElement("ul");
  tipsList.className = "idea-card-list";
  ideas.money_saving_tips.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    tipsList.appendChild(li);
  });
  tipsCard.appendChild(tipsList);
  grid.appendChild(tipsCard);

  sectionCard.appendChild(grid);

  // Decor Color Palette Bar
  if (ideas.decor_palette && ideas.decor_palette.length > 0) {
    const paletteBox = document.createElement("div");
    paletteBox.className = "palette-container";
    const palTitle = document.createElement("h4");
    palTitle.className = "palette-title";
    palTitle.textContent = "Recommended Decor Color Harmony";
    paletteBox.appendChild(palTitle);

    const swatches = document.createElement("div");
    swatches.className = "swatches-row";

    ideas.decor_palette.forEach((colorStr) => {
      const match = colorStr.match(/#([0-9a-fA-F]{6})/);
      const hex = match ? `#${match[1]}` : "#C04A26";
      const name = colorStr.replace(/\(#[0-9a-fA-F]{6}\)/, "").trim();

      const swatchItem = document.createElement("div");
      swatchItem.className = "swatch-item";
      swatchItem.innerHTML = `
        <span class="swatch-color" style="background-color: ${hex}"></span>
        <span class="swatch-name">${name}</span>
      `;
      swatches.appendChild(swatchItem);
    });

    paletteBox.appendChild(swatches);
    sectionCard.appendChild(paletteBox);
  }

  panel.appendChild(sectionCard);
}
