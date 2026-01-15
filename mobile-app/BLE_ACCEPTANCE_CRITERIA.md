# BLE Implementation Acceptance Criteria

## ⚠️ CRITICAL: Answer Yes or No to EACH item
**Any single "No" = NOT DONE. Implementation is REJECTED.**

---

## A. Native BLE Availability

### A1. App Startup
- [ ] **Does the app start without the error "BLE native module not available"?**
  - **Answer**: Yes / No
  - **Validation**: Launch app, check console/logs for BLE initialization error
  - **If No**: Module not in APK → rebuild required

### A2. Native Module Runtime
- [ ] **Is the BLE native module loaded at runtime (not mocked, not web)?**
  - **Answer**: Yes / No
  - **Validation**: Check `NativeModules.BleManager` is defined and not null
  - **Test Code**: `console.log('BleManager:', NativeModules.BleManager ? 'Present' : 'Missing')`
  - **If No**: Native module not linked → check build configuration

### A3. Native Build Type
- [ ] **Is the app built as a native Android app (not Expo Go, not web)?**
  - **Answer**: Yes / No
  - **Validation**: App must be dev client build or production APK, NOT Expo Go
  - **If No**: Rebuild using `npx expo run:android` or EAS build

---

## B. Bluetooth & Permissions

### B1. Bluetooth State Detection
- [ ] **Can Bluetooth be enabled programmatically or detected as ON?**
  - **Answer**: Yes / No
  - **Validation**: App can check if Bluetooth is enabled/disabled
  - **Test**: Turn Bluetooth OFF, app should detect and prompt (or handle gracefully)
  - **If No**: BLE state monitoring not working

### B2. Runtime Permissions
- [ ] **Are all required Bluetooth permissions granted at runtime?**
  - **Answer**: Yes / No
  - **Required Permissions**:
    - Android 12+: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`
    - Android 11-: `ACCESS_FINE_LOCATION`
  - **Validation**: Check Android Settings → Apps → Your App → Permissions
  - **If No**: Permission requests not working → check `Permissions.ts`

### B3. Permission Persistence
- [ ] **Does the app proceed even after app relaunch without re-granting permissions?**
  - **Answer**: Yes / No
  - **Validation**: Grant permissions once, close app completely, reopen app
  - **Expected**: App should work without re-requesting permissions
  - **If No**: Permissions not persisted → check permission handling

---

## C. Device Discovery

### C1. Consistent Scanning
- [ ] **Can the app scan and discover the ring consistently?**
  - **Answer**: Yes / No
  - **Validation**: Start scan, ring should appear in device list within 10 seconds
  - **Test**: Repeat scan 3 times, ring should appear each time
  - **If No**: Scanning logic or permissions issue

### C2. Device Identification
- [ ] **Is the discovered device identifiable as the target ring (name/MAC/UUID)?**
  - **Answer**: Yes / No
  - **Validation**: Device name contains "Ring" or matches expected pattern (R01/R02/R03)
  - **OR**: Service UUID matches expected GATT service UUID
  - **OR**: MAC address matches known ring MAC
  - **If No**: Device filtering logic incorrect

---

## D. Connection Stability

### D1. Successful Connection
- [ ] **Can the app connect to the ring successfully?**
  - **Answer**: Yes / No
  - **Validation**: Tap device in list, connection completes without error
  - **Expected**: Connection state changes to "connected" within 5 seconds
  - **If No**: Connection logic or GATT service issue

### D2. Connection Stability
- [ ] **Does the connection stay stable for at least 2 minutes?**
  - **Answer**: Yes / No
  - **Validation**: Connect to ring, leave app open for 2+ minutes
  - **Expected**: Connection remains active, no unexpected disconnects
  - **If No**: Connection stability issue → check keepalive/heartbeat

### D3. Reconnection Capability
- [ ] **After disconnect, can the app reconnect without reinstalling?**
  - **Answer**: Yes / No
  - **Validation**: 
    1. Connect to ring
    2. Disconnect (manually or let it timeout)
    3. Attempt to reconnect
  - **Expected**: Reconnection succeeds without app restart/reinstall
  - **If No**: Reconnection logic broken

---

## E. GATT & Protocol

### E1. Service Discovery
- [ ] **Are the expected service UUID and TX/RX characteristics discovered?**
  - **Answer**: Yes / No
  - **Validation**: After connection, check logs for:
    - Main service UUID discovered
    - TX characteristic UUID found
    - RX characteristic UUID found
  - **Expected**: All three UUIDs match specification
  - **If No**: GATT discovery failing → check service/characteristic UUIDs

### E2. Notifications Enabled
- [ ] **Are notifications enabled successfully on the RX characteristic?**
  - **Answer**: Yes / No
  - **Validation**: Check logs for "Notifications enabled" or similar success message
  - **Expected**: No errors when enabling notifications
  - **If No**: Notification enable failing → check CCCD descriptor

### E3. Command Writing
- [ ] **Can the app write commands to the TX characteristic?**
  - **Answer**: Yes / No
  - **Validation**: Send a test command (e.g., request device info)
  - **Expected**: Write succeeds without error
  - **If No**: Write operation failing → check characteristic properties

---

## F. Real Data Reception (CRITICAL)

### F1. Raw Notification Bytes
- [ ] **Does the app receive raw notification bytes from the ring?**
  - **Answer**: Yes / No
  - **Validation**: Check logs for incoming notification data
  - **Expected**: `BleManagerDidUpdateValueForCharacteristic` events fire with data
  - **Test**: Log received bytes: `console.log('RX bytes:', data)`
  - **If No**: Notifications not arriving → check notification setup

### F2. Non-Empty Changing Data
- [ ] **Are the received bytes non-empty and changing over time?**
  - **Answer**: Yes / No
  - **Validation**: 
    - Received data array length > 0
    - Data values change between notifications (not all zeros or same value)
  - **Expected**: Different byte values received over 30 seconds
  - **If No**: Ring not sending data or parsing issue

### F3. Real Sensor Stream
- [ ] **Does at least one real sensor stream arrive (HR / Steps / SpO₂ / Temp)?**
  - **Answer**: Yes / No
  - **Validation**: Parse received data and verify at least one sensor value:
    - Heart Rate (HR): 60-200 bpm range
    - Steps: Incrementing counter
    - SpO₂: 90-100% range
    - Temperature: 30-40°C range
  - **Expected**: At least one sensor shows realistic, changing values
  - **If No**: Data parsing incorrect or wrong opcode handling

---

## G. End-to-End Proof

### G1. Live/Historical Data Display
- [ ] **Can the app show live or historical data originating from the ring (not dummy)?**
  - **Answer**: Yes / No
  - **Validation**: 
    - UI displays sensor data (dashboard/metrics screen)
    - Data updates in real-time or shows historical values
    - Data is NOT hardcoded/dummy data
  - **Expected**: Visible data that changes when ring sends updates
  - **If No**: Data not reaching UI or using mock data

### G2. Persistence After Restart
- [ ] **Can the same flow be repeated after app restart?**
  - **Answer**: Yes / No
  - **Validation**: 
    1. Complete full flow: connect → receive data → see in UI
    2. Close app completely (force stop)
    3. Reopen app
    4. Repeat: connect → receive data → see in UI
  - **Expected**: Same success after restart
  - **If No**: State management or initialization issue

---

## FINAL ACCEPTANCE RULE (Absolute)

### ✅ ACCEPTANCE CRITERIA
**If ALL answers are YES → ACCEPT**

**If ANY answer is NO → REJECT**

---

## One-Line Confirmation Required

**The dev team must confirm (verbatim):**

> "The Android app connects to the ring and continuously receives real sensor data over BLE."

**This statement must be TRUE for acceptance.**

---

## Testing Protocol

### Pre-Test Setup
1. Ring device is powered on and in range (< 10 meters)
2. Ring is not connected to another device
3. Android device has Bluetooth enabled
4. App is built as native Android (dev client or production)
5. All permissions granted

### Test Sequence
1. Launch app → Check A1, A2, A3
2. Grant permissions → Check B1, B2
3. Close and reopen app → Check B3
4. Start scan → Check C1, C2
5. Connect to ring → Check D1
6. Wait 2 minutes → Check D2
7. Disconnect and reconnect → Check D3
8. Verify GATT discovery → Check E1, E2, E3
9. Monitor incoming data → Check F1, F2, F3
10. Verify UI shows data → Check G1
11. Restart app and repeat → Check G2

### Test Log Template
```
Date: ___________
Tester: ___________
Device: ___________
Ring MAC: ___________

A1: Yes / No
A2: Yes / No
A3: Yes / No
B1: Yes / No
B2: Yes / No
B3: Yes / No
C1: Yes / No
C2: Yes / No
D1: Yes / No
D2: Yes / No
D3: Yes / No
E1: Yes / No
E2: Yes / No
E3: Yes / No
F1: Yes / No
F2: Yes / No
F3: Yes / No
G1: Yes / No
G2: Yes / No

FINAL: ACCEPT / REJECT
```

---

## Notes

- **No partial credit**: All items must be YES
- **No excuses**: "Almost working" = REJECT
- **No workarounds**: Must work as specified
- **Real data only**: Mock/dummy data = REJECT for F3, G1

**This checklist is non-negotiable.**
