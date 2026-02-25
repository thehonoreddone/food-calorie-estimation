# 🍽️ Food Calorie Analyzer - Mobile App

A React Native (Expo) mobile application for food classification and calorie estimation using AI.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)
- Backend server running on port 8001

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd app/mobile
npm install
```

### 2. Start the Development Server

```bash
npm start
# or
npx expo start
```

### 3. Run on Device

- **Android Emulator:** Press `a` in the terminal
- **iOS Simulator:** Press `i` in the terminal (macOS only)
- **Physical Device:** Scan the QR code with Expo Go app

## 📁 Project Structure

```
mobile/
├── App.tsx                 # Main entry point
├── global.css              # Tailwind CSS imports
├── tailwind.config.js      # Tailwind/NativeWind config
├── babel.config.js         # Babel config for NativeWind
├── metro.config.js         # Metro bundler config
└── src/
    ├── components/         # Reusable UI components
    │   ├── ImagePickerButtons.tsx
    │   └── ResultsCard.tsx
    ├── screens/            # Screen components
    │   └── HomeScreen.tsx
    ├── services/           # API services
    │   ├── apiClient.ts    # Axios instance with interceptors
    │   └── predictionService.ts
    └── types/              # TypeScript type definitions
        └── prediction.ts
```

## 🔧 Configuration

### Backend URL

Edit `src/services/apiClient.ts` to change the backend URL:

```typescript
// For production
const IS_PRODUCTION = true;
return "https://your-backend-url.onrender.com";

// For local development
// Android Emulator: 10.0.2.2:8001
// iOS Simulator: localhost:8001
// Physical Device: Your computer's IP (e.g., 192.168.1.100:8001)
```

### Physical Device Testing

To test on a physical device with local backend:

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `apiClient.ts` to use your IP instead of localhost
3. Ensure your phone and computer are on the same network

## 📱 Features

- 📸 Take photos with camera
- 🖼️ Select images from gallery
- 🤖 AI-powered food classification (201 food types)
- ⚖️ Weight estimation
- 🔥 Calorie calculation
- 🎭 Segmentation mask visualization

## 🛠️ Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **HTTP Client:** Axios
- **Camera/Gallery:** expo-image-picker
- **Storage:** @react-native-async-storage/async-storage

## 📦 Building for Production

### Android APK

```bash
npx expo build:android -t apk
# or for modern build
npx eas build --platform android
```

### iOS IPA

```bash
npx eas build --platform ios
```

> Note: iOS builds require an Apple Developer account.

## 🐛 Troubleshooting

### "Network Error" on Android Emulator

- Use `10.0.2.2` instead of `localhost` for the backend URL

### "Network Error" on Physical Device

- Ensure phone and computer are on the same WiFi network
- Use your computer's local IP address (not localhost)
- Check if your firewall allows connections on port 8001

### Camera not working

- Ensure you've granted camera permissions
- Try restarting the Expo app

## 📄 License

MIT
