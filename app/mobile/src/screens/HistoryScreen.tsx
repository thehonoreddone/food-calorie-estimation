import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PredictionResponse } from "../types";

interface HistoryItem {
  id: string;
  prediction: PredictionResponse;
  imageUri: string;
  timestamp: string;
}

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem("prediction_history");
      if (data) {
        setHistory(JSON.parse(data) as HistoryItem[]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  // Load once on first render (no useEffect)
  if (!loaded.current) {
    loaded.current = true;
    loadHistory();
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem("prediction_history");
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={{ 
      backgroundColor: "white", 
      marginHorizontal: 16, 
      marginBottom: 12, 
      borderRadius: 16,
      padding: 12,
      flexDirection: "row",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <Image
        source={{ uri: item.imageUri }}
        style={{ width: 80, height: 80, borderRadius: 12 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }} numberOfLines={1}>
          {item.prediction.class_name.replace(/_/g, " ").replace(/-/g, " ")}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 }}>
            <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "500" }}>
              {item.prediction.estimated_weight_grams.toFixed(0)}g
            </Text>
          </View>
          <View style={{ backgroundColor: "#ffedd5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: "#ea580c", fontSize: 12, fontWeight: "500" }}>
              {item.prediction.estimated_calories.toFixed(0)} kcal
            </Text>
          </View>
        </View>
        <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
          {new Date(item.timestamp).toLocaleDateString("tr-TR", { 
            day: "numeric", 
            month: "short", 
            hour: "2-digit", 
            minute: "2-digit" 
          })}
        </Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
      <View style={{
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 40 }}>📋</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#374151", textAlign: "center" }}>
        Henüz Geçmiş Yok
      </Text>
      <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
        Yemek taradığınızda burada görünecektir
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      {/* Header */}
      <View style={{ 
        backgroundColor: "#22c55e", 
        paddingHorizontal: 20, 
        paddingVertical: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>
          📋 Geçmiş
        </Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#22c55e"]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;
