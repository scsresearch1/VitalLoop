# VitalLoop Mobile App

Android app for connecting to and displaying data from the Smart Ring via Bluetooth Low Energy (BLE).

## Features

- ✅ BLE device scanning and connection
- ✅ Real-time heart rate monitoring
- ✅ Device information display
- ✅ Battery level monitoring
- ✅ Data parsing and display

## Project Structure

```
mobile-app/
├── src/
│   ├── services/          # BLE and data services
│   │   ├── BLEManager.ts  # BLE connection management
│   │   └── DataParser.ts  # Protocol data parsing
│   ├── models/            # Data models
│   │   └── RingData.ts    # Ring data types
│   ├── types/             # TypeScript types
│   │   └── ble.ts         # BLE protocol types
│   ├── utils/             # Utilities
│   │   └── crc.ts         # CRC8 calculation
│   ├── screens/           # App screens
│   │   ├── DeviceScanScreen.tsx
│   │   └── DashboardScreen.tsx
│   └── components/        # Reusable components
├── App.tsx                # Main app component
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Physical Android device or emulator with Bluetooth support

### Installation

```bash
cd mobile-app
npm install
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android
```

## BLE Protocol Implementation

The app implements the BLE protocol specification from `BLE_PROTOCOL_SPECIFICATION.md`:

- **Service UUID**: `000002fd-3C17-D293-8E48-14FE2E4DA212`
- **TX Characteristic**: `0xFD03` (Write)
- **RX Characteristic**: `0xFD04` (Notify)
- **Frame Format**: 16-byte frames with CRC8 checksum
- **Opcode-based**: Command/response protocol

## Important Notes

⚠️ **BLE Library Compatibility**: 
- `react-native-ble-manager` requires native modules and may need a bare Expo workflow
- For Expo managed workflow, consider using `expo-bluetooth` (already installed)
- If using `react-native-ble-manager`, you may need to run `npx expo prebuild` to generate native code

## Next Steps

1. Test BLE connection with actual Ring device
2. Implement remaining opcodes (Sleep, BP, HRV, Sport)
3. Add data persistence (AsyncStorage)
4. Integrate with Firebase for cloud sync
5. Add ML server integration

## Troubleshooting

- **Bluetooth permissions**: Ensure location permissions are granted (required for BLE scanning on Android)
- **Device not found**: Check that the Ring is powered on and in pairing mode
- **Connection fails**: Verify the device is not already connected to another app
