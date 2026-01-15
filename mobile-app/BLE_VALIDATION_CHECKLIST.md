# BLE Acceptance Criteria - Quick Checklist

**Instructions**: Answer Yes or No to each item. Any single "No" = REJECT.

---

## A. Native BLE Availability

- [ ] **A1**: Does the app start without the error "BLE native module not available"?  
  **Answer**: Yes / No

- [ ] **A2**: Is the BLE native module loaded at runtime (not mocked, not web)?  
  **Answer**: Yes / No

- [ ] **A3**: Is the app built as a native Android app (not Expo Go, not web)?  
  **Answer**: Yes / No

---

## B. Bluetooth & Permissions

- [ ] **B1**: Can Bluetooth be enabled programmatically or detected as ON?  
  **Answer**: Yes / No  
  **⚠️ CODE GAP**: Currently only listens to state changes, doesn't check/enable

- [ ] **B2**: Are all required Bluetooth permissions granted at runtime?  
  **Answer**: Yes / No

- [ ] **B3**: Does the app proceed even after app relaunch without re-granting permissions?  
  **Answer**: Yes / No

---

## C. Device Discovery

- [ ] **C1**: Can the app scan and discover the ring consistently?  
  **Answer**: Yes / No

- [ ] **C2**: Is the discovered device identifiable as the target ring (name/MAC/UUID)?  
  **Answer**: Yes / No

---

## D. Connection Stability

- [ ] **D1**: Can the app connect to the ring successfully?  
  **Answer**: Yes / No

- [ ] **D2**: Does the connection stay stable for at least 2 minutes?  
  **Answer**: Yes / No

- [ ] **D3**: After disconnect, can the app reconnect without reinstalling?  
  **Answer**: Yes / No  
  **⚠️ CODE GAP**: No auto-reconnect logic implemented

---

## E. GATT & Protocol

- [ ] **E1**: Are the expected service UUID and TX/RX characteristics discovered?  
  **Answer**: Yes / No

- [ ] **E2**: Are notifications enabled successfully on the RX characteristic?  
  **Answer**: Yes / No

- [ ] **E3**: Can the app write commands to the TX characteristic?  
  **Answer**: Yes / No

---

## F. Real Data Reception (CRITICAL)

- [ ] **F1**: Does the app receive raw notification bytes from the ring?  
  **Answer**: Yes / No

- [ ] **F2**: Are the received bytes non-empty and changing over time?  
  **Answer**: Yes / No

- [ ] **F3**: Does at least one real sensor stream arrive (HR / Steps / SpO₂ / Temp)?  
  **Answer**: Yes / No

---

## G. End-to-End Proof

- [ ] **G1**: Can the app show live or historical data originating from the ring (not dummy)?  
  **Answer**: Yes / No  
  **⚠️ NOTE**: Code has fallback dummy data for charts if no real data

- [ ] **G2**: Can the same flow be repeated after app restart?  
  **Answer**: Yes / No  
  **⚠️ CODE GAP**: No persistence, requires manual reconnect

---

## FINAL ACCEPTANCE

**If ALL answers are YES → ACCEPT**  
**If ANY answer is NO → REJECT**

---

## One-Line Confirmation

> "The Android app connects to the ring and continuously receives real sensor data over BLE."

**Status**: Yes / No

---

## Known Code Gaps (Must Fix Before Acceptance)

1. **B1**: Add Bluetooth state check/enable functionality
2. **D3**: Add reconnection logic after disconnect
3. **G2**: Add persistence (store last device, auto-reconnect on restart)

See `BLE_VALIDATION_REPORT.md` for detailed analysis.
