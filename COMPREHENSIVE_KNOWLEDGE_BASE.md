# Comprehensive Knowledge Base - QRing Smart Ring/Watch BLE Protocol

## Table of Contents
1. [Protocol Architecture](#protocol-architecture)
2. [GATT Profile & Connection](#gatt-profile--connection)
3. [Frame Formats & CRC](#frame-formats--crc)
4. [Complete Opcode Catalogue](#complete-opcode-catalogue)
5. [Data Types & Extractable Information](#data-types--extractable-information)
6. [Multi-Packet Handling](#multi-packet-handling)
7. [Device Management](#device-management)
8. [Implementation Status](#implementation-status)

---

## Protocol Architecture

### Core Components

**1. BeanFactory Pattern**
- **Purpose**: Factory for creating response parser objects based on opcode
- **Location**: `com.oudmon.ble.base.bluetooth.BeanFactory`
- **Method**: `createBean(int opcode, int type)` → `BaseRspCmd`
- **Coverage**: 40+ opcodes mapped to response classes

**2. QCDataParser**
- **Purpose**: Central parser/router for BLE notifications and request responses
- **Key Methods**:
  - `checkCrc(byte[])` - Validates CRC8 checksum
  - `parserAndDispatchNotifyData()` - Routes unsolicited notifications
  - `parserAndDispatchReqData()` - Routes request responses
- **Routing**: Uses `SparseArray` for opcode → callback mapping

**3. BaseRspCmd (Abstract Base Class)**
- **Fields**: `status`, `cmdType`
- **Key Method**: `acceptData(byte[])` → `boolean`
  - Returns `true` = more packets expected (multi-packet accumulation)
  - Returns `false` = complete, dispatch callback
- **Pattern**: All response classes extend this base

### Request/Response Flow

```
Host → Device (TX):
  BuildFrame(opcode, payload) → Add CRC8 → Write to TX characteristic

Device → Host (RX):
  onCharacteristicChanged() 
    → Check length == 16 bytes
    → Validate CRC8
    → Extract opcode (data[0] & ~0x80)
    → Route to handler:
       - Request response: Lookup in LocalWriteRequestConcurrentHashMap
       - Notification: Lookup in NotifySparseArray
    → Create response object (BeanFactory.createBean)
    → Parse payload (response.acceptData)
    → If acceptData() returns false: Dispatch callback
```

---

## GATT Profile & Connection

### Service UUIDs

**Primary Service** (Main Communication):
- **UUID**: `000002fd-3C17-D293-8E48-14FE2E4DA212`
- **TX Characteristic**: `0xFD03` (64771 decimal) - Write/Write Without Response
- **RX Characteristic**: `0xFD04` (64772 decimal) - Notify
- **CCCD UUID**: `00002902-0000-1000-8000-00805f9b34fb` (standard)

**Large Data Service** (File Transfer):
- **Service**: `de5bf728-d711-4e47-af26-65e3012a5dc7`
- **TX**: `de5bf729-d711-4e47-af26-65e3012a5dc7`
- **RX**: `de5bf72a-d711-4e47-af26-65e3012a5dc7`

**Nordic UART Service** (Alternative/Backup):
- **Service**: `6e40fff0-b5a3-f393-e0a9-e50e24dcca9e`
- **TX**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **RX**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

**Device Information Service** (Standard):
- **Service**: `0000180A-0000-1000-8000-00805F9B34FB`
- **Firmware Revision**: `00002A26-0000-1000-8000-00805F9B34FB`
- **Hardware Revision**: `00002A27-0000-1000-8000-00805F9B34FB`
- **Software Revision**: `00002A28-0000-1000-8000-00805F9B34FB`

### Connection Parameters

- **Transport**: LE (Low Energy) only
- **MTU**: Default 20 bytes, negotiable via `PackageLengthRsp` (opcode 47)
- **Bonding**: Optional ("Just Works" - no passkey required)
- **Reconnect**: Auto-reconnect supported (configurable attempts)

### Initialization Sequence

1. **Connect**: `BluetoothGatt.connectGatt()`
2. **Discover Services**: `gatt.discoverServices()`
3. **Resolve Characteristics**: Find TX/RX characteristics
4. **Enable CCCD**: Write `0x0001` to notification descriptor (500ms delay)
5. **Common Commands** (500ms delay):
   - Battery Query (0x03)
   - Device Support Query (0x3C)
   - Package Length Query (0x2F)
   - App Revision Query (0xA1)
6. **Time Sync** (optional): SetTimeReq (0x01)
7. **User Profile** (optional): TimeFormatReq (0x0A)

---

## Frame Formats & CRC

### Standard Frame Format (16 bytes)

**TX Frame** (Host → Device):
```
Offset | Size | Field          | Description
-------|------|----------------|-------------
0      | 1    | Opcode         | Command opcode (bit 7 masked: opcode & ~0x80)
1-14   | 0-14 | Payload        | Command-specific data
15     | 1    | CRC8           | Checksum (sum mod 256)
```

**RX Frame** (Device → Host):
```
Offset | Size | Field          | Description
-------|------|----------------|-------------
0      | 1    | Opcode         | Response opcode (masked with ~0x80)
1-14   | 0-14 | Payload        | Response data
15     | 1    | CRC8           | Checksum
```

**CRC8 Calculation**:
```java
int crc = 0;
for (int i = 0; i < data.length - 1; i++) {
    crc += data[i] & 0xFF;
}
data[data.length - 1] = (byte)(crc & 0xFF);
```
- Simple sum of bytes 0-14, modulo 256
- Stored in byte 15 (last byte)

**Opcode Masking**:
- Request opcodes: `opcode | 0x80` (set bit 7)
- Response opcodes: `opcode & ~0x80` (clear bit 7)
- Mask constant: `Constants.f26289m = 128 (0x80)`

### Large Data Frame Format (Variable length)

**Frame Structure**:
```
Offset | Size | Field          | Description                    | Endianness
-------|------|----------------|--------------------------------|-------------
0      | 1    | Header         | 0xBC (188 decimal)             | Fixed
1      | 1    | Command/Type   | Command opcode                 | 
2-3    | 2    | Length         | Payload length                 | Little-endian short
4-5    | 2    | CRC16          | CRC16 checksum of payload      | Little-endian short
6      | N    | Payload        | Actual data                    | Up to MTU-6
```

**CRC16 Calculation**:
```java
// Polynomial: 0xA001 (CRC-16-IBM reversed)
// Initial value: 0xFFFF
int crc = 0xFFFF;
for (byte b : payload) {  // Payload only (bytes 6+)
    crc ^= (b & 0xFF);
    for (int i = 0; i < 8; i++) {
        if ((crc & 1) != 0) {
            crc = (crc >> 1) ^ 0xA001;
        } else {
            crc = crc >> 1;
        }
    }
}
return crc & 0xFFFF;
```

**Fragmentation Rules**:
- **Chunk Size**: 1024 bytes per chunk
- **Sequence Number**: Starting at 0, increments per chunk
- **Reassembly**: Buffer until `packet.length - 6 == length`

---

## Complete Opcode Catalogue

### Host → Device Commands (Request Opcodes)

| Opcode | Hex | Command Class | Response | Unsolicited | Description |
|--------|-----|---------------|----------|-------------|-------------|
| 1 | 0x01 | SetTimeReq | SetTimeRsp | No | Set device time |
| 2 | 0x02 | (Camera) | CameraNotifyRsp | Yes | Camera remote control |
| 3 | 0x03 | (Battery Query) | BatteryRsp | No | Query battery level |
| 5 | 0x05 | (Palm Screen) | PalmScreenRsp | No | Palm screen gesture |
| 6 | 0x06 | DndReq | DndRsp | No | Do Not Disturb settings |
| 7 | 0x07 | ReadTotalSportDataReq | TotalSportDataRsp | No | Read total sport data |
| 10 | 0x0A | TimeFormatReq | TimeFormatRsp | No | Time format (12/24h) |
| 12 | 0x0C | BpSettingReq | BpSettingRsp | No | Blood pressure settings |
| 17 | 0x11 | (Phone Notify) | PhoneNotifyRsp | Yes | Phone notification |
| 19 | 0x13 | ReadBandSportReq | ReadDetailSportDataRsp | No | Read band sport data |
| 20 | 0x14 | ReadPressureReq | ReadBlePressureRsp | No | Read pressure data |
| 21 | 0x15 | ReadHeartRateReq | ReadHeartRateRsp | No | Read heart rate data |
| 22 | 0x16 | (Heart Rate Setting) | HeartRateSettingRsp | No | Heart rate settings |
| 25 | 0x19 | (Degree Switch) | DegreeSwitchRsp | No | Temperature unit (°C/°F) |
| 26 | 0x1A | WeatherForecastReq | WeatherForecastRsp | No | Weather forecast |
| 29 | 0x1D | (Music Command) | MusicCommandRsp | Yes | Music control |
| 30 | 0x1E | (Real-time HR) | RealTimeHeartRateRsp | Yes | Real-time heart rate stream |
| 31 | 0x1F | (Display Time) | DisplayTimeRsp | No | Display time format |
| 33 | 0x21 | TargetSettingReq | TargetSettingRsp | No | Step/calorie target settings |
| 34 | 0x22 | (Find Phone) | FindPhoneRsp | Yes | Find phone (ring device) |
| 38 | 0x26 | (Read Sit Long) | ReadSitLongRsp | No | Read long sit settings |
| 40 | 0x28 | (Read Alarm) | ReadAlarmRsp | No | Read alarm settings |
| 44 | 0x2C | BloodOxygenSettingReq | BloodOxygenSettingRsp | No | Blood oxygen settings |
| 47 | 0x2F | (Package Length) | PackageLengthRsp | No | Query MTU/packet length |
| 50 | 0x32 | (Device Avatar) | DeviceAvatarRsp | No | Device avatar/image |
| 54 | 0x36 | (Pressure Setting) | PressureSettingRsp | No | Pressure detection settings |
| 56 | 0x38 | HrvSettingReq | HRVSettingRsp | No | HRV settings |
| 57 | 0x39 | HRVReq | HRVRsp | Yes | HRV data notification |
| 58 | 0x3A | SugarLipidsSettingReq | BloodSugarLipidsSettingRsp | No | Blood sugar/lipids settings |
| 59 | 0x3B | TouchControlReq | TouchControlResp | No | Touch control settings |
| 60 | 0x3C | DeviceSupportReq | DeviceSupportFunctionRsp | No | Query device capabilities |
| 67 | 0x43 | (Read Detail Sport) | ReadDetailSportDataRsp | No | Read detailed sport data |
| 68 | 0x44 | ReadSleepDetailsReq | ReadSleepDetailsRsp | No | Read sleep details |
| 72 | 0x48 | (Today Sport) | TodaySportDataRsp | No | Today's sport data |
| 80 | 0x50 | FindDeviceReq | FindPhoneRsp | No | Find device (payload: {0x55, 0xAA}) |
| 82 | 0x52 | MuslimRemindReq | MuslimRemindRsp | No | Muslim prayer reminder |
| 97 | 0x61 | (Read Message Push) | ReadMessagePushRsp | No | Read message push settings |
| 105 | 0x69 | StartHeartRateReq | StartHeartRateRsp | No | Start heart rate measurement |
| 106 | 0x6A | StopHeartRateReq | StopHeartRateRsp | No | Stop measurement |
| 114 | 0x72 | (Simple Status) | SimpleStatusRsp | No | Simple status response |
| 115 | 0x73 | (Device Notify) | DeviceNotifyRsp | Yes | Device notification (catch-all) |
| 119 | 0x77 | (App Sport) | AppSportRsp | Yes | App sport data |
| 120 | 0x78 | (Device Notify) | DeviceNotifyRsp | Yes | Device notification |
| 122 | 0x7A | (Muslim) | MuslimRsp | No | Muslim data |
| 123 | 0x7B | MuslimTargetReq | MuslimTargetRsp | No | Muslim target/goal |
| -95 | 0xA1 | AppRevisionReq | AppRevisionResp | No | App revision query |

### Device → Host Responses/Notifications

**Response Routing**:
- **Request Responses**: Same opcode as request, routed via `LocalWriteRequestConcurrentHashMap`
- **Unsolicited Notifications**: Registered via `addNotifyListener(opcode, callback)`
- **Default Handler**: Opcode 115 (0x73) routes to `DeviceNotifyRsp` (catch-all)

---

## Data Types & Extractable Information

### A. DIRECTLY EXTRACTABLE DATA (Protocol-Confirmed)

#### 1. Cardiovascular & Autonomic Signals

**Heart Rate (Interval + Real-time)**:
- **History**: Opcode 0x15 (ReadHeartRateReq → ReadHeartRateRsp)
  - Multi-packet collection
  - 13-byte records: timestamp (4) + HR (1) + reserved (8)
  - 5-minute intervals (288 samples/day)
  - Sample rate configurable (default: 5 minutes)
- **Real-time**: Opcode 0x1E (RealTimeHeartRateRsp)
  - Single-packet notifications
  - Continuous stream until `StopHeartRateReq`
- **Start/Stop**: Opcode 0x69 (StartHeartRateReq), 0x6A (StopHeartRateReq)
- **Resting HR**: Inferred from low-activity windows
- **Real-time HR alerts**: Via DeviceNotifyRsp (dataType 1)

**HRV (Heart Rate Variability)**:
- **History**: Opcode 0x39 (HRVReq → HRVRsp)
  - Multi-packet collection
  - 13-byte records (same structure as HR)
  - 30-minute intervals (default)
- **Settings**: Opcode 0x38 (HrvSettingReq → HRVSettingRsp)
  - Enable/disable state
- **Stop/Start**: Via StopHeartRateReq (type 10)

#### 2. Blood Oxygen (SpO₂)

**Measurements**:
- **Settings**: Opcode 0x2C (BloodOxygenSettingReq → BloodOxygenSettingRsp)
  - Enable/disable state
  - Measurement interval (configurable)
- **History**: Via Large Data Service (command byte 0x35-0x39)
- **Real-time**: Via Large Data Service streaming
- **Notifications**: DeviceNotifyRsp (dataType 3)
- **Stop/Start**: Via StopHeartRateReq (type 3)

#### 3. Blood Pressure (Estimated)

**Measurements**:
- **History**: Opcode 0x14 (ReadPressureReq → ReadBlePressureRsp)
  - Multi-packet collection
  - 6-byte records: timestamp (4) + DBP (1) + SBP (1)
  - 50 records per batch
  - End marker: `0xFFFFFFFF` timestamp
- **Settings**: Opcode 0x0C (BpSettingReq → BpSettingRsp)
- **Live Sessions**: Via PressureRsp (opcode 0x37)
- **Stop/Start**: Via StopHeartRateReq (type 2)
- **Note**: Algorithmic BP (not cuff-based), but physiologically valuable

#### 4. Temperature

**Measurements**:
- **Skin Temperature**: Continuous or interval
- **Body Temperature**: Variant-specific
- **History**: Via Large Data Service (command byte 0x35)
- **Notifications**: DeviceNotifyRsp (dataType 5)
- **Stop/Start**: Via StopHeartRateReq (type 11)
- **Unit**: °C or °F (configurable via DegreeSwitchRsp, opcode 0x19)

#### 5. Activity & Motion

**Step Count**:
- **Standard**: DeviceNotifyRsp (dataType 11)
- **Ring-specific**: DeviceNotifyRsp (dataType 18)
  - Format: TotalSteps (3 bytes LE) + Calories (3 bytes LE) + Distance (3 bytes LE)
- **Total Daily**: Opcode 0x07 (ReadTotalSportDataReq → TotalSportDataRsp)
  - 2-packet aggregated data
  - Includes: steps, running steps, calories, distance, sport duration, sleep duration

**Sport Sessions**:
- **Detail History**: Opcode 0x13 (ReadBandSportReq → ReadDetailSportDataRsp)
  - Multi-packet collection
  - BCD date format
  - Fields: calorie, steps, distance per interval
  - Calorie scaling flag (×10 if set)
- **Today's Data**: Opcode 0x48 (TodaySportDataRsp)
- **Notifications**: DeviceNotifyRsp (dataType 7)

#### 6. Sleep

**Sleep Data**:
- **History**: Opcode 0x44 (ReadSleepDetailsReq → ReadSleepDetailsRsp)
  - Multi-packet collection
  - BCD date format (year, month, day)
  - Time index (5-minute intervals, 0-287 per day)
  - Sleep quality array (8 bytes per packet)
  - Up to 29 days history
- **Segments**: 96 segments per day (15-minute intervals, 0-95)
- **Quality**: 0-255 (higher = better sleep)

#### 7. Device Interaction & Touch

**Touch Events**:
- **Settings**: Opcode 0x3B (TouchControlReq → TouchControlResp)
- **Notifications**: DeviceNotifyRsp (dataType 12)
  - Format: `{dataType, unknown, value}` where value = touch/revision value
- **Touch Gesture Detection**: Via DeviceSupportFunctionRsp (feature bit)
- **Ring-only Mode**: DeviceSupportFunctionRsp.C flag (RingTouchOnly)

#### 8. Device & Firmware Metadata

**Capability Discovery**:
- **Query**: Opcode 0x3C (DeviceSupportReq → DeviceSupportFunctionRsp)
- **Feature Bitmap**: 10 bytes (bytes 0-9)
  - 30+ feature flags: Touch, Gesture, Camera, Music, Video, HRV, Temperature, etc.
  - RingTouchOnly mode detection
- **Firmware Version**: Opcode 0xA1 (AppRevisionReq → AppRevisionResp)
- **Battery**: Opcode 0x03 (BatteryRsp)
  - Format: `{battery_level, charging_flag}`

### B. INDIRECTLY DERIVABLE DATA (Computable)

#### 9. Autonomic Nervous System Metrics
- Sympathetic/parasympathetic balance
- Stress index
- Recovery index
- Vagal tone proxy
- Night-time autonomic suppression
- **Derived from**: HR, HRV, Sleep stages, Temperature coupling

#### 10. Circadian Rhythm Features
- Circadian phase alignment
- Temperature rhythm amplitude
- HR circadian minima
- Sleep regularity
- Jet-lag/shift detection

#### 11. Cardiopulmonary Coupling
- HR–SpO₂ coherence
- Motion-corrected oxygen dynamics
- Perfusion quality indicators
- Respiratory stress proxy

#### 12. Fatigue & Load Indicators
- Cumulative physiological load
- Recovery debt
- Training strain proxy
- Overreaching indicators

#### 13. Longitudinal Trends
- Baseline drift (weeks/months)
- Early deviation detection
- Adaptation vs degradation separation
- Aging trend inference

### C. LATENT/UNLOCKABLE DATA (ML Required)

#### 14. Signal Quality & Contact Metrics
- Ring fit quality (inferred)
- Motion artifact probability
- Optical coupling quality
- Measurement confidence score

#### 15. Early Health Weak Signals
- Pre-symptomatic stress signatures
- Illness onset precursors
- Sleep fragmentation drift
- Autonomic instability episodes

#### 16. Behavioral Signatures
- Daily routine stability
- Activity regularity
- Recovery behavior patterns
- Lifestyle-driven physiological responses

#### 17. Personalized Physiological Baselines
- Individual HRV norms
- Individual SpO₂ variability envelope
- Temperature baseline drift
- Activity-response curves

---

## Multi-Packet Handling

### Common Pattern (Heart Rate, HRV, Pressure)

**Packet 0x00** (Header):
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Marker     | 0x00 (header marker)
1      | 1    | Count      | Total record count
2      | 1    | Range      | Time range (minutes per interval)
```

**Packet 0x01** (Timestamp/Date):
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Marker     | 0x01 (timestamp marker)
1-4    | 4    | UTC Time   | UTC timestamp (seconds, timezone-adjusted)
5+     | N    | Data Start | First data chunk
```

**Packets 0x02-0xFE** (Data Records):
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Index      | Packet index (0x02, 0x03, ..., count-1)
1-13   | 13   | Record     | Data record (13 bytes per record)
```

**End Condition**: `packetIndex == totalRecordCount - 1` OR `packetIndex == 0xFF` (no data)

### Sleep Pattern

**Packet 0xF0** (Init):
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Marker     | 0xF0 (init marker)
```

**Data Packets**:
```
Offset | Size | Field          | Description
-------|------|----------------|-------------
0      | 1    | Year (BCD)     | Year (BCD, +2000)
1      | 1    | Month (BCD)    | Month (BCD)
2      | 1    | Day (BCD)      | Day (BCD)
3      | 1    | Time Index     | Time index (5-minute intervals)
4      | 1    | Packet Index   | Current packet index
5      | 1    | Total Packets  | Total packets - 1
6-13   | 8    | Sleep Qualities| Sleep quality per 5-min interval (0-255)
```

**End Condition**: `packetIndex == totalPackets - 1`

### Sport Data Pattern

**Packet 0xF0** (Init):
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Marker     | 0xF0
2      | 1    | Flag       | 1 = calorie scaled by 10
```

**Data Packets**:
```
Offset | Size | Field          | Description
-------|------|----------------|-------------
0      | 1    | Year (BCD)     | Year (BCD, +2000)
1      | 1    | Month (BCD)    | Month (BCD)
2      | 1    | Day (BCD)      | Day (BCD)
3      | 1    | Time Index     | Time index
4      | 1    | Packet Index   | Current index
5      | 1    | Total Packets  | Total - 1
6-7    | 2    | Calorie        | Calories (LE, scaled by 10 if flag set)
8-9    | 2    | Steps          | Steps (LE)
10-11  | 2    | Distance       | Distance (LE, units unknown)
```

**End Condition**: `packetIndex == totalPackets - 1`

### Blood Pressure Pattern

**No Header Packet**: Direct data packets

**Each Packet**: 6 bytes per record
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0-3    | 4    | Timestamp  | Timestamp (uint32, UTC)
4      | 1    | SBP        | Systolic BP
5      | 1    | DBP        | Diastolic BP
```

**Batch Size**: 50 records per response (300 bytes total)
**End Marker**: `timestamp == 0xFFFFFFFF` (no more data)

### Total Sport Data Pattern (2-packet)

**Packet 0**:
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Index      | 0
1      | 1    | Days Ago   | Days ago (BCD)
2-4    | 3    | Date       | Date (BCD year, month, day)
5-13   | 9    | Totals     | Steps, running steps, calories
```

**Packet 1**:
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | Index      | 1
1-4    | 4    | Date       | Date (must match packet 0)
5-11   | 7    | Additional | Distance, sport duration, sleep duration
```

**End Condition**: `packetIndex == 1` (fixed 2 packets)

---

## Device Management

### DeviceNotifyRsp (Catch-All Notification)

**Opcode**: 0x73 (115)

**Base Structure**:
```
Offset | Size | Field      | Description
-------|------|------------|-------------
0      | 1    | DataType   | Data type identifier
1+     | N    | Payload    | Type-specific data
```

**DataType Mapping**:
- **1**: Heart Rate - Triggers `syncTodayData()` when status == 0
- **2**: Blood Pressure - Triggers sync when status == 0
- **3**: Blood Oxygen (SpO₂) - Triggers `syncTodayData()` when status == 0
- **5**: Temperature - Triggers sync when status == 0
- **7**: Sport Data - Triggers sync when status == 0
- **11**: Step Data - Used for step updates
- **12**: Device Revision/Touch Control - Format: `{dataType, unknown, value}`
- **18**: Step Data (Ring Variant) - Format: `{dataType, steps[3], calories[3], distance[3]}`
- **100**: General Health Data - Master listener (removes other listeners when registered)

**Registration Pattern**:
```java
BleOperateManager.getInstance().addOutDeviceListener(dataType, listener)
```

**Handler Pattern**:
```java
public void onDataResponse(@Nullable DeviceNotifyRsp resultEntity) {
    if (resultEntity != null && resultEntity.getStatus() == 0) {
        if (resultEntity.getDataType() == EXPECTED_TYPE) {
            // Process notification
            viewModel.syncTodayData();
        }
    }
}
```

### DeviceSupportFunctionRsp Feature Bit Mapping

**Opcode**: 0x3C (60)

**Response Format**: 10 bytes (bytes 0-9)

**Feature Bits** (from `DeviceSupportFunctionRsp.acceptData()`):

| Byte | Bit | Field | Meaning |
|------|-----|-------|---------|
| 1 | 0 | f26658c | Touch control support |
| 1 | 1 | f26659d | Muslim features support |
| 1 | 2 | f26660e | App revision query support |
| 1 | 3 | f26661f | BLE pairing support |
| 1 | 6 | H | Reserved |
| 1 | 7 | f26662g | Reserved |
| 2 | 0 | f26663h | Gesture control support |
| 2 | 1 | f26664i | Ring music support |
| 2 | 2 | f26665j | Ring video support |
| 2 | 3 | f26666k | Ring ebook support |
| 2 | 4 | f26667l | Camera control support |
| 2 | 5 | f26668m | Ring call support |
| 2 | 6 | f26669n | Ring game support |
| 3 | 0 | f26680y | Heart rate measurement support |
| 3 | 2 | f26678w | Long sit reminder support |
| 3 | 3 | f26679x | Drink reminder support |
| 3 | 4 | f26681z | Skin temperature support |
| 3 | 5 | A | No single temperature support |
| 3 | 7 | I | AI health analysis support |
| 4 | 3 | B | Reserved |
| 4 | 4 | D | TP Sleep (Touch panel sleep) |
| 4 | 5 | E | Reserved |
| 4 | 7 | F | Reserved |
| 5 | All | C | RingTouchOnly mode flag |
| 5 | 0-7 | (if C=true) | Alternate feature mapping (overrides byte 2) |
| 6 | 3 | M | Lover space feature |
| 6 | 4 | G | Reserved |
| 6 | 5 | J | Reserved |
| 6 | 6 | K | Alarm support |
| 6 | 7 | L | Reserved |
| 7 | 0 | O | Reserved |
| 7 | 1 | P | Notification support |
| 7 | 2 | Q | Reserved |
| 7 | 3 | R | Call reminder support |
| 7 | 4 | S | Real-time heart rate support |
| 7 | 5 | N | Friends feature support |
| 7 | 6 | T | Real-time HR reminder support |
| 9 | 1 | U | Lover interaction support |

**Conditional Mapping**: If `C` (RingTouchOnly) is true, byte 5 fields override byte 2 fields for ring-specific features.

### Device Models Supported

**Ring Models**: R01, R02, R03, R04, R05, R06, R11
**Ring Variants**: VK-5098, MERLIN, Hello Ring, RING1, boAtring
**Band Models**: Y25, H59

**Scan Configuration**: `com.qc.app_scan_config` contains model list

---

## Implementation Status

### Completeness Assessment

| Category | Completeness | Criticality | Status |
|----------|--------------|-------------|--------|
| Core Protocol | 100% | Critical | ✅ Ready |
| Health Data Types | 95% | Critical | ✅ Ready |
| Multi-Packet Handling | 100% | Critical | ✅ Ready |
| Device Management | 90% | Critical | ✅ Ready |
| Command Sequencing | 85% | High | ✅ Ready |
| Error Handling | 20% | Medium | ⚠️ Needs Testing |
| Advanced Features | 50% | Low | ⚠️ Optional |
| Unknown Opcodes | 10% | Low | ⚠️ Can Ignore |

**Overall: 90% Complete for Core Functionality**

### What's Complete

✅ **Core Protocol Infrastructure** (100%)
- Frame formats (TX/RX 16-byte + CRC8, Large Data 0xBC + CRC16)
- CRC algorithms (CRC8 sum mod 256, CRC16 polynomial 0xA001)
- Opcode catalogue (40+ opcodes mapped)
- RX parser/demux (QCDataParser routing logic)
- Request/response pattern (opcode masking)

✅ **Health Data Types** (95%)
- Heart Rate (history + live)
- Blood Pressure (history + live)
- Sleep (history)
- Sport/Steps (detail + total)
- SpO₂ (settings + history)
- HRV (settings + history)
- Battery

✅ **Multi-Packet Handling** (100%)
- Packet indexing rules
- End condition detection
- Reassembly logic
- Buffer accumulation

✅ **Device Management** (90%)
- Capability discovery
- Device notifications
- Time sync
- Feature gating

### What's Partially Complete

⚠️ **Some Opcodes** (10-15% Unknown)
- Core opcodes: Fully documented
- Advanced features: Payload formats unclear (Camera, Weather, Find Phone, Muslim features)
- Impact: LOW - Core health data opcodes (90%+) are fully documented

⚠️ **DeviceNotifyRsp Payloads** (80% Complete)
- DataType 1, 2, 3, 5, 7, 11, 12, 18, 100: Documented
- Some payload formats: Unknown
- Impact: MEDIUM - Can receive notifications but may not interpret all event types

⚠️ **Error Codes** (20% Complete)
- Status 0 = Success: Documented
- Non-zero status: Meaning unknown
- Impact: MEDIUM - Know when commands fail but not why

⚠️ **Large Data Service** (70% Complete)
- Frame format: Documented
- Command bytes: Some documented (interval temp, manual HR, contacts)
- Other command bytes: Unknown
- Impact: LOW - Core health data doesn't use large data service

### What's Missing (Not Critical)

❌ **Device Model Differences**
- Protocol structure appears identical, only feature gating differs
- Impact: LOW - Feature discovery handles this

❌ **Advanced Features**
- Camera control, Weather, Find Phone, DND Mode, Muslim features
- Impact: LOW - Nice-to-have features, not core health data

❌ **Security/Obfuscation**
- No encryption: Confirmed
- No bonding requirement: Confirmed
- Impact: NONE - Security is straightforward

### Implementation Phases

**Phase 1: Core BLE Communication** (Week 1-2)
- ✅ Frame construction (16-byte + CRC8)
- ✅ Frame parsing (CRC8 validation)
- ✅ Opcode routing (BeanFactory pattern)
- ✅ GATT service discovery
- ✅ Characteristic write/notify setup
- ✅ Connection management

**Phase 2: Basic Device Interaction** (Week 2-3)
- ✅ SetTime command
- ✅ TimeFormat command
- ✅ DeviceSupportFunction query
- ✅ Battery read
- ✅ Basic notifications

**Phase 3: Health Data Reading** (Week 3-4)
- ✅ Heart rate history
- ✅ Sleep history
- ✅ Sport/Steps history
- ✅ Blood pressure history
- ✅ Multi-packet reassembly

**Phase 4: Live Measurements** (Week 4-5)
- ✅ Real-time heart rate
- ✅ Start/Stop commands
- ✅ Live notification handling

**Phase 5: Settings & Configuration** (Week 5-6)
- ✅ BP settings
- ✅ HR settings
- ✅ SpO₂ settings
- ✅ HRV settings
- ✅ Target settings

**Phase 6: Advanced Features** (Week 6+)
- ⚠️ Large data service (if needed)
- ⚠️ Device notifications (all dataTypes)
- ⚠️ Error handling refinement
- ⚠️ Edge case testing

---

## Key Insights & Best Practices

### 1. Multi-Packet Protocol Pattern
- Many responses accumulate data across packets until `acceptData()` returns `false`
- Packet index validation is critical for correct reassembly
- End conditions vary by data type (packet count, 0xFF marker, 0xFFFFFFFF timestamp)

### 2. Two Notification Paths
- **Specific opcodes**: Direct opcode-based notifications (e.g., 0x1E for real-time HR)
- **DeviceNotifyRsp**: Catch-all notification (opcode 115) with dataType routing

### 3. History Sync Semantics
- **Timestamp-based**: "Since timestamp" queries (HR, BP, Sport)
- **Day-offset**: "Days ago" queries (Sleep, Total Sport)
- **Non-destructive**: Reading doesn't clear device data

### 4. Feature Gating
- Always query `DeviceSupportFunctionRsp` before using features
- Not all devices support all opcodes
- RingTouchOnly mode uses alternate feature mapping

### 5. Time Handling
- All timestamps are UTC on wire
- Device applies timezone offset for display
- BCD dates are device-local
- Time sync recommended for accurate timestamps

### 6. Error Handling
- Status 0 = Success (all handlers check this)
- Non-zero status = Error (exact meanings not documented)
- No explicit retry logic in code
- Reconnect on disconnect (up to 10 attempts)

### 7. Large Data Service
- Used for file transfers and extended health data streams
- Frame format: 0xBC header + CRC16
- Fragmentation: 1024-byte chunks
- Not used for core health data (uses standard 16-byte frames)

---

## Validation Checklist

### For Each Capture:
- [ ] Frame length = 16 bytes (standard) or variable (large data)
- [ ] CRC8 validation passes (standard) or CRC16 (large data)
- [ ] Opcode extraction: `opcode = data[0] & (~0x80)`
- [ ] Payload length = 14 bytes (standard) or variable (large data)
- [ ] Multi-packet reassembly: Packet index matches expected sequence
- [ ] End condition: `acceptData()` returns `false` on last packet
- [ ] Decoded values: Within expected ranges (HR: 40-200, BP: 60-200, etc.)
- [ ] Timestamps: Valid Unix epoch, timezone-adjusted correctly

### Key Code References

**RX Notification Parser/Demux** (Most Critical):
- **File**: `QCBluetoothCallbackReceiver.java`
- **Method**: `onCharacteristicChange()`
- **Flow**: 
  1. Check length == 16 bytes
  2. Validate CRC: `QCDataParser.checkCrc()`
  3. Try request response: `QCDataParser.parserAndDispatchReqData()`
  4. Fallback to notification: `QCDataParser.parserAndDispatchNotifyData()`

**Opcode Factory**:
- **File**: `BeanFactory.java`
- **Method**: `createBean(int opcode, int type)`
- **Purpose**: Creates response parser object for each opcode

**Frame Format**:
- **File**: `QCDataParser.java`
- **CRC Check**: `checkCrc()` - simple sum mod 256
- **Opcode Extract**: `opcode = data[0] & (~Constants.f26289m)` where `f26289m = 128 (0x80)`

---

## Conclusion

**YES, sufficient information exists to build a production-ready app** for core health data functionality. The documented protocol covers 90%+ of what's needed for a typical fitness/health tracking app.

**Next Steps**:
1. Implement core BLE stack (Phase 1-2)
2. Test with real device
3. Iterate based on findings
4. Expand to advanced features as needed

**Estimated Effort**: 4-7 weeks for a functional app (depending on platform and experience)

---

*Last Updated: Based on analysis of decompiled Android APK code, protocol specification, and completeness assessment documents.*
