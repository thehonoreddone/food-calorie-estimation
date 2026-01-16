"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";

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

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load predictions and daily summary in parallel
      const [predictionsRes, summaryRes] = await Promise.all([
        apiClient.get("/api/v1/history/predictions?limit=50"),
        apiClient.get("/api/v1/history/daily")
      ]);

      setPredictions(predictionsRes.data.predictions || []);
      setDailySummary(summaryRes.data);
    } catch (error: any) {
      console.error("Failed to load history:", error);
      if (error.response?.status === 401) {
        toast.error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        router.push("/auth/login");
      } else {
        toast.error("Geçmiş yüklenemedi");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (predictionId: string) => {
    if (!confirm("Bu tahmini silmek istediğinizden emin misiniz?")) {
      return;
    }

    setDeleteLoading(predictionId);
    try {
      await apiClient.delete(`/api/v1/history/predictions/${predictionId}`);
      setPredictions(predictions.filter(p => p.id !== predictionId));
      toast.success("Tahmin silindi");
      // Reload daily summary
      const summaryRes = await apiClient.get("/api/v1/history/daily");
      setDailySummary(summaryRes.data);
    } catch (error) {
      toast.error("Silme başarısız");
    } finally {
      setDeleteLoading(null);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Tahmin Geçmişi</h1>
          <p className="text-green-100 mt-1">Tüm yemek tahminleriniz</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Daily Summary Card */}
        {dailySummary && (
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Bugünün Özeti</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{Math.round(dailySummary.total_calories)}</p>
                <p className="text-sm text-gray-600">Kalori</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{dailySummary.predictions_count}</p>
                <p className="text-sm text-gray-600">Tarama</p>
              </div>
            </div>
          </div>
        )}

        {/* Predictions List */}
        <div className="space-y-4 pb-24">
          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-lg font-semibold text-gray-700">Henüz tahmin yok</h3>
              <p className="text-gray-500 mt-2">
                Yemek fotoğrafı çekerek kalori tahmini yapın
              </p>
              <Link
                href="/scan"
                className="inline-block mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Taramaya Başla
              </Link>
            </div>
          ) : (
            predictions.map((prediction) => (
              <div
                key={prediction.id}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-200">
                    {prediction.image_url ? (
                      <img
                        src={prediction.image_url}
                        alt={prediction.food_class}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800 capitalize">
                          {prediction.food_class.replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(prediction.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(prediction.id)}
                        disabled={deleteLoading === prediction.id}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Sil"
                      >
                        {deleteLoading === prediction.id ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex gap-4 mt-2">
                      <div>
                        <span className="text-lg font-bold text-green-600">{Math.round(prediction.calories)}</span>
                        <span className="text-xs text-gray-500 ml-1">kcal</span>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-blue-600">{Math.round(prediction.weight_grams)}</span>
                        <span className="text-xs text-gray-500 ml-1">g</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">
                          %{Math.round(prediction.confidence * 100)} güven
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
