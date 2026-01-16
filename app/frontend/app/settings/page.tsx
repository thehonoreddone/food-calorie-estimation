"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Bell, Info, Trash2, LogOut, User, LogIn } from "lucide-react";
import { useSettingsStore } from "@/state/settingsStore";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    darkMode,
    notifications,
    toggleDarkMode,
    toggleNotifications,
    clearHistory,
  } = useSettingsStore();

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all prediction history?")) {
      clearHistory();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Çıkış yapıldı");
      router.push("/");
    } catch (error) {
      toast.error("Çıkış yapılamadı");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Ayarlar</h1>
        </div>
      </header>

      {/* Settings List */}
      <div className="flex-1 p-4 space-y-6">
        {/* User Profile */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hesap
          </h2>
          
          <div className="bg-card rounded-xl border divide-y">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/history"
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-medium">Tahmin Geçmişi</p>
                    <p className="text-sm text-muted-foreground">
                      Tüm tahminlerinizi görüntüleyin
                    </p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/50 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Çıkış Yap</p>
                    <p className="text-sm text-muted-foreground">
                      Hesabınızdan çıkış yapın
                    </p>
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <LogIn className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Giriş Yap</p>
                    <p className="text-sm text-muted-foreground">
                      Hesabınıza giriş yapın
                    </p>
                  </div>
                </Link>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Kayıt Ol</p>
                    <p className="text-sm text-muted-foreground">
                      Yeni hesap oluşturun
                    </p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Appearance
          </h2>
          
          <div className="bg-card rounded-xl border divide-y">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle dark theme
                  </p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notifications
          </h2>
          
          <div className="bg-card rounded-xl border divide-y">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive prediction alerts
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={toggleNotifications}
              />
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Data
          </h2>
          
          <div className="bg-card rounded-xl border divide-y">
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/50 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Clear History</p>
                <p className="text-sm text-muted-foreground">
                  Delete all prediction history
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* About */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            About
          </h2>
          
          <div className="bg-card rounded-xl border divide-y">
            <div className="flex items-center gap-3 p-4">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Version</p>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>
            </div>
          </div>
        </section>

        {/* Credits */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Food Calorie Estimator</p>
          <p>Powered by FoodSeg103 + YOLOv8</p>
        </div>
      </div>
    </div>
  );
}
