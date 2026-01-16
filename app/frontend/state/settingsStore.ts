import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  darkMode: boolean;
  notifications: boolean;
  
  // Actions
  toggleDarkMode: () => void;
  toggleNotifications: () => void;
  clearHistory: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      notifications: true,

      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.darkMode;
          
          // Apply to document
          if (typeof document !== "undefined") {
            if (newDarkMode) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
          
          return { darkMode: newDarkMode };
        });
      },

      toggleNotifications: () => {
        set((state) => ({ notifications: !state.notifications }));
      },

      clearHistory: () => {
        // Clear any stored prediction history
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("prediction-history");
        }
      },
    }),
    {
      name: "settings-storage",
    }
  )
);
