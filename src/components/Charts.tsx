'use client';

import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = 'ui-sans-serif, system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';

const COLORS = ['#4f46e5', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
const grid = { color: 'rgba(148,163,184,0.18)' };
const fmtINR = (v: number | string) => '₹' + Number(v).toLocaleString('en-IN');

export function BarChart({ labels, data, label = 'Students', horizontal = false, money = false }: { labels: string[]; data: number[]; label?: string; horizontal?: boolean; money?: boolean }) {
  return (
    <Bar
      data={{ labels, datasets: [{ label, data, backgroundColor: COLORS, borderRadius: 6, maxBarThickness: 36 }] }}
      options={{
        indexAxis: horizontal ? 'y' : 'x', maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: money ? { label: (c) => ' ' + fmtINR(c.parsed[horizontal ? 'x' : 'y'] ?? 0) } : {} } },
        scales: { x: { grid: horizontal ? grid : { display: false } }, y: { grid: horizontal ? { display: false } : grid, beginAtZero: true } },
      }}
    />
  );
}

export function LineChart({ labels, series, money = false, percent = false }: { labels: string[]; series: { label: string; data: number[]; color: string }[]; money?: boolean; percent?: boolean }) {
  return (
    <Line
      data={{
        labels,
        datasets: series.map((s) => ({
          label: s.label, data: s.data, borderColor: s.color, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: s.color, borderWidth: 2.5,
          backgroundColor: (ctx: { chart: ChartJS }) => {
            const { ctx: c, chartArea } = ctx.chart;
            if (!chartArea) return s.color + '22';
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, s.color + '55'); g.addColorStop(1, s.color + '00');
            return g;
          },
        })),
      }}
      options={{
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: series.length > 1, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${money ? fmtINR(c.parsed.y ?? 0) : percent ? c.parsed.y + '%' : c.parsed.y}` } } },
        scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true, ...(percent ? { max: 100 } : {}), ticks: { callback: (v) => (money ? fmtINR(v) : percent ? v + '%' : v) } } },
      }}
    />
  );
}

export function DoughnutChart({ labels, data, colors, money = false }: { labels: string[]; data: number[]; colors?: string[]; money?: boolean }) {
  return (
    <Doughnut
      data={{ labels, datasets: [{ data, backgroundColor: colors ?? COLORS, borderWidth: 2, borderColor: '#fff' }] }}
      options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: money ? { label: (c) => ` ${c.label}: ${fmtINR(c.parsed)}` } : {} } } }}
    />
  );
}

export function PieChart({ labels, data }: { labels: string[]; data: number[] }) {
  return <Pie data={{ labels, datasets: [{ data, backgroundColor: COLORS, borderColor: '#fff', borderWidth: 2 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }} />;
}
