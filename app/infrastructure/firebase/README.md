# Firebase Infrastructure

This directory contains Firebase configuration files for the Food Calorie Estimation app.

## Files

- `firebase.json` - Firebase project configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `storage.rules` - Cloud Storage security rules

## Setup

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize project:
   ```bash
   firebase init
   ```

4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

## Emulator

Run local emulators for development:

```bash
firebase emulators:start
```

Access emulator UI at: http://localhost:4000

## Security Rules

### Firestore Rules
- `foods` collection: Public read, authenticated write
- `users` collection: Private to each user
- `predictions` collection: Private to each user

### Storage Rules
- `foods/` folder: Public read, authenticated write
- `users/` folder: Private to each user
- `predictions/` folder: Temporary storage with 24h expiry

## Collections Schema

### foods
```json
{
  "class_name": "string",
  "calories_per_100g": "number",
  "default_portion_grams": "number",
  "image_url": "string (optional)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### users
```json
{
  "email": "string",
  "display_name": "string",
  "role": "string (user|admin)",
  "created_at": "timestamp"
}
```

### predictions
```json
{
  "user_id": "string",
  "class_name": "string",
  "confidence": "number",
  "estimated_calories": "number",
  "estimated_weight_grams": "number",
  "image_url": "string",
  "created_at": "timestamp"
}
```
