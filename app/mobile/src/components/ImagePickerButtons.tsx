import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

interface ImagePickerButtonsProps {
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
  isLoading: boolean;
}

export const ImagePickerButtons: React.FC<ImagePickerButtonsProps> = ({
  onTakePhoto,
  onPickFromGallery,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="text-gray-600 mt-4 text-lg">Analyzing food...</Text>
        <Text className="text-gray-400 mt-2">This may take a moment</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center px-6">
      {/* App Title */}
      <View className="mb-10">
        <Text className="text-4xl font-bold text-green-600 text-center">
          🍽️ Food AI
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Take a photo of your food to get nutritional info
        </Text>
      </View>

      {/* Camera Button */}
      <TouchableOpacity
        onPress={onTakePhoto}
        className="bg-green-500 w-full py-4 rounded-2xl mb-4 shadow-lg active:bg-green-600"
        activeOpacity={0.8}
      >
        <Text className="text-white text-center text-lg font-semibold">
          📸 Take Photo
        </Text>
      </TouchableOpacity>

      {/* Gallery Button */}
      <TouchableOpacity
        onPress={onPickFromGallery}
        className="bg-blue-500 w-full py-4 rounded-2xl shadow-lg active:bg-blue-600"
        activeOpacity={0.8}
      >
        <Text className="text-white text-center text-lg font-semibold">
          🖼️ Choose from Gallery
        </Text>
      </TouchableOpacity>

      {/* Info Text */}
      <View className="mt-10 px-4">
        <Text className="text-gray-400 text-center text-sm">
          Supports 201 different food types including Turkish cuisine
        </Text>
      </View>
    </View>
  );
};

export default ImagePickerButtons;
