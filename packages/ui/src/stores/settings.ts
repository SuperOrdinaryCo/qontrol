import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { AppSettings } from '@/types';

const STORAGE_KEY = 'bulldash-settings';

const defaultSettings: AppSettings = {
  autoRefreshInterval: 10, // seconds
  timezone: 'local',
};

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<AppSettings>({ ...defaultSettings });
  const autoRefreshEnabled = ref(true);

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

  // Actions
  function updateSettings(newSettings: Partial<AppSettings>) {
    Object.assign(settings.value, newSettings);
  }

  function resetSettings() {
    settings.value = { ...defaultSettings };
  }

  function toggleAutoRefresh() {
    autoRefreshEnabled.value = !autoRefreshEnabled.value;
  }

  // Initialize
  loadSettings();

  return {
    // State
    settings,
    autoRefreshEnabled,
    
    // Actions
    updateSettings,
    resetSettings,
    toggleAutoRefresh,
    loadSettings,
    saveSettings,
  };
});
