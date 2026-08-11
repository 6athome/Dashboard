// 분석 대시보드 — Work Item Excel 업로드 + Chart.js
const COLORS = {
  text: '#a4abbb',
  border: '#232838',
  accent: '#6366f1',
  accent2: '#22d3ee',
  past: '#94a3b8',
};

let dataStatus = null;
let excelUpload = null;
let counterEls = {};

const headerMap = {
  id: ['id', '아이디', 'work item id', 'workitemid'],
  title: ['title', '제목', '업무명', 'task name'],
  status: ['status', '상태', '진행상태', '진행'],
  project: ['project', '프로젝트', '프로젝트명'],
  type: ['type', '유형', '카테고리', '분류'],
  assignee: ['assignee', '담당자', '책임자', 'owner'],
  requestReason: ['업무 등록사유', '등록사유', '사유', 'reason'],
  content: ['주요 수행 내용', '수행 내용', '내용', '설명', 'detail'],
  duration: ['업무 소요시간', '소요시간', '작업 시간', 'work time', 'duration'],
  startDate: ['업무 시작일', '시작일', 'start date', 'start'],
  endDate: ['업무 완료일', '완료일', 'end date', '종료일', '마감일', '완료'],
  approver: ['승인자', 'approver'],
  approvalComment: ['승인자 의견', '의견', '코멘트', 'comment'],
};


Chart.defaults.color = COLORS.text;
Chart.defaults.borderColor = COLORS.border;
Chart.defaults.font.family = "'Pretendard', system-ui, sans-serif";

const sampleRows = [
  {
      id: 'WI-001',
    title: '프로세스 단계 정의',
    status: '진행 중',
    project: '프로세스 파트',
    type: '분석',
    assignee: '김민준',
    requestReason: '업무 흐름 명확화',
    content: '프로세스 단계와 담당자 역할 정의',
    duration: 10,
    startDate: new Date('2026-05-17'),
    endDate: null,
  },
  {
    id: 'WI-002',
    title: '워크플로우 개선안 작성',
    status: '완료',
    project: '프로세스 파트',
    type: '기획',
    assignee: '이지수',
    requestReason: '효율성 향상',
    content: '워크플로우 프로세스 문서화 및 개선안 작성',
    duration: 18,
    startDate: new Date('2026-05-12'),
    endDate: new Date('2026-05-20'),
  },
  {
    id: 'WI-003',
    title: '상태별 진행 현황 검수',
    status: '대기',
    project: '프로세스 파트',
    type: '검토',
    assignee: '박서연',
    requestReason: '진행 상태 점검',
    content: '상태별 Work Item 검수 및 이슈 식별',
    duration: 6,
    startDate: new Date('2026-05-20'),
    endDate: null,
  },
  {
    id: 'WI-004',
    title: '담당자 업무 분배 분석',
    status: '완료',
    project: '프로세스 파트',
    type: '분석',
    assignee: '한유진',
    requestReason: '업무 편중 확인',
    content: '담당자별 Work Item 수와 타입 분석',
    duration: 12,
    startDate: new Date('2026-05-08'),
    endDate: new Date('2026-05-16'),
  },
  {
      id: 'WI-005',
    title: '승인 흐름 점검',
    status: '진행 중',
    project: '프로세스 파트',
    type: '검증',
    assignee: '최도윤',
    requestReason: '승인 지연 최소화',
    content: '승인자 의견 및 승인 단계 점검',
    duration: 16,
    startDate: new Date('2026-05-14'),
    endDate: null,
  },
];

let allRows = sampleRows;
let currentRows = sampleRows;

// DOM 초기화는 DOMContentLoaded 후에 수행
function initDOM() {
  dataStatus = document.getElementById('dataStatus');
  excelUpload = document.getElementById('excelUpload');
  counterEls = Object.fromEntries(
    [...document.querySelectorAll('[data-counter-key]')].map((el) => [el.dataset.counterKey, el])
  );


const timelineCtx = document.getElementById('timelineChart').getContext('2d');
const statusCtx = document.getElementById('statusChart').getContext('2d');
const assigneeCtx = document.getElementById('assigneeChart').getContext('2d');

const timelineChart = new Chart(timelineCtx, {
  type: 'line',
  data: {
    labels: sampleRows.map((row) => formatDateLabel(row.startDate || row.endDate)),
    datasets: [
      {
        label: '시작 건수',
        data: sampleRows.map((row) => (row.startDate ? 1 : 0)),
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(99,102,241,.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
      },
      {
        label: '완료 건수',
        data: sampleRows.map((row) => (row.endDate ? 1 : 0)),
        borderColor: COLORS.past,
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 4,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
    scales: {
      y: { grid: { color: COLORS.border }, ticks: { precision: 0 } },
      x: { grid: { display: false } },
    },
  },
});

const statusChart = new Chart(statusCtx, {
  type: 'doughnut',
  data: {
    labels: sampleRows.map((row) => row.status),
    datasets: [
      {
        data: countBy(sampleRows, 'status').map(([, count]) => count),
        backgroundColor: ['#22c55e', '#6366f1', '#f59e0b', '#ef4444'],
        borderColor: '#161a25',
        borderWidth: 3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 14, boxWidth: 12 } },
    },
  },
});

const assigneeChart = new Chart(assigneeCtx, {
  type: 'bar',
  data: {
    labels: countBy(sampleRows, 'assignee').map(([name]) => name),
    datasets: [
      {
        label: 'Work Items',
        data: countBy(sampleRows, 'assignee').map(([, count]) => count),
        backgroundColor: COLORS.accent,
        borderRadius: 8,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: COLORS.border }, ticks: { precision: 0 } },
      x: { grid: { display: false } },
    },
  },
});

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^0-9a-z가-힣 ]/g, '');
}

function findHeaderKey(keys, candidates) {
  const normalizedCandidates = candidates.map((item) => normalizeKey(item));
  return Object.keys(keys).find((raw) => {
    const normalized = normalizeKey(raw);
    return normalizedCandidates.some((candidate) => normalized.includes(candidate));
  });
}

function parseNumber(value) {
  if (value == null || value === '') return NaN;
  const normalized = String(value).replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  return Number(normalized);
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value == null || value === '') return null;
  const text = String(value).trim();
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date;
  const num = Number(text);
  if (!Number.isNaN(num)) return new Date((num - 25569) * 86400000);
  return null;
}

function formatDateLabel(date) {
  if (!(date instanceof Date)) return '-';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function average(values) {
  const list = values.filter(Number.isFinite);
  if (!list.length) return 0;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function countBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const label = row[key] || '기타';
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function buildTimeline(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (row.startDate) {
      const label = formatDateLabel(row.startDate);
      map.set(label, { ...(map.get(label) || { start: 0, done: 0 }), start: (map.get(label)?.start || 0) + 1 });
    }
    if (row.endDate) {
      const label = formatDateLabel(row.endDate);
      map.set(label, { ...(map.get(label) || { start: 0, done: 0 }), done: (map.get(label)?.done || 0) + 1 });
    }
  });
    const labels = [...map.keys()].sort((a, b) => {
    const dateA = new Date(`2026/${a}`);
    const dateB = new Date(`2026/${b}`);
    return dateA - dateB;
  });
  return {
    labels,
    starts: labels.map((label) => map.get(label)?.start || 0),
    dones: labels.map((label) => map.get(label)?.done || 0),
  };
}

function extractKeywords(rows) {
  const stopwords = new Set(['및', '그리고', '로', '에', '의', '가', '이', '를', '은', '는', '으로', '하기', '함', '수', '할']);
  const freq = new Map();
  rows.forEach((row) => {
    const content = `${row.title || ''} ${row.content || ''}`;
    const tokens = content
      .toLowerCase()
      .replace(/[^0-9a-z가-힣 ]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token && token.length > 1 && !stopwords.has(token));
    tokens.forEach((token) => freq.set(token, (freq.get(token) || 0) + 1));
  });
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeKey(key)] = value;
  });

  const find = (candidates) => {
    const rawKey = findHeaderKey(normalized, candidates);
    return rawKey ? normalized[rawKey] : null;
  };

  const item = {
    id: find(headerMap.id),
    title: find(headerMap.title),
    status: find(headerMap.status),
    project: find(headerMap.project),
    type: find(headerMap.type),
    assignee: find(headerMap.assignee),
    requestReason: find(headerMap.requestReason),
    content: find(headerMap.content),
    duration: parseNumber(find(headerMap.duration)),
    startDate: parseDateValue(find(headerMap.startDate)),
    endDate: parseDateValue(find(headerMap.endDate)),
    approver: find(headerMap.approver),
    approvalComment: find(headerMap.approvalComment),
  };

  if (!Number.isFinite(item.duration) && item.startDate && item.endDate) {
    item.duration = (item.endDate - item.startDate) / 3600000;
  }

  return item;
}

function buildRows(rawRows) {
  return rawRows.map(normalizeRow).filter((row) => row.id || row.title || row.status);
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0));
}

function updateCounters(metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    const el = counterEls[key];
    if (!el) return;
    el.textContent = Number.isFinite(value) ? Math.round(value).toLocaleString('ko-KR') : '0';
  });
}

function updateStatus(message, isError = false) {
  dataStatus.textContent = message;
  dataStatus.classList.toggle('error', isError);
}

function updateLineChart(chart, labels, starts, dones) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = starts;
  chart.data.datasets[1].data = dones;
  chart.update();
}

function updateDoughnut(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

function updateBarChart(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

function updateSummary(types, statuses, projects, keywords) {
  document.getElementById('topTypes').textContent = types.length ? types.join(' · ') : '-';
  document.getElementById('topStatuses').textContent = statuses.length ? statuses.join(' · ') : '-';
  document.getElementById('topProjects').textContent = projects.length ? projects.join(' · ') : '-';
  document.getElementById('topKeywords').textContent = keywords.length ? keywords.join(' · ') : '-';
}

function updateRecentItems(rows) {
  const tbody = document.getElementById('recentItemsBody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6">데이터를 업로드하면 최근 항목이 표시됩니다.</td></tr>';
    return;
  }
  tbody.innerHTML = rows
    .slice(-5)
    .reverse()
    .map((row) => {
      const doneDate = row.endDate ? formatDateLabel(row.endDate) : '-';
      return `<tr><td>${row.id || '-'}</td><td>${row.title || '-'}</td><td>${row.assignee || '-'}</td><td>${row.project || '-'}</td><td>${row.status || '-'}</td><td>${doneDate}</td></tr>`;
    })
    .join('');
}

function updateDashboard(rawRows, rangeDays = null) {
  const rows = buildRows(rawRows);
  const sortedRows = sortRows(rows);
  allRows = sortedRows;
  currentRows = rangeDays && sortedRows.length > rangeDays ? sortedRows.slice(-rangeDays) : sortedRows;

  const statusCounts = countBy(currentRows, 'status');
  const assigneeCounts = countBy(currentRows, 'assignee');
  const typeCounts = countBy(currentRows, 'type');
  const projectCounts = countBy(currentRows, 'project');

  const total = currentRows.length;
  const inProgress = currentRows.filter((row) => String(row.status).includes('진행')).length;
  const completed = currentRows.filter((row) => String(row.status).includes('완료')).length;
  const averageDuration = average(currentRows.map((row) => row.duration));

  const timeline = buildTimeline(currentRows);
  updateLineChart(timelineChart, timeline.labels, timeline.starts, timeline.dones);

  updateDoughnut(
    statusChart,
    statusCounts.map(([name]) => name),
    statusCounts.map(([, count]) => count)
  );

  updateBarChart(
    assigneeChart,
    assigneeCounts.map(([name]) => name),
    assigneeCounts.map(([, count]) => count)
  );

  updateCounters({
    totalWorkItems: total,
    inProgress,
    completed,
    averageDuration: Math.round(averageDuration),
  });

  updateSummary(
    typeCounts.slice(0, 3).map(([name, count]) => `${name}(${count})`),
    statusCounts.slice(0, 3).map(([name, count]) => `${name}(${count})`),
    projectCounts.slice(0, 3).map(([name, count]) => `${name}(${count})`),
    extractKeywords(currentRows)
  );

  updateRecentItems(sortedRows);
}

function parseWorkbook(data, fileName) {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
    if (!rows || rows.length === 0) {
      updateStatus('시트에 데이터가 없습니다. 다른 파일을 시도해 주세요.', true);
      return;
    }
    updateDashboard(rows);
    updateStatus(`'${fileName}' 업로드 완료. 대시보드가 갱신되었습니다.`);
  } catch (error) {
    console.error(error);
    updateStatus('엑셀 파일을 열 수 없거나 형식이 올바르지 않습니다.', true);
  }
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const allowed = /\.(xlsx|xls|csv)$/i;
  if (!allowed.test(file.name)) {
    updateStatus('xlsx, xls, csv 파일만 업로드할 수 있습니다.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => parseWorkbook(e.target.result, file.name);
  reader.readAsArrayBuffer(file);
}

excelUpload.addEventListener('change', handleUpload);

document.querySelectorAll('.range').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range').forEach((b) => (b.dataset.active = 'false'));
    btn.dataset.active = 'true';
    const range = Number(btn.dataset.range);
    updateDashboard(allRows, range);
  });
});

updateDashboard(sampleRows);
updateStatus('샘플 데이터가 로드되었습니다. Excel 파일을 업로드하면 대시보드가 갱신됩니다.');
