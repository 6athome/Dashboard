// 6athome Dashboard
// Excel upload -> dashboard refresh
(() => {
  'use strict';

  const COLORS = {
    text: '#a4abbb',
    border: '#232838',
    accent: '#6366f1',
    past: '#94a3b8'
  };

  const headerMap = {
    id: ['id', '아이디', 'work item id', 'workitemid', '업무 id', '업무id'],
    title: ['title', '제목', '업무명', 'task name', '업무'],
    status: ['status', '상태', '진행상태', '진행', '업무상태'],
    project: ['project', '프로젝트', '프로젝트명'],
    type: ['type', '유형', '카테고리', '분류', '업무유형'],
    assignee: ['assignee', '담당자', '책임자', 'owner', '담당'],
    requestReason: ['업무 등록사유', '등록사유', '사유', 'reason'],
    content: ['주요 수행 내용', '수행 내용', '내용', '설명', 'detail', '상세내용'],
    duration: ['업무 소요시간', '소요시간', '작업 시간', 'work time', 'duration', '시간'],
    startDate: ['업무 시작일', '시작일', 'start date', 'start', '시작'],
    endDate: ['업무 완료일', '완료일', 'end date', '종료일', '마감일', '완료'],
    approver: ['승인자', 'approver', '승인 담당자'],
    approvalComment: ['승인자 의견', '의견', '코멘트', 'comment', '승인의견']
  };

  const sampleRows = [
    {
      id: 'WI-001',
      title: '프로세스 단계 정의',
      status: '진행 중',
      project: '프로세스 파트',
      type: '분석',
      assignee: '김민준',
      content: '프로세스 단계와 담당자 역할 정의',
      duration: 10,
      startDate: new Date('2026-05-17'),
      endDate: null
    },
    {
      id: 'WI-002',
      title: '워크플로우 개선안 작성',
      status: '완료',
      project: '프로세스 파트',
      type: '기획',
      assignee: '이지수',
      content: '워크플로우 프로세스 문서화 및 개선안 작성',
      duration: 18,
      startDate: new Date('2026-05-12'),
      endDate: new Date('2026-05-20')
    },
    {
      id: 'WI-003',
      title: '상태별 진행 현황 검수',
      status: '대기',
      project: '프로세스 파트',
      type: '검토',
      assignee: '박서연',
      content: '상태별 Work Item 검수 및 이슈 식별',
      duration: 6,
      startDate: new Date('2026-05-20'),
      endDate: null
    },
    {
      id: 'WI-004',
      title: '담당자 업무 분배 분석',
      status: '완료',
      project: '프로세스 파트',
      type: '분석',
      assignee: '한유진',
      content: '담당자별 Work Item 수와 타입 분석',
      duration: 12,
      startDate: new Date('2026-05-08'),
      endDate: new Date('2026-05-16')
    },
    {
      id: 'WI-005',
      title: '승인 흐름 점검',
      status: '진행 중',
      project: '프로세스 파트',
      type: '검증',
      assignee: '최도윤',
      content: '승인자 의견 및 승인 단계 점검',
      duration: 16,
      startDate: new Date('2026-05-14'),
      endDate: null
    }
  ];

  let allRows = [...sampleRows];
  let currentRows = [...sampleRows];

  let timelineChart = null;
  let statusChart = null;
  let assigneeChart = null;

  let dataStatus = null;
  let excelUpload = null;
  let counterEls = {};

  // ==========================================
  // 기본 유틸
  // ==========================================

  function normalizeKey(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[_\-./()[\]]/g, '');
  }

  function findHeader(row, candidates) {
    const keys = Object.keys(row);
    const normalizedCandidates = candidates.map(normalizeKey);

    return keys.find(key => {
      const normalizedKey = normalizeKey(key);

      return normalizedCandidates.some(candidate =>
        normalizedKey === candidate ||
        normalizedKey.includes(candidate) ||
        candidate.includes(normalizedKey)
      );
    });
  }

  function valueFor(row, candidates) {
    const key = findHeader(row, candidates);
    return key ? row[key] : null;
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return NaN;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : NaN;
    }

    const cleaned = String(value)
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');

    if (!cleaned) {
      return NaN;
    }

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : NaN;
  }

  function parseDateValue(value) {
    if (
      value instanceof Date &&
      !Number.isNaN(value.getTime())
    ) {
      return value;
    }

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    // Excel serial date
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      const date = new Date(
        Math.round((value - 25569) * 86400 * 1000)
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const text = String(value).trim();

    // YYYY-MM-DD
    // YYYY.MM.DD
    // YYYY/MM/DD
    const match = text.match(
      /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/
    );

    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const date = new Date(text);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function formatDate(date) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(date.getTime())
    ) {
      return '-';
    }

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  }

  function formatDateLabel(date) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(date.getTime())
    ) {
      return '-';
    }

    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function countBy(rows, key) {
    const map = new Map();

    rows.forEach(row => {
      const value = row[key] || '미지정';

      map.set(
        value,
        (map.get(value) || 0) + 1
      );
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1]);
  }

  function average(values) {
    const valid = values.filter(
      Number.isFinite
    );

    if (!valid.length) {
      return 0;
    }

    return valid.reduce(
      (sum, value) => sum + value,
      0
    ) / valid.length;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char])
    );
  }

  // ==========================================
  // Excel 데이터 정규화
  // ==========================================

  function normalizeRow(raw) {
    const row = {
      id: valueFor(raw, headerMap.id),

      title: valueFor(
        raw,
        headerMap.title
      ),

      status: valueFor(
        raw,
        headerMap.status
      ),

      project: valueFor(
        raw,
        headerMap.project
      ),

      type: valueFor(
        raw,
        headerMap.type
      ),

      assignee: valueFor(
        raw,
        headerMap.assignee
      ),

      requestReason: valueFor(
        raw,
        headerMap.requestReason
      ),

      content: valueFor(
        raw,
        headerMap.content
      ),

      duration: parseNumber(
        valueFor(raw, headerMap.duration)
      ),

      startDate: parseDateValue(
        valueFor(raw, headerMap.startDate)
      ),

      endDate: parseDateValue(
        valueFor(raw, headerMap.endDate)
      ),

      approver: valueFor(
        raw,
        headerMap.approver
      ),

      approvalComment: valueFor(
        raw,
        headerMap.approvalComment
      )
    };

    // 소요시간이 비어있고 시작/완료일이 있다면 자동 계산
    if (
      !Number.isFinite(row.duration) &&
      row.startDate &&
      row.endDate
    ) {
      row.duration =
        (
          row.endDate.getTime() -
          row.startDate.getTime()
        ) / 3600000;
    }

    return row;
  }

  function buildRows(rawRows) {
    return rawRows
      .map(normalizeRow)
      .filter(row =>
        row.id ||
        row.title ||
        row.status ||
        row.project ||
        row.assignee
      );
  }

  function sortRows(rows) {
    return [...rows].sort(
      (a, b) =>
        (a.startDate?.getTime() || 0) -
        (b.startDate?.getTime() || 0)
    );
  }

  // ==========================================
  // 분석 데이터
  // ==========================================

  function buildTimeline(rows) {
    const map = new Map();

    rows.forEach(row => {

      if (row.startDate) {
        const key =
          formatDateLabel(row.startDate);

        const value =
          map.get(key) || [0, 0];

        value[0]++;

        map.set(key, value);
      }

      if (row.endDate) {
        const key =
          formatDateLabel(row.endDate);

        const value =
          map.get(key) || [0, 0];

        value[1]++;

        map.set(key, value);
      }
    });

    const labels = [...map.keys()];

    return {
      labels,

      starts: labels.map(
        key => map.get(key)[0]
      ),

      dones: labels.map(
        key => map.get(key)[1]
      )
    };
  }

  function extractKeywords(rows) {
    const stopWords = new Set([
      '및',
      '그리고',
      '으로',
      '에서',
      '에',
      '의',
      '가',
      '이',
      '를',
      '은',
      '는',
      '로',
      '와',
      '과',
      '하기',
      '함',
      '수',
      '할',
      '대한',
      '관련'
    ]);

    const map = new Map();

    rows.forEach(row => {

      const text =
        `${row.title || ''} ${row.content || ''}`;

      text
        .toLowerCase()
        .replace(
          /[^0-9a-z가-힣]+/g,
          ' '
        )
        .split(/\s+/)
        .filter(word =>
          word.length > 1 &&
          !stopWords.has(word)
        )
        .forEach(word => {

          map.set(
            word,
            (map.get(word) || 0) + 1
          );

        });
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(item => item[0]);
  }

  // ==========================================
  // 화면 업데이트
  // ==========================================

  function updateStatus(
    message,
    isError = false
  ) {
    if (!dataStatus) {
      return;
    }

    dataStatus.textContent =
      message;

    dataStatus.classList.toggle(
      'error',
      isError
    );
  }

  function updateCounters(metrics) {
    Object.entries(metrics)
      .forEach(([key, value]) => {

        const element =
          counterEls[key];

        if (!element) {
          return;
        }

        element.textContent =
          Number.isFinite(value)
            ? Math.round(value)
                .toLocaleString('ko-KR')
            : '0';

      });
  }

  function updateRecent(rows) {
    const tbody =
      document.getElementById(
        'recentItemsBody'
      );

    if (!tbody) {
      return;
    }

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="6">데이터가 없습니다.</td></tr>';

      return;
    }

    const recentRows =
      rows
        .slice()
        .sort(
          (a, b) =>
            (b.startDate?.getTime() || 0) -
            (a.startDate?.getTime() || 0)
        )
        .slice(0, 5);

    tbody.innerHTML =
      recentRows
        .map(row => `
          <tr>
            <td>${escapeHtml(row.id || '-')}</td>
            <td>${escapeHtml(row.title || '-')}</td>
            <td>${escapeHtml(row.assignee || '-')}</td>
            <td>${escapeHtml(row.project || '-')}</td>
            <td>${escapeHtml(row.status || '-')}</td>
            <td>${formatDate(row.endDate)}</td>
          </tr>
        `)
        .join('');
  }

  function updateSummary(
    types,
    statuses,
    projects,
    keywords
  ) {
    const update = (
      id,
      value
    ) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          value || '-';
      }
    };

    update(
      'topTypes',
      types.join(' · ')
    );

    update(
      'topStatuses',
      statuses.join(' · ')
    );

    update(
      'topProjects',
      projects.join(' · ')
    );

    update(
      'topKeywords',
      keywords.join(' · ')
    );
  }

  // ==========================================
  // 전체 대시보드 갱신
  // ==========================================

  function updateDashboard(
    rawRows,
    rangeDays = null
  ) {
    const rows =
      sortRows(
        buildRows(rawRows)
      );

    allRows = rows;

    if (
      rangeDays &&
      Number.isFinite(rangeDays) &&
      rows.length > rangeDays
    ) {
      currentRows =
        rows.slice(-rangeDays);
    } else {
      currentRows = rows;
    }

    const statuses =
      countBy(
        currentRows,
        'status'
      );

    const assignees =
      countBy(
        currentRows,
        'assignee'
      );

    const types =
      countBy(
        currentRows,
        'type'
      );

    const projects =
      countBy(
        currentRows,
        'project'
      );

    const timeline =
      buildTimeline(
        currentRows
      );

    // --------------------------
    // 타임라인
    // --------------------------

    if (timelineChart) {

      timelineChart.data.labels =
        timeline.labels;

      timelineChart.data
        .datasets[0]
        .data =
        timeline.starts;

      timelineChart.data
        .datasets[1]
        .data =
        timeline.dones;

      timelineChart.update();
    }

    // --------------------------
    // 상태 차트
    // --------------------------

    if (statusChart) {

      statusChart.data.labels =
        statuses.map(
          item => item[0]
        );

      statusChart.data
        .datasets[0]
        .data =
        statuses.map(
          item => item[1]
        );

      statusChart.update();
    }

    // --------------------------
    // 담당자 차트
    // --------------------------

    if (assigneeChart) {

      assigneeChart.data.labels =
        assignees.map(
          item => item[0]
        );

      assigneeChart.data
        .datasets[0]
        .data =
        assignees.map(
          item => item[1]
        );

      assigneeChart.update();
    }

    // --------------------------
    // KPI
    // --------------------------

    const inProgress =
      currentRows.filter(
        row =>
          String(
            row.status || ''
          ).includes('진행')
      ).length;

    const completed =
      currentRows.filter(
        row =>
          String(
            row.status || ''
          ).includes('완료')
      ).length;

    updateCounters({

      totalWorkItems:
        currentRows.length,

      inProgress,

      completed,

      averageDuration:
        Math.round(
          average(
            currentRows.map(
              row => row.duration
            )
          )
        )

    });

    // --------------------------
    // 요약
    // --------------------------

    updateSummary(

      types
        .slice(0, 3)
        .map(
          item =>
            `${item[0]}(${item[1]})`
        ),

      statuses
        .slice(0, 3)
        .map(
          item =>
            `${item[0]}(${item[1]})`
        ),

      projects
        .slice(0, 3)
        .map(
          item =>
            `${item[0]}(${item[1]})`
        ),

      extractKeywords(
        currentRows
      )
    );

    // --------------------------
    // 최근 업무
    // --------------------------

    updateRecent(rows);
  }

  // ==========================================
  // Excel 파일 처리
  // ==========================================

  function parseWorkbook(
    data,
    fileName
  ) {
    try {

      if (
        typeof XLSX === 'undefined'
      ) {
        throw new Error(
          'XLSX 라이브러리가 로드되지 않았습니다.'
        );
      }

      const workbook =
        XLSX.read(
          data,
          {
            type: 'array',
            cellDates: true
          }
        );

      if (
        !workbook.SheetNames.length
      ) {
        throw new Error(
          '엑셀 파일에 시트가 없습니다.'
        );
      }

      // 첫 번째 시트
      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      if (!worksheet) {
        throw new Error(
          '첫 번째 시트를 읽을 수 없습니다.'
        );
      }

      const rawRows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: null,
            raw: true
          }
        );

      if (!rawRows.length) {

        updateStatus(
          '첫 번째 시트에 데이터가 없습니다.',
          true
        );

        return;
      }

      const rows =
        buildRows(rawRows);

      // 인식된 데이터가 없을 경우
      if (!rows.length) {

        console.warn(
          '[6athome] Excel headers:',
          Object.keys(
            rawRows[0] || {}
          )
        );

        updateStatus(
          '업무 데이터를 인식하지 못했습니다. 첫 번째 행이 컬럼명인지 확인해주세요.',
          true
        );

        return;
      }

      // 대시보드 전체 갱신
      updateDashboard(
        rawRows
      );

      updateStatus(
        `'${fileName}' 업로드 완료 · ${rows.length.toLocaleString('ko-KR')}건 반영`
      );

      console.info(
        '[6athome] Excel loaded:',
        rows
      );

    } catch (error) {

      console.error(
        '[6athome] Excel parsing error:',
        error
      );

      updateStatus(
        `엑셀 처리 오류: ${error.message}`,
        true
      );
    }
  }

  function handleUpload(event) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // 파일 확장자 확인
    if (
      !/\.(xlsx|xls|csv)$/i
        .test(file.name)
    ) {

      updateStatus(
        'xlsx, xls, csv 파일만 업로드할 수 있습니다.',
        true
      );

      event.target.value = '';

      return;
    }

    updateStatus(
      `'${file.name}' 파일을 읽는 중입니다...`
    );

    const reader =
      new FileReader();

    reader.onload =
      event => {

        parseWorkbook(
          event.target.result,
          file.name
        );

      };

    reader.onerror =
      () => {

        updateStatus(
          '파일을 읽지 못했습니다.',
          true
        );

      };

    reader.readAsArrayBuffer(
      file
    );
  }

  // ==========================================
  // Chart 생성
  // ==========================================

  function createCharts() {

    if (
      typeof Chart === 'undefined'
    ) {

      updateStatus(
        'Chart.js가 로드되지 않았습니다. index.html의 Chart.js CDN을 확인해주세요.',
        true
      );

      return false;
    }

    const timelineCanvas =
      document.getElementById(
        'timelineChart'
      );

    const statusCanvas =
      document.getElementById(
        'statusChart'
      );

    const assigneeCanvas =
      document.getElementById(
        'assigneeChart'
      );

    if (
      !timelineCanvas ||
      !statusCanvas ||
      !assigneeCanvas
    ) {

      updateStatus(
        '차트 영역을 찾을 수 없습니다. index.html의 canvas ID를 확인해주세요.',
        true
      );

      return false;
    }

    Chart.defaults.color =
      COLORS.text;

    Chart.defaults.borderColor =
      COLORS.border;

    Chart.defaults.font.family =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    // --------------------------
    // Timeline
    // --------------------------

    timelineChart =
      new Chart(
        timelineCanvas,
        {
          type: 'line',

          data: {

            labels: [],

            datasets: [

              {
                label: '시작 건수',
                data: [],
                borderColor:
                  COLORS.accent,
                backgroundColor:
                  'rgba(99,102,241,.12)',
                tension: 0.35,
                fill: true,
                pointRadius: 4
              },

              {
                label: '완료 건수',
                data: [],
                borderColor:
                  COLORS.past,
                backgroundColor:
                  'transparent',
                borderDash: [
                  4,
                  4
                ],
                tension: 0.35,
                pointRadius: 4
              }

            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio:
              false,

            plugins: {

              legend: {
                display: true,

                labels: {
                  boxWidth: 12
                }
              }

            },

            scales: {

              y: {

                beginAtZero:
                  true,

                grid: {
                  color:
                    COLORS.border
                },

                ticks: {
                  precision: 0
                }

              },

              x: {

                grid: {
                  display: false
                }

              }

            }

          }

        }
      );

    // --------------------------
    // Status
    // --------------------------

    statusChart =
      new Chart(
        statusCanvas,
        {
          type: 'doughnut',

          data: {

            labels: [],

            datasets: [

              {
                data: [],

                backgroundColor: [
                  '#22c55e',
                  '#6366f1',
                  '#f59e0b',
                  '#ef4444',
                  '#94a3b8'
                ],

                borderColor:
                  '#161a25',

                borderWidth: 3
              }

            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio:
              false,

            cutout: '68%',

            plugins: {

              legend: {

                position:
                  'bottom',

                labels: {

                  padding: 14,

                  boxWidth: 12

                }

              }

            }

          }

        }
      );

    // --------------------------
    // Assignee
    // --------------------------

    assigneeChart =
      new Chart(
        assigneeCanvas,
        {
          type: 'bar',

          data: {

            labels: [],

            datasets: [

              {
                label:
                  'Work Items',

                data: [],

                backgroundColor:
                  COLORS.accent,

                borderRadius: 8
              }

            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio:
              false,

            plugins: {

              legend: {
                display: false
              }

            },

            scales: {

              y: {

                beginAtZero:
                  true,

                grid: {
                  color:
                    COLORS.border
                },

                ticks: {
                  precision: 0
                }

              },

              x: {

                grid: {
                  display: false
                }

              }

            }

          }

        }
      );

    return true;
  }

  // ==========================================
  // 기간 필터
  // ==========================================

  function initRangeButtons() {

    document
      .querySelectorAll('.range')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            document
              .querySelectorAll('.range')
              .forEach(item => {
                item.dataset.active =
                  'false';
              });

            button.dataset.active =
              'true';

            const range =
              Number(
                button.dataset.range
              );

            if (
              Number.isFinite(range) &&
              range > 0
            ) {

              updateDashboard(
                allRows,
                range
              );

            } else {

              updateDashboard(
                allRows
              );

            }

          }
        );

      });
  }

  // ==========================================
  // 초기화
  // ==========================================

  function init() {

    dataStatus =
      document.getElementById(
        'dataStatus'
      );

    excelUpload =
      document.getElementById(
        'excelUpload'
      );

    counterEls =
      Object.fromEntries(

        [
          ...document.querySelectorAll(
            '[data-counter-key]'
          )
        ]

        .map(element => [
          element.dataset.counterKey,
          element
        ])

      );

    // Excel input 이벤트
    if (excelUpload) {

      excelUpload.addEventListener(
        'change',
        handleUpload
      );

    } else {

      console.warn(
        '[6athome] #excelUpload element not found.'
      );

    }

    // Chart 초기화
    if (!createCharts()) {
      return;
    }

    // 기간 버튼
    initRangeButtons();

    // 최초 샘플 데이터
    updateDashboard(
      sampleRows
    );

    updateStatus(
      '샘플 데이터가 로드되었습니다. Excel 파일을 업로드하면 대시보드가 자동으로 갱신됩니다.'
    );

    console.info(
      '[6athome] Dashboard initialized.'
    );
  }

  // ==========================================
  // DOM 준비 후 실행
  // ==========================================

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
