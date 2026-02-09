const schemeTitleEl = document.getElementById("scheme-title");
const totalBudgetEl = document.getElementById("total-budget");
const lohumBudgetEl = document.getElementById("lohum-budget");
const daysLeftEl = document.getElementById("days-left");
const deadlineTextEl = document.getElementById("deadline-text");
const daysLeftPillEl = document.getElementById("days-left-pill");
const progressLabelEl = document.getElementById("progress-label");
const progressFillEl = document.getElementById("progress-fill");
const lohumShareEl = document.getElementById("lohum-share");
const remainingShareEl = document.getElementById("remaining-share");
const statusListEl = document.getElementById("status-list");
const pendingListEl = document.getElementById("pending-list");
const ongoingListEl = document.getElementById("ongoing-list");
const completedListEl = document.getElementById("completed-list");
const stage1El = document.getElementById("stage-1");
const stage2El = document.getElementById("stage-2");
const stage3El = document.getElementById("stage-3");
const chartCanvas = document.getElementById("budget-chart");

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

function getDataUrl() {
  const url = new URL("data.json", window.location.href);
  url.searchParams.set("v", Date.now().toString());
  return url.toString();
}

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

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
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

  const match = raw.match(/^(\d{1,2})[\/\-. ]([A-Za-z]+)(?:[\/\-. ](\d{2,4}))?$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const monthToken = match[2].toLowerCase();
  const monthKey = monthToken.slice(0, 3);
  const month = monthMap[monthKey];
  if (month === undefined) return null;

  let year = match[3] ? Number.parseInt(match[3], 10) : new Date().getFullYear();
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

function renderList(listEl, items) {
  listEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "None";
    listEl.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    listEl.appendChild(li);
  });
}

function drawPieChart(canvas, lohum, total) {
  const size = 260;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = size / 2 - 10;
  const lohumValue = Math.max(lohum, 0);
  const totalValue = Math.max(total, 0);
  const remainingValue = Math.max(totalValue - lohumValue, 0);
  const lohumAngle = totalValue > 0 ? (lohumValue / totalValue) * Math.PI * 2 : 0;

  ctx.fillStyle = "#e3d7c7";
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if (lohumAngle > 0) {
    ctx.fillStyle = "#2f7b63";
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + lohumAngle);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#f6f1ea";
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.58, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  const share = totalValue > 0 ? Math.round((lohumValue / totalValue) * 100) : 0;
  ctx.fillStyle = "#0f1f1b";
  ctx.font = '600 24px "Montserrat", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${share}%`, center, center - 4);
  ctx.fillStyle = "#55665d";
  ctx.font = '12px "Montserrat", "Segoe UI", Arial, sans-serif';
  ctx.fillText("Lohum share", center, center + 16);

  return { lohumValue, remainingValue };
}

function applyDeadlineState(daysLeft) {
  const className = getDeadlineClass(daysLeft);
  daysLeftPillEl.className = `days-pill ${className}`;
  daysLeftPillEl.textContent = formatDaysLeft(daysLeft);
  daysLeftEl.className = `stat-value ${className}`;
  daysLeftEl.textContent = formatDaysLeft(daysLeft);
}

function renderScheme(record) {
  const schemeName = record.Scheme || "Untitled scheme";
  schemeTitleEl.textContent = schemeName;
  document.title = `${schemeName} | Scheme detail`;

  const totalBudget = parseMoney(record["Government Budget (INR crores)"]);
  const lohumBudget = parseMoney(record["Lohum Incentive Size (INR crores)"]);

  totalBudgetEl.textContent = `${formatCrores(totalBudget)} INR`;
  lohumBudgetEl.textContent = `${formatCrores(lohumBudget)} INR`;

  const deadlineRaw = record["Timelines (by when)"];
  const deadlineDate = parseDeadline(deadlineRaw);
  deadlineTextEl.textContent = deadlineDate ? formatDeadline(deadlineDate) : deadlineRaw || "Unknown";

  const explicitDays = Number.parseInt(record["Days left"], 10);
  const derivedDays = deadlineDate ? computeDaysLeft(deadlineDate) : null;
  const daysLeft = Number.isFinite(explicitDays) ? explicitDays : derivedDays;
  applyDeadlineState(daysLeft);

  const progressRaw = record.Progress || "0%";
  const progressValue = Number.parseFloat(String(progressRaw).replace(/[^0-9.]/g, ""));
  const progressSafe = Number.isFinite(progressValue) ? Math.min(Math.max(progressValue, 0), 100) : 0;
  progressLabelEl.textContent = `${progressSafe}%`;
  progressFillEl.style.width = `${progressSafe}%`;

  stage1El.textContent = record["Stage 1"] ? `Stage 1: ${record["Stage 1"]}` : "Stage 1: -";
  stage2El.textContent = record["Stage 2"] ? `Stage 2: ${record["Stage 2"]}` : "Stage 2: -";
  stage3El.textContent = record["Stage 3"] ? `Stage 3: ${record["Stage 3"]}` : "Stage 3: -";

  const statusLines = parseList(record.Status);
  renderList(statusListEl, statusLines);

  const pending = parseList(record["Pending deliverables"]);
  const ongoing = parseList(record["Ongoing deliverables"]);
  const completed = parseList(record["Completed deliverables"]);
  renderList(pendingListEl, pending);
  renderList(ongoingListEl, ongoing);
  renderList(completedListEl, completed);

  const { remainingValue } = drawPieChart(chartCanvas, lohumBudget, totalBudget);
  const sharePercent = totalBudget > 0 ? ((lohumBudget / totalBudget) * 100).toFixed(0) : "0";
  lohumShareEl.textContent = `${sharePercent}%`;
  remainingShareEl.textContent = `${formatCrores(remainingValue)} INR`;
}

function renderNotFound() {
  schemeTitleEl.textContent = "Scheme not found";
  statusListEl.innerHTML = "";
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No matching scheme found. Return to the main page to choose a scheme.";
  statusListEl.appendChild(li);
}

function getTargetRecord(records) {
  const params = new URLSearchParams(window.location.search);
  const rowParam = params.get("row");
  const nameParam = params.get("scheme");

  if (rowParam) {
    const matchByRow = records.find((record) => String(record.row_index ?? record["S.No"]) === rowParam);
    if (matchByRow) return matchByRow;
  }

  if (nameParam) {
    const matchByName = records.find((record) => String(record.Scheme) === nameParam);
    if (matchByName) return matchByName;
  }

  return records[0];
}

fetch(getDataUrl(), { cache: "no-store" })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const records = Array.isArray(data.records) ? data.records : [];
    const record = getTargetRecord(records);
    if (!record) {
      renderNotFound();
      return;
    }
    renderScheme(record);
  })
  .catch((error) => {
    renderNotFound();
    console.error(error);
  });
