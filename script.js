// 분석 대시보드 — Chart.js + KPI 카운트업 + 기간 토글
const COLORS = {
  text: '#a4abbb',
  border: '#232838',
  accent: '#6366f1',
  accent2: '#22d3ee',
  past: '#94a3b8',
};

Chart.defaults.color = COLORS.text;
Chart.defaults.borderColor = COLORS.border;
Chart.defaults.font.family = "'Pretendard', system-ui, sans-serif";

// KPI 카운트업
document.querySelectorAll('[data-counter]').forEach((el) => {
  const target = Number(el.dataset.counter);
  const isFloat = !Number.isInteger(target);
  const duration = 1100;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = target * eased;
    el.textContent = isFloat ? v.toFixed(1) : Math.floor(v).toLocaleString('ko-KR');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

// 기간 토글 (시각 효과만)
document.querySelectorAll('.range').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range').forEach((b) => b.dataset.active = 'false');
    btn.dataset.active = 'true';
  });
});

// 매출 추이 (Line)
const lineCtx = document.getElementById('lineChart').getContext('2d');
const labels = ['월', '화', '수', '목', '금', '토', '일'];
new Chart(lineCtx, {
  type: 'line',
  data: {
    labels,
    datasets: [
      {
        label: '이번 기간',
        data: [4200, 5800, 5100, 6900, 7800, 9200, 9620],
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(99,102,241,.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: COLORS.accent,
        pointRadius: 4,
      },
      {
        label: '지난 기간',
        data: [3900, 4800, 4500, 5400, 6200, 7100, 7800],
        borderColor: COLORS.past,
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: COLORS.border }, ticks: { callback: (v) => '₩' + (v/1000).toFixed(0) + 'k' } },
      x: { grid: { display: false } },
    },
  },
});

// 채널별 매출 (Doughnut)
const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
new Chart(doughnutCtx, {
  type: 'doughnut',
  data: {
    labels: ['웹', '모바일', '제휴', '직접'],
    datasets: [{
      data: [42, 28, 18, 12],
      backgroundColor: ['#6366f1', '#22d3ee', '#a78bfa', '#f0abfc'],
      borderColor: '#161a25',
      borderWidth: 3,
    }],
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

// 요일별 주문 (Bar)
const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      label: '주문',
      data: [142, 184, 168, 220, 248, 312, 295],
      backgroundColor: COLORS.accent,
      borderRadius: 8,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: COLORS.border } },
      x: { grid: { display: false } },
    },
  },
});
