import { format, formatDistanceToNow } from 'date-fns';
import { useSettingsStore } from '@/stores/settings';

export function formatTimestamp(date: Date): string {
  const settingsStore = useSettingsStore();
  const timezone = settingsStore.settings.timezone;
  
  if (timezone === 'utc') {
    return format(date, 'yyyy-MM-dd HH:mm:ss') + ' UTC';
  }
  
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}
