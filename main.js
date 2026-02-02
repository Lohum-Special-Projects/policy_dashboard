const listEl = document.getElementById("scheme-list");
const lastUpdatedEl = document.getElementById("last-updated");
const schemeCountEl = document.getElementById("scheme-count");

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

function parseDeadline(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
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

function createCell(label, className) {
  const cell = document.createElement("div");
  cell.className = className ? `cell ${className}` : "cell";
  cell.dataset.label = label;
  return cell;
}

function buildRow(record, index) {
  const row = document.createElement("div");
  row.className = "table-row";
  row.style.animationDelay = `${index * 70}ms`;

  const schemeName = record.Scheme || "Untitled scheme";
  const rowId = record.row_index ?? record["S.No"] ?? String(index + 1);

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

  const totalBudget = parseMoney(record["Government Budget (INR crores)"]);
  const lohumBudget = parseMoney(record["Lohum Incentive Size (INR crores)"]);

  const totalCell = createCell("Total budget (INR crores)");
  totalCell.textContent = formatCrores(totalBudget);

  const lohumCell = createCell("Lohum applied (INR crores)");
  lohumCell.textContent = formatCrores(lohumBudget);

  const deadlineRaw = record["Timelines (by when)"];
  const deadlineDate = parseDeadline(deadlineRaw);
  const deadlineCell = createCell("Deadline");
  deadlineCell.textContent = deadlineDate
    ? formatDeadline(deadlineDate)
    : deadlineRaw || "Unknown";

  const explicitDays = Number.parseInt(record["Days left"], 10);
  const derivedDays = deadlineDate ? computeDaysLeft(deadlineDate) : null;
  const daysLeft = Number.isFinite(explicitDays) ? explicitDays : derivedDays;

  const daysCell = createCell("Days left");
  const pill = document.createElement("div");
  pill.className = `deadline-pill ${getDeadlineClass(daysLeft)}`;
  pill.textContent = formatDaysLeft(daysLeft);
  daysCell.appendChild(pill);

  row.appendChild(schemeCell);
  row.appendChild(totalCell);
  row.appendChild(lohumCell);
  row.appendChild(deadlineCell);
  row.appendChild(daysCell);

  return row;
}

function renderDashboard(data) {
  listEl.innerHTML = "";

  const records = Array.isArray(data.records) ? data.records : [];
  schemeCountEl.textContent = records.length ? String(records.length) : "0";

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
    console.error(error);
  });
