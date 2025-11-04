import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import numeral from "numeral";
import { formatDistanceToNow, format } from "date-fns";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Number formatting utilities
export function formatNumber(value: number, decimals: number = 2): string {
  return numeral(value).format(`0,0.${"0".repeat(decimals)}`);
}

export function formatUSD(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${numeral(value / 1_000_000).format(`0,0.${decimals}`)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${numeral(value / 1_000).format(`0,0.${decimals}`)}K`;
  }
  return `$${numeral(value).format(`0,0.${decimals}`)}`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${numeral(value).format(`0,0.${"0".repeat(decimals)}`)}%`;
}

export function formatBigInt(value: bigint, decimals: number = 18): number {
  return Number(value) / Math.pow(10, decimals);
}

export function parseToBigInt(value: string, decimals: number = 18): bigint {
  const num = parseFloat(value);
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

// Date formatting utilities
export function formatDate(timestamp: number, formatStr: string = "MMM dd, yyyy"): string {
  return format(new Date(timestamp), formatStr);
}

export function formatTimeAgo(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

// IL calculation utilities
export function calculateIL(initialPrice: number, finalPrice: number): number {
  const priceRatio = finalPrice / initialPrice;
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return Math.abs(il * 100); // Return as percentage
}

export function calculatePnL(deposited: number, currentValue: number, fees: number): number {
  return currentValue + fees - deposited;
}

export function calculateAPY(fees: number, deposited: number, days: number): number {
  if (deposited === 0 || days === 0) return 0;
  const dailyRate = fees / deposited / days;
  return dailyRate * 365 * 100; // Annual percentage
}

// Risk assessment utilities
export function getRiskLevel(ilRisk: number): 'safe' | 'moderate' | 'high' | 'critical' {
  if (ilRisk < 2) return 'safe';
  if (ilRisk < 5) return 'moderate';
  if (ilRisk < 10) return 'high';
  return 'critical';
}

export function getRiskColor(level: 'safe' | 'moderate' | 'high' | 'critical'): string {
  const colors = {
    safe: 'text-green-500',
    moderate: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  };
  return colors[level];
}

export function getRiskBgColor(level: 'safe' | 'moderate' | 'high' | 'critical'): string {
  const colors = {
    safe: 'bg-green-500/10 border-green-500/20',
    moderate: 'bg-yellow-500/10 border-yellow-500/20',
    high: 'bg-orange-500/10 border-orange-500/20',
    critical: 'bg-red-500/10 border-red-500/20',
  };
  return colors[level];
}

// Address utilities
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Price utilities
export function formatPrice(price: number): string {
  if (price >= 1000) return formatNumber(price, 0);
  if (price >= 1) return formatNumber(price, 2);
  if (price >= 0.01) return formatNumber(price, 4);
  return formatNumber(price, 6);
}

export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

// Range utilities
export function isPriceInRange(price: number, lower: number, upper: number): boolean {
  return price >= lower && price <= upper;
}

export function calculateRangeWidth(lower: number, upper: number, current: number): number {
  const totalRange = upper - lower;
  const distanceFromLower = current - lower;
  return (distanceFromLower / totalRange) * 100;
}

// Validation utilities
export function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

export function validateRange(lower: number, upper: number, current: number): boolean {
  return lower > 0 && upper > lower && current >= lower && current <= upper;
}

// Animation utilities
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

// Async utilities
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Chart data utilities
export function generateChartData(
  data: Array<{ timestamp: number; value: number }>,
  points: number = 50
): Array<{ timestamp: number; value: number }> {
  if (data.length <= points) return data;
  
  const step = Math.floor(data.length / points);
  return data.filter((_, i) => i % step === 0);
}

export function smoothChartData(
  data: Array<{ value: number }>,
  windowSize: number = 3
): Array<{ value: number }> {
  return data.map((point, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);
    const average = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    return { ...point, value: average };
  });
}

// Color utilities
export function getGradientColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  if (normalized < 0.5) {
    // Green to Yellow
    const r = Math.floor(16 + normalized * 2 * 223);
    const g = Math.floor(185);
    const b = Math.floor(129 - normalized * 2 * 129);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Red
    const r = Math.floor(239);
    const g = Math.floor(185 - (normalized - 0.5) * 2 * 117);
    const b = Math.floor(68);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Local storage utilities
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}