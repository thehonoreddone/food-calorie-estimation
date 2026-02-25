import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { PredictionResponse } from "../types";

interface ResultsCardProps {
  prediction: PredictionResponse;
  imageUri: string;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({
  prediction,
  imageUri,
}) => {
  const confidencePercentage = (prediction.confidence * 100).toFixed(1);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Original Image */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-700 mb-2">
            📷 Your Photo
          </Text>
          <Image
            source={{ uri: imageUri }}
            className="w-full h-48 rounded-xl"
            resizeMode="cover"
          />
        </View>

        {/* Segmentation Mask (if available) */}
        {prediction.mask_base64 && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-700 mb-2">
              🎭 Segmentation Mask
            </Text>
            <Image
              source={{ uri: `data:image/png;base64,${prediction.mask_base64}` }}
              className="w-full h-48 rounded-xl"
              resizeMode="cover"
            />
          </View>
        )}

        {/* Results */}
        <View className="bg-gradient-to-r bg-green-50 rounded-2xl p-4 mb-4">
          <Text className="text-2xl font-bold text-green-700 text-center mb-2">
            {prediction.class_name.replace(/_/g, " ").toUpperCase()}
          </Text>
          <Text className="text-gray-600 text-center">
            Confidence: {confidencePercentage}%
          </Text>
        </View>

        {/* Nutritional Info */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-blue-50 rounded-xl p-4 mr-2">
            <Text className="text-3xl font-bold text-blue-600 text-center">
              {prediction.estimated_weight_grams.toFixed(0)}
            </Text>
            <Text className="text-blue-600 text-center text-sm">grams</Text>
          </View>

          <View className="flex-1 bg-orange-50 rounded-xl p-4 ml-2">
            <Text className="text-3xl font-bold text-orange-600 text-center">
              {prediction.estimated_calories.toFixed(0)}
            </Text>
            <Text className="text-orange-600 text-center text-sm">kcal</Text>
          </View>
        </View>

        {/* Confidence Bar */}
        <View className="mb-4">
          <Text className="text-gray-600 mb-2">Confidence Level</Text>
          <View className="bg-gray-200 rounded-full h-4 overflow-hidden">
            <View
              className="bg-green-500 h-full rounded-full"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default ResultsCard;
