import { lazy, Suspense } from 'react';
import styles from './ChartCard.module.css';
import type { ChartConfig } from '../../../../types/dashboard';

const Chart = lazy(() => import('react-apexcharts'));

interface ChartCardProps {
  title: string;
  config: ChartConfig;
}

export default function ChartCard({ title, config }: ChartCardProps) {
  const options: ApexCharts.ApexOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
    },
    xaxis: { categories: config.categories },
    colors: config.colors || ['var(--dash-primary)'],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,
    },
    fill: config.type === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } } : {},
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <Suspense fallback={<div className={styles.loading}>Cargando gráfica...</div>}>
        <Chart
          options={options}
          series={config.series}
          type={config.type}
          height={config.height || 300}
          width="100%"
        />
      </Suspense>
    </div>
  );
}
