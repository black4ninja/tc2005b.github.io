export type DashboardRole = 'admin' | 'alumno';

export interface SidebarItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface StatCardData {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
}

export interface DataRowItem {
  id: string;
  avatar?: string;
  name: string;
  subtitle?: string;
  columns: string[];
  status?: {
    label: string;
    color: string;
  };
}

export interface ActivityItem {
  id: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  time: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  series: ApexAxisChartSeries;
  categories: string[];
  colors?: string[];
  height?: number;
}

type ApexAxisChartSeries = {
  name: string;
  data: number[];
}[];
