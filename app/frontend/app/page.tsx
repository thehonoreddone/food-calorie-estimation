"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Utensils, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/apiClient";

interface Prediction {
  id: string;
  food_class: string;
  calories: number;
  weight_grams: number;
  confidence: number;
  created_at: string;
  image_url?: string;
}

interface DailySummary {
  date: string;
  total_calories: number;
  predictions_count: number;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      loadUserData();
    }
  }, [user, authLoading]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [predictionsRes, summaryRes] = await Promise.all([
        apiClient.get("/api/v1/history/predictions?limit=3"),
        apiClient.get("/api/v1/history/daily")
      ]);
      setPredictions(predictionsRes.data.predictions || []);
      setDailySummary(summaryRes.data);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 safe-top">
        <h1 className="text-2xl font-bold text-center">
          🍽️ Food Calorie Estimator
        </h1>
        <p className="text-center text-sm opacity-90 mt-1">
          {user ? `Hoş geldin, ${user.displayName || user.email?.split('@')[0]}!` : "AI-powered nutrition tracking"}
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Quick Actions */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Hızlı İşlemler
          </h2>
          
          <Link
            href="/predict"
            className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border-2 border-primary/20 hover:border-primary transition-colors"
          >
            <div className="p-3 bg-primary rounded-full">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Yemek Tara</h3>
              <p className="text-sm text-muted-foreground">
                Kalori tahmini için fotoğraf çekin
              </p>
            </div>
          </Link>

          <Link
            href="/foods"
            className="flex items-center gap-4 p-4 bg-secondary rounded-xl border hover:border-primary transition-colors"
          >
            <div className="p-3 bg-primary/20 rounded-full">
              <Utensils className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Yemek Veritabanı</h3>
              <p className="text-sm text-muted-foreground">
                Tüm yemek sınıflarını görüntüleyin
              </p>
            </div>
          </Link>

          {!user && (
            <Link
              href="/auth/login"
              className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200 hover:border-green-400 transition-colors"
            >
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-xl">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Giriş Yap</h3>
                <p className="text-sm text-green-600">
                  Tahminlerinizi kaydetmek için giriş yapın
                </p>
              </div>
            </Link>
          )}
        </section>

        {/* Stats Preview */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Bugünün Özeti
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-card rounded-xl border">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Tarama</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {dailySummary?.predictions_count || 0}
              </p>
            </div>
            
            <div className="p-4 bg-card rounded-xl border">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm text-muted-foreground">Kalori</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {Math.round(dailySummary?.total_calories || 0)}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Predictions */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Son Tahminler
            </h2>
            {user && predictions.length > 0 && (
              <Link href="/history" className="text-sm text-primary hover:underline">
                Tümünü Gör →
              </Link>
            )}
          </div>
          
          {!user ? (
            <div className="p-6 bg-muted/50 rounded-xl border border-dashed text-center">
              <p className="text-muted-foreground">
                Tahmin geçmişinizi görmek için <Link href="/auth/login" className="text-primary hover:underline">giriş yapın</Link>
              </p>
            </div>
          ) : loading ? (
            <div className="p-6 bg-muted/50 rounded-xl text-center">
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg mb-2"></div>
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ) : predictions.length === 0 ? (
            <div className="p-8 bg-muted/50 rounded-xl border border-dashed text-center">
              <p className="text-muted-foreground">
                Henüz tahmin yok. İlk yemeğinizi tarayın!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="flex items-center gap-4 p-3 bg-card rounded-xl border"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {prediction.image_url ? (
                      <img
                        src={prediction.image_url}
                        alt={prediction.food_class}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate capitalize">
                      {prediction.food_class.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(prediction.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {Math.round(prediction.calories)} kcal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(prediction.weight_grams)}g
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
