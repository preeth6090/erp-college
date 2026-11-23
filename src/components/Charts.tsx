'use client';

import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = ['#4f46e5', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export function BarChart({ labels, data, label = 'Students' }: { labels: string[]; data: number[]; label?: string }) {
  return <Bar data={{ labels, datasets: [{ label, data, backgroundColor: '#4f46e5' }] }} options={{ plugins: { legend: { display: false } } }} />;
}
export function DoughnutChart({ labels, data, colors }: { labels: string[]; data: number[]; colors?: string[] }) {
  return <Doughnut data={{ labels, datasets: [{ data, backgroundColor: colors ?? COLORS }] }} />;
}
export function PieChart({ labels, data }: { labels: string[]; data: number[] }) {
  return <Pie data={{ labels, datasets: [{ data, backgroundColor: COLORS }] }} />;
}
