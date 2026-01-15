# Automated EAS Builds

This project uses GitHub Actions to automatically build the app when changes are pushed to the `main` branch.

## Setup

1. **Get your Expo token:**
   ```bash
   eas login
   eas whoami
   ```

2. **Add the token to GitHub Secrets:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `EXPO_TOKEN`
   - Value: Your Expo token (get it from https://expo.dev/accounts/[your-account]/settings/access-tokens)

3. **Push to main branch:**
   - Any push to `main` that changes files in `mobile-app/` will trigger a build
   - Builds run automatically with the `preview` profile

## Manual Builds

You can also trigger builds manually:
- Go to Actions tab in GitHub
- Select "EAS Build" workflow
- Click "Run workflow"
- Choose profile and platform

## Build Profiles

- **development**: Development client build (for testing with Expo Dev Client)
- **preview**: Preview build (APK for testing)
- **production**: Production build (for Play Store)
