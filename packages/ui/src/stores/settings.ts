import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import type { AppSettings } from '@/types';

const STORAGE_KEY = 'qontrol-settings';

const defaultSettings: AppSettings = {
  autoRefreshInterval: 10, // seconds
  autoRefreshEnabled: true,
  timezone: 'local',
  theme: 'system',
  tooltipDelay: 0,
  showDangerActions: false,
};

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<AppSettings>({ ...defaultSettings });
  const autoRefreshEnabled = computed({
    get: () => settings.value.autoRefreshEnabled,
    set: (value: boolean) => settings.value.autoRefreshEnabled = value,
  });

  // Theme management
  const isDarkMode = computed(() => {
    if (settings.value.theme === 'dark') return true;
    if (settings.value.theme === 'light') return false;
    // System preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to document
  function applyTheme() {
    const html = document.documentElement;
    if (isDarkMode.value) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  // Listen for system theme changes
  function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.value.theme === 'system') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  // Load settings from localStorage on init
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        settings.value = { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }

  // Watch for settings changes and auto-save
  watch(settings, saveSettings, { deep: true });

  // Watch for theme changes
  watch(() => settings.value.theme, applyTheme, { immediate: true });

  // Actions
  function updateSettings(newSettings: Partial<AppSettings>) {
    Object.assign(settings.value, newSettings);
  }

  function resetSettings() {
    settings.value = { ...defaultSettings };
  }

  function toggleAutoRefresh() {
    settings.value.autoRefreshEnabled = !settings.value.autoRefreshEnabled;
  }

  // Initialize
  loadSettings();
  setupSystemThemeListener();

  return {
    // State
    settings,
    autoRefreshEnabled,
    isDarkMode,
    
    // Actions
    updateSettings,
    resetSettings,
    toggleAutoRefresh,
    loadSettings,
  };
});
