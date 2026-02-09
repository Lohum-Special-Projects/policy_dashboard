const listEl = document.getElementById("scheme-list");
const lastUpdatedEl = document.getElementById("last-updated");
const schemeCountEl = document.getElementById("scheme-count");
const totalIncentiveEl = document.getElementById("total-incentive");

const monthMap = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatCrores(value) {
  const formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

function parseDeadline(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10) - 1;
    const day = Number.parseInt(isoMatch[3], 10);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const numericMatch = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (numericMatch) {
    const day = Number.parseInt(numericMatch[1], 10);
    const month = Number.parseInt(numericMatch[2], 10) - 1;
    if (month >= 0 && month <= 11) {
      let year = numericMatch[3] ? Number.parseInt(numericMatch[3], 10) : new Date().getFullYear();
      if (year < 100) year += 2000;
      let date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!numericMatch[3] && date < today) {
        date = new Date(year + 1, month, day);
      }
      return date;
    }
  }

  const match = raw.match(
    /^(\d{1,2})[\/\-. ]([A-Za-z]+)(?:[\/\-. ](\d{2,4}))?$/,
  );
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const monthToken = match[2].toLowerCase();
  const monthKey = monthToken.slice(0, 3);
  const month = monthMap[monthKey];
  if (month === undefined) return null;

  let year = match[3]
    ? Number.parseInt(match[3], 10)
    : new Date().getFullYear();
  if (year < 100) year += 2000;

  let date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!match[3] && date < today) {
    date = new Date(year + 1, month, day);
  }

  return date;
}

function formatDeadline(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeDaysLeft(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / MS_PER_DAY);
}

function getDeadlineClass(daysLeft) {
  if (!Number.isFinite(daysLeft)) return "deadline-unknown";
  if (daysLeft < 0) return "deadline-urgent";
  if (daysLeft < 7) return "deadline-urgent";
  if (daysLeft < 15) return "deadline-soon";
  if (daysLeft < 30) return "deadline-mid";
  return "deadline-safe";
}

function formatDaysLeft(daysLeft) {
  if (!Number.isFinite(daysLeft)) return "Unknown";
  if (daysLeft < 0) return `Overdue ${Math.abs(daysLeft)}d`;
  if (daysLeft === 1) return "1 day";
  return `${daysLeft} days`;
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^\d+\.\s*/, ""));
}

function renderDetailList(listEl, items, emptyText) {
  listEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText;
    listEl.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    listEl.appendChild(li);
  });
}

function createCell(label, className) {
  const cell = document.createElement("div");
  cell.className = className ? `cell ${className}` : "cell";
  cell.dataset.label = label;
  return cell;
}

function buildRow(record, index) {
  const entry = document.createElement("div");
  entry.className = "table-entry";

  const row = document.createElement("div");
  row.className = "table-row";
  row.style.animationDelay = `${index * 70}ms`;

  const schemeName = record.Scheme || "Untitled scheme";
  const rowId = record.row_index ?? record["S.No"] ?? String(index + 1);
  const detailsId = `details-${rowId}-${index}`;

  const schemeCell = createCell("Scheme", "scheme-cell");
  const link = document.createElement("a");
  link.className = "scheme-link";
  link.textContent = schemeName;
  link.href = `scheme.html?row=${encodeURIComponent(rowId)}`;
  schemeCell.appendChild(link);

  const stageParts = [
    record["Stage 1"],
    record["Stage 2"],
    record["Stage 3"],
  ].filter(Boolean);
  if (stageParts.length) {
    const stageLine = document.createElement("div");
    stageLine.className = "scheme-stage";
    stageLine.textContent = stageParts.join(" -> ");
    schemeCell.appendChild(stageLine);
  }

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "row-toggle";
  toggleBtn.textContent = "View pending details";
  toggleBtn.setAttribute("aria-expanded", "false");
  toggleBtn.setAttribute("aria-controls", detailsId);
  schemeCell.appendChild(toggleBtn);

  const totalBudget = parseMoney(record["Government Budget (INR crores)"]);
  const lohumBudget = parseMoney(record["Lohum Incentive Size (INR crores)"]);

  const totalCell = createCell("Government Budget (INR crores)");
  totalCell.textContent = formatCrores(totalBudget);

  const lohumCell = createCell("Lohum Incentive Size (INR crores)");
  lohumCell.textContent = formatCrores(lohumBudget);

  const stage1Deadline = parseDeadline(record["Stage 1 Deadline"]);
  const stage2Deadline = parseDeadline(record["Stage 2 Deadline"]);
  const stage3Deadline = parseDeadline(record["Stage 3 Deadline"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDeadlines = [stage1Deadline, stage2Deadline, stage3Deadline]
    .filter((date) => date)
    .sort((a, b) => a - b);
  const nextDeadline = upcomingDeadlines.find((date) => date >= today);
  const nextDeadlineCell = createCell("Next Deadline");
  const nextDeadlineDate = nextDeadline ? formatDeadline(nextDeadline) : "Unknown";
  const nextDaysLeft = nextDeadline ? computeDaysLeft(nextDeadline) : null;
  const nextDateEl = document.createElement("div");
  nextDateEl.className = "deadline-date";
  nextDateEl.textContent = nextDeadlineDate;
  const nextPill = document.createElement("div");
  nextPill.className = `deadline-pill ${getDeadlineClass(nextDaysLeft)}`;
  nextPill.textContent = formatDaysLeft(nextDaysLeft);
  nextDeadlineCell.appendChild(nextDateEl);
  nextDeadlineCell.appendChild(nextPill);

  const deadlineRaw = record["Timelines (by when)"];
  const fallbackDeadline = parseDeadline(deadlineRaw);
  const finalDeadline = stage3Deadline || fallbackDeadline;
  const finalDeadlineCell = createCell("Final Deadline");
  const finalDeadlineDate = finalDeadline ? formatDeadline(finalDeadline) : deadlineRaw || "Unknown";
  const finalDaysLeft = finalDeadline ? computeDaysLeft(finalDeadline) : null;
  const finalDateEl = document.createElement("div");
  finalDateEl.className = "deadline-date";
  finalDateEl.textContent = finalDeadlineDate;
  const finalPill = document.createElement("div");
  finalPill.className = `deadline-pill ${getDeadlineClass(finalDaysLeft)}`;
  finalPill.textContent = formatDaysLeft(finalDaysLeft);
  finalDeadlineCell.appendChild(finalDateEl);
  finalDeadlineCell.appendChild(finalPill);

  row.appendChild(schemeCell);
  row.appendChild(totalCell);
  row.appendChild(lohumCell);
  row.appendChild(nextDeadlineCell);
  row.appendChild(finalDeadlineCell);

  const details = document.createElement("div");
  details.className = "row-details";
  details.id = detailsId;
  details.hidden = true;

  const detailsGrid = document.createElement("div");
  detailsGrid.className = "details-grid";

  const pendingBlock = document.createElement("div");
  const pendingLabel = document.createElement("div");
  pendingLabel.className = "details-label";
  pendingLabel.textContent = "Pending deliverables";
  const pendingList = document.createElement("ul");
  pendingList.className = "details-list";
  renderDetailList(pendingList, parseList(record["Pending deliverables"]), "None");
  pendingBlock.appendChild(pendingLabel);
  pendingBlock.appendChild(pendingList);

  const statusBlock = document.createElement("div");
  const statusLabel = document.createElement("div");
  statusLabel.className = "details-label";
  statusLabel.textContent = "Where pending";
  const statusList = document.createElement("ul");
  statusList.className = "details-list";
  const statusLines = parseList(record.Status);
  const pendingWhere =
    statusLines.length
      ? statusLines
      : stageParts.map((part, idx) => `Stage ${idx + 1}: ${part}`);
  renderDetailList(statusList, pendingWhere, "Not specified");
  statusBlock.appendChild(statusLabel);
  statusBlock.appendChild(statusList);

  detailsGrid.appendChild(pendingBlock);
  detailsGrid.appendChild(statusBlock);
  details.appendChild(detailsGrid);

  toggleBtn.addEventListener("click", () => {
    const isOpen = !details.hidden;
    details.hidden = isOpen;
    toggleBtn.setAttribute("aria-expanded", String(!isOpen));
    toggleBtn.textContent = isOpen ? "View pending details" : "Hide pending details";
  });

  entry.appendChild(row);
  entry.appendChild(details);

  return entry;
}

function renderDashboard(data) {
  listEl.innerHTML = "";

  const records = Array.isArray(data.records) ? data.records : [];
  schemeCountEl.textContent = records.length ? String(records.length) : "0";
  const totalIncentive = records.reduce(
    (sum, record) => sum + parseMoney(record["Lohum Incentive Size (INR crores)"]),
    0,
  );
  totalIncentiveEl.textContent = records.length ? formatCrores(totalIncentive) : "0";

  const lastUpdated = data.last_modified ? new Date(data.last_modified) : null;
  if (lastUpdated && !Number.isNaN(lastUpdated.getTime())) {
    lastUpdatedEl.textContent = lastUpdated.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } else {
    lastUpdatedEl.textContent = "Unknown";
  }

  if (!records.length) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "table-row loading";
    emptyRow.textContent = "No scheme data found.";
    listEl.appendChild(emptyRow);
    return;
  }

  records.forEach((record, index) => {
    listEl.appendChild(buildRow(record, index));
  });
}

fetch("data.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status}`);
    }
    return response.json();
  })
  .then(renderDashboard)
  .catch((error) => {
    listEl.innerHTML = "";
    const errorRow = document.createElement("div");
    errorRow.className = "table-row loading";
    errorRow.textContent =
      "Unable to load data.json. Check that the file is available.";
    listEl.appendChild(errorRow);
    lastUpdatedEl.textContent = "Unavailable";
    schemeCountEl.textContent = "0";
    totalIncentiveEl.textContent = "0";
    console.error(error);
  });
