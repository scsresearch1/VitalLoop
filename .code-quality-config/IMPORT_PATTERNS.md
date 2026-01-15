# Safe Import Patterns for Native Modules

## Problem
Direct imports from native modules (like `react-native-ble-manager`) can crash the app if the module isn't available at runtime.

## Solution: Safe Import Pattern

### ❌ WRONG - Direct Import
```typescript
import { Device } from 'react-native-ble-manager';
```

### ✅ CORRECT - Safe Import with Fallback
```typescript
// Define safe interface in your types file
export interface BLEDevice {
  id: string;
  name?: string;
  rssi?: number;
  // ... other properties
}

// In service file, use require() with try/catch
let BleManager: any;
let Device: any;

try {
  const BLEModule = require('react-native-ble-manager');
  BleManager = BLEModule.default || BLEModule.BleManager || BLEModule;
  Device = BLEModule.Device;
} catch (error) {
  console.error('Failed to import react-native-ble-manager:', error);
  BleManager = null;
  Device = null;
}

// Use BLEDevice interface instead of Device type
function scanForDevices(): Promise<BLEDevice[]> {
  // ...
}
```

## Rules

1. **Never directly import types from native modules** - Create your own interfaces
2. **Always use require() with try/catch** for native modules
3. **Set variables to null** in catch blocks
4. **Check for null/undefined** before using native module APIs
5. **Export safe interfaces** from your types file

## Checklist

- [ ] No direct imports from `react-native-*` modules (except React Native core)
- [ ] All native module imports use `require()` with try/catch
- [ ] Safe interfaces defined in types file
- [ ] Null checks before using native module APIs
- [ ] Error handling for unavailable modules
