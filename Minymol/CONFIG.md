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

## Cart Synchronization System

### Overview

The app implements a **background synchronization system** for the shopping cart that provides:

- ✅ **Instant local updates** (AsyncStorage) for fluid UX
- ✅ **Background sync with backend** when user is authenticated
- ✅ **Works offline** - cart persists locally
- ✅ **Automatic retry queue** for failed sync operations
- ✅ **Cross-device sync** when authenticated

### How It Works

1. **All changes save locally first** (0-50ms response time)
2. **If user is authenticated**, changes sync to backend in background
3. **If sync fails**, operation is queued for retry
4. **On app foreground**, pending operations are processed

### Key Features

- **User not authenticated**: Cart works locally, shows info banner
- **User authenticated**: Automatic background sync + visual indicator
- **Network issues**: Graceful degradation, no error messages to user
- **Multi-device**: Cart syncs across all devices when logged in

### Files

- `contexts/CartContext.js` - Main cart state management
- `utils/cartSync.js` - Background sync logic and retry queue
- `utils/apiUtils.js` - Centralized API calls with auth
- `CART_SYNC_EXPLAINED.md` - Detailed technical documentation

### Usage

The synchronization is **automatic and transparent**. No special configuration needed.

```javascript
// Example: Adding to cart (user sees instant update)
await addToCart(product);
// → Saves to AsyncStorage immediately
// → Syncs to backend in background if authenticated
```

For detailed technical documentation, see [CART_SYNC_EXPLAINED.md](./CART_SYNC_EXPLAINED.md)
