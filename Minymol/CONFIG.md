# Configuration Guide

## Environment Variables

This project uses environment variables to securely store sensitive configuration like Firebase API keys.

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual Firebase configuration values:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   ```

### Important Security Notes

- **NEVER** commit the `.env` file to version control
- The `.env` file is already included in `.gitignore`
- Only use the `.env.example` file as a template
- Keep your API keys secure and rotate them regularly

### Firebase Configuration

The Firebase configuration is automatically loaded from environment variables in `config/firebase.js`. If any required environment variables are missing, the app will throw an error with a helpful message.

### Development

When running the development server, Expo automatically loads the `.env` file and makes variables prefixed with `EXPO_PUBLIC_` available to your app.