# Nutrino - EAS Secrets Setup Script
# Run once: cd app/mobile && .\setup_eas_secrets.ps1

Write-Host "Loading EAS Secrets..." -ForegroundColor Cyan

# Firebase Config
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyBzyuIu-zNjbaDXRaqfhVy9PXcHTwSl_Pg" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "food-calorie-estimation-2e3bd.firebaseapp.com" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "food-calorie-estimation-2e3bd" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "food-calorie-estimation-2e3bd.firebasestorage.app" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "638569335788" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:638569335788:web:7d448ac8ce31c23dd5cec9" --force

# Backend URL (production - nutrino)
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://nutrino-backend.onrender.com" --force
npx eas secret:create --scope project --name EXPO_PUBLIC_APP_ENV --value "production" --force

# Sentry
npx eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://2aed1210685cc9fd1fd4741b4418338d@o4511155905298432.ingest.de.sentry.io/4511155907592272" --force

Write-Host "EAS Secrets loaded! Listing secrets:" -ForegroundColor Green
npx eas secret:list
