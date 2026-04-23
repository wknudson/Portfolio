(() => {
  'use strict';

  const CSV_URL = 'WorldCup2026/predictions_2026.csv';
  const PROB_COLS = ['P(R32)', 'P(R16)', 'P(QF)', 'P(SF)', 'P(Final)', 'P(Champion)'];

  const state = {
    rows: [],
    metric: 'P(Champion)',
    topN: 10,
    conf: 'all',
    sortKey: 'P(Champion)',
    sortDir: 'desc',
    chart: null,
  };

  /* ---------- CSV parsing ---------- */
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(',');
    const rows = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = line.split(',');
      const obj = {};
      headers.forEach((h, i) => {
        const raw = cells[i];
        obj[h] = raw === undefined ? '' : raw;
      });
      PROB_COLS.forEach((k) => {
        obj[k] = parseFloat(obj[k]) || 0;
      });
      obj.elo_2022 = parseFloat(obj.elo_2022) || 0;
      rows.push(obj);
    }
    return rows;
  }

  /* ---------- Theming ---------- */
  function readThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      accent: cs.getPropertyValue('--accent').trim() || '#fb923c',
      text: cs.getPropertyValue('--text').trim() || '#e4e4e7',
      muted: cs.getPropertyValue('--text-muted').trim() || '#a1a1aa',
      border: cs.getPropertyValue('--border').trim() || '#27272a',
      bgCard: cs.getPropertyValue('--bg-card').trim() || '#141414',
    };
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '').trim();
    if (clean.length !== 6) return hex;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* ---------- Chart ---------- */
  function renderChart() {
    const canvas = document.getElementById('wc-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const metric = state.metric;
    const sorted = [...state.rows].sort((a, b) => b[metric] - a[metric]);
    const slice = sorted.slice(0, state.topN);

    const labels = slice.map((r) => r.team);
    const values = slice.map((r) => r[metric]);
    const colors = readThemeColors();

    const data = {
      labels,
      datasets: [{
        label: metric,
        data: values,
        backgroundColor: hexToRgba(colors.accent, 0.75),
        hoverBackgroundColor: colors.accent,
        borderColor: colors.accent,
        borderWidth: 1,
        borderRadius: 4,
      }],
    };

    const config = {
      type: 'bar',
      data,
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.bgCard,
            titleColor: colors.text,
            bodyColor: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${metric}: ${(ctx.parsed.x * 100).toFixed(2)}%`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: Math.min(1, Math.max(...values) * 1.15 || 0.2),
            ticks: {
              color: colors.muted,
              callback: (v) => `${Math.round(v * 100)}%`,
            },
            grid: { color: hexToRgba(colors.border, 0.6) },
          },
          y: {
            ticks: { color: colors.text, font: { weight: '500' } },
            grid: { display: false },
          },
        },
      },
    };

    const height = Math.max(280, slice.length * 24 + 60);
    canvas.parentElement.style.height = `${height}px`;

    if (state.chart) {
      state.chart.destroy();
    }
    state.chart = new Chart(canvas, config);
  }

  /* ---------- KPI cards ---------- */
  function renderKpis() {
    const container = document.getElementById('wc-kpis');
    if (!container) return;
    const top = [...state.rows]
      .sort((a, b) => b['P(Champion)'] - a['P(Champion)'])
      .slice(0, 4);

    container.innerHTML = top.map((row, i) => `
      <div class="wc-kpi">
        <div class="wc-kpi__rank">#${i + 1} Contender</div>
        <div class="wc-kpi__team">${row.team}</div>
        <div class="wc-kpi__prob">${(row['P(Champion)'] * 100).toFixed(2)}%</div>
        <div class="wc-kpi__label">P(Champion) &middot; ${row.confederation}</div>
      </div>
    `).join('');
  }

  /* ---------- Leaderboard table ---------- */
  function renderLeaderboard() {
    const tbody = document.getElementById('wc-leaderboard-body');
    if (!tbody) return;

    const filtered = state.conf === 'all'
      ? state.rows
      : state.rows.filter((r) => r.confederation === state.conf);

    const sorted = [...filtered].sort((a, b) => {
      const key = state.sortKey;
      let av, bv;
      if (key === 'rank') {
        av = a['P(Champion)'];
        bv = b['P(Champion)'];
        return state.sortDir === 'asc' ? av - bv : bv - av;
      }
      av = a[key];
      bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') {
        return state.sortDir === 'asc' ? av - bv : bv - av;
      }
      av = String(av);
      bv = String(bv);
      return state.sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const maxChamp = Math.max(...state.rows.map((r) => r['P(Champion)']));

    tbody.innerHTML = sorted.map((row, idx) => {
      const champ = row['P(Champion)'];
      const barWidth = maxChamp > 0 ? Math.max(2, (champ / maxChamp) * 60) : 2;
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${row.team}</td>
          <td>${row.group}</td>
          <td>${row.confederation}</td>
          <td class="wc-num">${(row['P(R32)'] * 100).toFixed(1)}%</td>
          <td class="wc-num">${(row['P(R16)'] * 100).toFixed(1)}%</td>
          <td class="wc-num">${(row['P(QF)'] * 100).toFixed(1)}%</td>
          <td class="wc-num">${(row['P(SF)'] * 100).toFixed(1)}%</td>
          <td class="wc-num">${(row['P(Final)'] * 100).toFixed(1)}%</td>
          <td class="wc-num">
            <span class="wc-prob-bar" style="width:${barWidth}px"></span>
            <strong>${(champ * 100).toFixed(2)}%</strong>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('#wc-leaderboard thead th').forEach((th) => {
      const key = th.dataset.sort;
      th.classList.remove('is-sort-asc', 'is-sort-desc');
      if (key === state.sortKey) {
        th.classList.add(state.sortDir === 'asc' ? 'is-sort-asc' : 'is-sort-desc');
      }
    });
  }

  /* ---------- Events ---------- */
  function wireControls() {
    const topn = document.getElementById('wc-topn');
    const metric = document.getElementById('wc-metric');
    const conf = document.getElementById('wc-conf');

    if (topn) {
      topn.addEventListener('change', () => {
        state.topN = parseInt(topn.value, 10) || 10;
        renderChart();
      });
    }
    if (metric) {
      metric.addEventListener('change', () => {
        state.metric = metric.value;
        renderChart();
      });
    }
    if (conf) {
      conf.addEventListener('change', () => {
        state.conf = conf.value;
        renderLeaderboard();
      });
    }

    document.querySelectorAll('#wc-leaderboard thead th').forEach((th) => {
      const key = th.dataset.sort;
      if (!key) return;
      th.addEventListener('click', () => {
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = (key === 'team' || key === 'group' || key === 'confederation') ? 'asc' : 'desc';
        }
        renderLeaderboard();
      });
    });

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        requestAnimationFrame(() => {
          renderChart();
        });
      });
    }
  }

  /* ---------- Bootstrap ---------- */
  function init() {
    if (!document.getElementById('wc-chart')) return;

    fetch(CSV_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        state.rows = parseCSV(text);
        renderKpis();
        renderChart();
        renderLeaderboard();
        wireControls();
      })
      .catch((err) => {
        const wrap = document.querySelector('.wc-chart-wrap');
        if (wrap) {
          wrap.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:32px">
            Could not load predictions data (${err.message}).
            The CSV lives at <code>${CSV_URL}</code>.
          </p>`;
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
