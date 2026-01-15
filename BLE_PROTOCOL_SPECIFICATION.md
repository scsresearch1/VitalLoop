# BLE Protocol Specification - QRing Smart Ring/Watch

## 1. Device Identity & Pairing

### 1.1 Device Identifiers
- **BLE MAC Address**: Used as primary device identifier
  - Stored in `UserConfig.getDeviceAddress()` / `getDeviceAddressNoClear()`
  - Format: Standard BLE MAC address (e.g., "AA:BB:CC:DD:EE:FF")
  - Used as primary key in database entities (e.g., `AppHeartEntity`, `BloodPressureEntity`)

- **Device Serial/Model**: 
  - Scan configuration supports multiple device models: `R01,R02,R03,VK-5098,MERLIN,Hello Ring,RING1,boAtring,R04,R05,R06,R11,Y25,H59`
  - Stored in preferences: `com.qc.app_scan_config`

- **App-layer UUID**: Not explicitly used; MAC address is the primary identifier

### 1.2 Bonding Requirements
- **Bonding Type**: Optional ("Just Works" - no passkey required)
  - `GattConnParams.createBond(boolean)` - bonding is configurable, not mandatory
  - No forced bonding before data access observed
  - Bonding appears optional for basic functionality

### 1.3 Reconnect Strategy
- **Auto-reconnect**: Supported via `GattConnParams.reconnectTimes(int)` (default: 1)
- **Background**: Connection maintained via `BleOperateManager` with background handlers
- **Multi-device**: Single active connection at a time (device address stored in `UserConfig`)

## 2. GATT Profile Map

### 2.1 Primary Service UUID
- **Main Service**: `000002fd-3C17-D293-8E48-14FE2E4DA212`
  - Defined in: `GattLayer.f39793r`
  - Used for main data communication

### 2.2 Characteristics

#### TX Characteristic (Host → Device)
- **UUID**: `0xFD03` (64771 decimal) - `BluetoothUuid.fromShortValue(64771)`
- **Property**: Write / Write Without Response
- **Service**: Primary service above
- **Usage**: Command transmission

#### RX Characteristic (Device → Host)
- **UUID**: `0xFD04` (64772 decimal) - `BluetoothUuid.fromShortValue(64772)`
- **Property**: Notify
- **Service**: Primary service above
- **Usage**: Response/notification reception

#### CCCD (Client Characteristic Configuration Descriptor)
- **UUID**: `00002902-0000-1000-8000-00805f9b34fb` (standard CCCD UUID)
- **Type**: Notifications (value 0x0001 to enable)
- **Implementation**: 
  - `GattLayer.enableCccd()` enables notifications
  - `setCharacteristicNotification(gatt, characteristic, true)` sets notification
  - CCCD write value checked: `descriptor.getValue()[0] == 1` for enabled

### 2.3 Additional Services

#### Large Data Service (File Transfer)
- **Service UUID**: `de5bf728-d711-4e47-af26-65e3012a5dc7`
- **TX UUID**: `de5bf729-d711-4e47-af26-65e3012a5dc7`
- **RX UUID**: `de5bf72a-d711-4e47-af26-65e3012a5dc7`

#### Nordic UART Service (Alternative/Backup)
- **Service UUID**: `6e40fff0-b5a3-f393-e0a9-e50e24dcca9e`
- **TX UUID**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e` (write)
- **RX UUID**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e` (notify)

#### Device Information Service
- **Service UUID**: `0000180A-0000-1000-8000-00805F9B34FB` (standard)
- **Firmware Revision**: `00002A26-0000-1000-8000-00805F9B34FB`
- **Hardware Revision**: `00002A27-0000-1000-8000-00805F9B34FB`
- **Software Revision**: `00002A28-0000-1000-8000-00805F9B34FB`

## 3. Connection Parameters

### 3.1 Transport Type
- **Type**: LE (Low Energy) only
- **PHY**: Not explicitly requested in code (uses default)
- **MTU**: 
  - Default: 20 bytes (BLE minimum)
  - Negotiated via `JPackageManager` - minimum 20 bytes, can be increased
  - `PackageLengthRsp` reports device MTU capability
  - MTU change callback: `onMtuChanged(BluetoothGatt gatt, int mtu, int status)`

### 3.2 Connection Priority
- **Default**: Balanced (not explicitly set in code)
- **API Available**: `BluetoothGatt.requestConnectionPriority(int priority)`
  - Priority values: `CONNECTION_PRIORITY_HIGH`, `CONNECTION_PRIORITY_BALANCED`, `CONNECTION_PRIORITY_LOW_POWER`
- **Not Explicitly Set**: Code doesn't show explicit priority requests

### 3.3 Timing Constraints
- **Write Delays**: Not explicitly enforced; uses BLE stack defaults
- **Notification Latency**: Not explicitly controlled
- **Retry Policy**: 
  - Timeout mechanism in `BleOperateManager` (lock timeout)
  - Reconnect attempts: configurable via `GattConnParams.reconnectTimes()`

## 4. Packet Framing Specification (AUTHORITATIVE)

### 4.1 TX Frame Format (Host → Device)

**Exact Frame Structure**:
```
Offset | Size | Field          | Description                    | Notes
-------|------|----------------|--------------------------------|------------------
0      | 1    | Opcode         | Command opcode                 | Bit 7 masked: opcode & ~0x80
1-14   | 0-14 | Payload        | Command-specific data          | Variable length
15     | 1    | CRC8           | Checksum (sum mod 256)        | Last byte
```

**Total Frame Size**: **Fixed 16 bytes** (`Constants.f26288l = 16`)

**Opcode Masking**:
- Opcode extraction: `opcode = data[0] & (~Constants.f26289m)` where `f26289m = 128 (0x80)`
- This clears bit 7 (0x80) to get base opcode
- Bit 7 may be used as a flag (response vs request)

**CRC8 Calculation** (Standard Commands):
```java
int crc = 0;
for (int i = 0; i < data.length - 1; i++) {
    crc += data[i] & 0xFF;
}
data[data.length - 1] = (byte)(crc & 0xFF);
```
- Simple sum of bytes 0-14, modulo 256
- Stored in byte 15 (last byte)

**Write Type**:
- **Default**: Write WITH Response (`BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT = 2`)
- **Optional**: Write WITHOUT Response (`WRITE_TYPE_NO_RESPONSE = 1`)
- Set via: `characteristic.setWriteType(1 or 2)`
- Default behavior expects ACK via notification

### 4.2 RX Frame Format (Device → Host)

**Frame Structure** (Same as TX):
```
Offset | Size | Field          | Description
-------|------|----------------|-------------
0      | 1    | Opcode         | Response opcode (masked with ~0x80)
1-14   | 0-14 | Payload        | Response data
15     | 1    | CRC8           | Checksum
```

**Frame Validation** (`QCBluetoothCallbackReceiver.onCharacteristicChange()`):
1. Check length == 16 bytes
2. Verify CRC: `QCDataParser.checkCrc(data)`
3. Extract opcode: `opcode = data[0] & (~0x80)`
4. Route to handler based on opcode

**RX Demux Flow**:
```
onCharacteristicChanged() 
  → bleCharacteristicChanged() 
    → QCBluetoothCallbackReceiver.onCharacteristicChange()
      → QCDataParser.parserAndDispatchReqData() [if request response]
      → QCDataParser.parserAndDispatchNotifyData() [if unsolicited notification]
```

**Response Routing**:
- Request responses: Lookup in `LocalWriteRequestConcurrentHashMap` by opcode
- Unsolicited notifications: Lookup in `NotifySparseArray` by opcode
- Create response object via `BeanFactory.createBean(opcode, type)`
- Parse payload: `response.acceptData(Arrays.copyOfRange(data, 1, 15))` (excludes opcode and CRC)

### 4.3 Large Data Frame Format (File Transfer / Large Data Service)

**Frame Header** (0xBC = 188):
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
// Polynomial: 0xA001 (40961 decimal, reversed CRC-16-IBM)
// Initial value: 0xFFFF
int crc = 0xFFFF;
for (byte b : data) {
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
- **Chunk Size**: 1024 bytes (`executeNextSend()` uses `sequence * 1024`)
- **Sequence Number**: `short sequence` starting at 0, increments per chunk
- **Reassembly**: `LargeDataParser.parseBigLargeData()` buffers incomplete packets
- **End Condition**: When `packet.length - 6 == length` (full frame received)

**Large Data Service UUIDs**:
- Service: `de5bf728-d711-4e47-af26-65e3012a5dc7`
- TX: `de5bf729-d711-4e47-af26-65e3012a5dc7`
- RX: `de5bf72a-d711-4e47-af26-65e3012a5dc7`

### 4.4 Frame Distinction Rules

**How to Distinguish Frame Types**:

1. **Standard Command/Response** (16 bytes):
   - Length check: `data.length == 16`
   - CRC validation: `QCDataParser.checkCrc(data)` (CRC8)
   - Opcode in byte 0 (masked with ~0x80)
   - Used for: All standard commands and responses

2. **Large Data Frame** (Variable length, minimum 6 bytes):
   - Header check: `data[0] == 0xBC` (188)
   - Length in bytes 2-3 (little-endian)
   - CRC16 in bytes 4-5
   - Used for: File transfers, large data streams
   - Service UUID: `de5bf729-d711-4e47-af26-65e3012a5dc7` (RX characteristic)

3. **Special Cases**:
   - **FindDevice**: Opcode 0x50, payload `{0x55, 0xAA}` (not a header, just payload)

### 4.5 Checksum/CRC Validation

**Standard Commands (CRC8)**:
- **Validation**: `QCDataParser.checkCrc()` validates CRC before parsing
- **Calculation**: Sum of bytes 0-14, mod 256, stored in byte 15
- **Failure**: If CRC fails, frame is rejected (not parsed)

**Large Data (CRC16)**:
- **Polynomial**: 0xA001 (CRC-16-IBM reversed)
- **Initial Value**: 0xFFFF
- **Coverage**: Payload only (bytes 6+)
- **Validation**: Not explicitly validated in decode path (only calculated for send)

### 4.6 Fragmentation/Reassembly Rules

**Standard Commands**:
- **No Fragmentation**: Fixed 16-byte frames, no reassembly needed
- **Multi-packet Responses**: Handled at application layer via `acceptData()` return value
  - Returns `true` = more packets expected
  - Returns `false` = complete, dispatch callback

**Large Data**:
- **Fragmentation**: 1024-byte chunks for file transfer
- **Sequence**: Tracked per transfer session
- **Reassembly**: `LargeDataParser` buffers until `data.length - 6 == length`
- **End Marker**: Not explicit; determined by length field match

**Multi-packet History Responses**:
- **Packet Index**: First byte of payload (after opcode)
- **Total Packets**: Encoded in first packet (varies by command)
- **End Condition**: `packetIndex == totalPackets - 1` OR `packetIndex == 0xFF` (no data)

### 4.7 Encryption/Obfuscation/Compression

- **No Encryption**: Payloads appear unencrypted (plain bytes)
- **No Compression**: No compression algorithms detected
- **No Obfuscation**: No XOR, scrambling, or other transforms observed
- **No Session Keys**: No key exchange or rolling keys

### 4.8 Write Type and ACK Behavior

**Write WITH Response** (Default):
- `setWriteType(2)` - `WRITE_TYPE_DEFAULT`
- Device sends ACK via `onCharacteristicWrite()` callback
- Used for: All standard commands

**Write WITHOUT Response**:
- `setWriteType(1)` - `WRITE_TYPE_NO_RESPONSE`  
- No ACK expected
- Used for: High-frequency writes (not observed in standard commands)

**ACK/Sequence**:
- No explicit sequence numbers in standard protocol
- Device may resend if no ACK (not explicitly handled in code)
- Multi-packet responses use packet index (not sequence number)

## 5. Complete Opcode Catalogue (AUTHORITATIVE)

**Source**: `BeanFactory.createBean()` - definitive opcode mapping

### 5.1 Host → Device Commands (Request Opcodes)

| Opcode | Hex | Signed | Command Class | Response | Unsolicited | Description |
|--------|-----|--------|---------------|----------|-------------|-------------|
| 1 | 0x01 | 1 | SetTimeReq | SetTimeRsp | No | Set device time |
| 2 | 0x02 | 2 | (Camera) | CameraNotifyRsp | Yes | Camera remote control notification |
| 3 | 0x03 | 3 | (Battery Query) | BatteryRsp | No | Query battery level |
| 4 | 0x04 | 4 | BindAncsReq | (ACK) | No | Bind ANCS (Apple Notification Center) |
| 5 | 0x05 | 5 | (Palm Screen) | PalmScreenRsp | No | Palm screen gesture |
| 6 | 0x06 | 6 | DndReq | DndRsp | No | Do Not Disturb settings |
| 10 | 0x0A | 10 | TimeFormatReq | TimeFormatRsp | No | Time format (12/24h) |
| 12 | 0x0C | 12 | BpSettingReq | BpSettingRsp | No | Blood pressure settings |
| 13 | 0x0D | 13 | (BP Data) | BpDataRsp | No | Blood pressure data response |
| 17 | 0x11 | 17 | (Phone Notify) | PhoneNotifyRsp | Yes | Phone notification |
| 19 | 0x13 | 19 | ReadBandSportReq | ReadDetailSportDataRsp | No | Read band sport data |
| 20 | 0x14 | 20 | ReadPressureReq | ReadBlePressureRsp | No | Read pressure data |
| 21 | 0x15 | 21 | ReadHeartRateReq | ReadHeartRateRsp | No | Read heart rate data |
| 22 | 0x16 | 22 | (Heart Rate Setting) | HeartRateSettingRsp | No | Heart rate settings |
| 25 | 0x19 | 25 | (Degree Switch) | DegreeSwitchRsp | No | Temperature unit (°C/°F) |
| 26 | 0x1A | 26 | WeatherForecastReq | WeatherForecastRsp | No | Weather forecast |
| 29 | 0x1D | 29 | (Music Command) | MusicCommandRsp | Yes | Music control |
| 30 | 0x1E | 30 | (Real-time HR) | RealTimeHeartRateRsp | Yes | Real-time heart rate stream |
| 31 | 0x1F | 31 | (Display Time) | DisplayTimeRsp | No | Display time format |
| 33 | 0x21 | 33 | TargetSettingReq | TargetSettingRsp | No | Step/calorie target settings |
| 34 | 0x22 | 34 | (Find Phone) | FindPhoneRsp | Yes | Find phone (ring device) |
| 35 | 0x23 | 35 | SetAlarmReq | ReadAlarmRsp | No | Set alarm |
| 37 | 0x25 | 37 | SetSitLongReq | ReadSitLongRsp | No | Set long sit reminder |
| 38 | 0x26 | 38 | (Read Sit Long) | ReadSitLongRsp | No | Read long sit settings |
| 39 | 0x27 | 39 | SetDrinkAlarmReq | (ACK) | No | Set drink reminder |
| 40 | 0x28 | 40 | (Read Alarm) | ReadAlarmRsp | No | Read alarm settings |
| 44 | 0x2C | 44 | (Blood Oxygen Setting) | BloodOxygenSettingRsp | No | Blood oxygen settings |
| 47 | 0x2F | 47 | (Package Length) | PackageLengthRsp | No | Query MTU/packet length |
| 50 | 0x32 | 50 | (Device Avatar) | DeviceAvatarRsp | No | Device avatar/image |
| 54 | 0x36 | 54 | (Pressure Setting) | PressureSettingRsp | No | Pressure detection settings |
| 55 | 0x37 | 55 | (Pressure Data) | PressureRsp | Yes | Pressure data notification |
| 56 | 0x38 | 56 | (HRV Setting) | HRVSettingRsp | No | HRV settings |
| 57 | 0x39 | 57 | (HRV Data) | HRVRsp | Yes | HRV data notification |
| 58 | 0x3A | 58 | SugarLipidsSettingReq | BloodSugarLipidsSettingRsp | No | Blood sugar/lipids settings |
| 59 | 0x3B | 59 | TouchControlReq | TouchControlResp | No | Touch control settings |
| 60 | 0x3C | 60 | DeviceSupportReq | DeviceSupportFunctionRsp | No | Query device capabilities |
| 67 | 0x43 | 67 | (Read Detail Sport) | ReadDetailSportDataRsp | No | Read detailed sport data |
| 68 | 0x44 | 68 | ReadSleepDetailsReq | ReadSleepDetailsRsp | No | Read sleep details |
| 72 | 0x48 | 72 | (Today Sport) | TodaySportDataRsp | No | Today's sport data |
| 80 | 0x50 | 80 | FindDeviceReq | FindPhoneRsp | No | Find device (payload: {0x55, 0xAA}) |
| 82 | 0x52 | 82 | MuslimRemindReq | MuslimRemindRsp | No | Muslim prayer reminder |
| 97 | 0x61 | 97 | (Read Message Push) | ReadMessagePushRsp | No | Read message push settings |
| 105 | 0x69 | 105 | StartHeartRateReq | StartHeartRateRsp | No | Start heart rate measurement |
| 114 | 0x72 | 114 | (Simple Status) | SimpleStatusRsp | No | Simple status response |
| 115 | 0x73 | 115 | (Device Notify) | DeviceNotifyRsp | Yes | Device notification (catch-all) |
| 119 | 0x77 | 119 | (App Sport) | AppSportRsp | Yes | App sport data |
| 120 | 0x78 | 120 | (Device Notify) | DeviceNotifyRsp | Yes | Device notification |
| 122 | 0x7A | 122 | (Muslim) | MuslimRsp | No | Muslim data |
| 123 | 0x7B | 123 | MuslimTargetReq | MuslimTargetRsp | No | Muslim target/goal |
| 126 | 0x7E | 126 | PhoneStillTime | (ACK) | No | Phone still time |
| -95 | 0xA1 | -95 | AppRevisionReq | AppRevisionResp | No | App revision query |
| -54 | 0xCA | -54 | TestReqClose | (ACK) | No | Test close command |

**Note**: Opcodes with signed negative values are used as-is (e.g., -95 = 0xA1, -54 = 0xCA)

### 5.2 Device → Host Responses/Notifications

**Response Routing**:
- **Request Responses**: Same opcode as request, routed via `LocalWriteRequestConcurrentHashMap`
- **Unsolicited Notifications**: Registered via `addNotifyListener(opcode, callback)`
- **Default Handler**: Opcode 115 (0x73) routes to `DeviceNotifyRsp` (catch-all)

**Multi-packet Response Pattern**:
- First packet: Header/metadata (packet index 0x00 or 0xF0)
- Subsequent packets: Data records (packet index 0x01, 0x02, ...)
- Last packet: Identified by packet index comparison or 0xFF marker

### 5.3 Per-Opcode Decode Schemas

#### Opcode 0x15 (21) - ReadHeartRateReq → ReadHeartRateRsp

**Request Payload**:
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0      | 4    | Timestamp  | uint32 | UTC timestamp (seconds)
```

**Response Payload** (Multi-packet):
- **Packet 0x00** (Header):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0      | 1    | Marker     | uint8  | 0x00 (header marker)
  1      | 1    | Count      | uint8  | Total record count
  2      | 1    | Range      | uint8  | Time range (default: 5 = 5-minute intervals)
  ```
  
- **Packet 0x01** (Timestamp + First Data):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0      | 1    | Marker     | uint8  | 0x01 (timestamp marker)
  1-4    | 4    | UTC Time   | uint32 | UTC timestamp (seconds, timezone-adjusted)
  5+     | N    | Data Start | bytes  | First data chunk
  ```
  
- **Packets 0x02-0xFE** (Data Records):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0      | 1    | Index      | uint8  | Packet index (0x02, 0x03, ..., count-1)
  1-13   | 13   | Record     | bytes  | Heart rate record (13 bytes per record)
  ```
  
- **Record Structure** (13 bytes per record):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0-3    | 4    | Timestamp  | uint32 | Record timestamp (seconds)
  4      | 1    | Heart Rate | uint8  | Heart rate value (bpm)
  5-12   | 8    | Reserved   | bytes  | Unknown/reserved
  ```
  
- **End Condition**: `packetIndex == count - 1` OR `packetIndex == 0xFF` (no data)
- **Sample Rate**: 5-minute intervals (288 samples/day)
- **Units**: Heart rate in bpm (raw value, no scaling)

#### Opcode 0x44 (68) - ReadSleepDetailsReq → ReadSleepDetailsRsp

**Request Payload**: Sleep date/time (format not shown in code)

**Response Payload** (Multi-packet):
- **Packet 0xF0** (Init):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0      | 1    | Marker     | uint8  | 0xF0 (init marker)
  ```
  
- **Data Packets**:
  ```
  Offset | Size | Field          | Type   | Description
  -------|------|----------------|--------|-------------
  0      | 1    | Year (BCD)     | uint8  | Year (BCD, +2000)
  1      | 1    | Month (BCD)    | uint8  | Month (BCD)
  2      | 1    | Day (BCD)      | uint8  | Day (BCD)
  3      | 1    | Time Index     | uint8  | Time index (5-minute intervals)
  4      | 1    | Packet Index   | uint8  | Current packet index
  5      | 1    | Total Packets  | uint8  | Total packets - 1
  6-13   | 8    | Sleep Qualities| uint8[8]| Sleep quality per 5-min interval (0-255)
  ```
  
- **End Condition**: `packetIndex == totalPackets - 1`
- **Units**: Sleep quality 0-255 (higher = better sleep)

#### Opcode 0x14 (20) - ReadPressureReq → ReadBlePressureRsp

**Response Payload** (Multi-packet, 50 records per batch):
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0-3    | 4    | Timestamp  | uint32 | UTC timestamp (seconds, timezone-adjusted)
4      | 1    | DBP        | uint8  | Diastolic BP (mmHg)
5      | 1    | SBP        | uint8  | Systolic BP (mmHg)
```

- **Batch Size**: 50 records per response
- **End Marker**: `0xFFFFFFFF` timestamp = no more data
- **Units**: BP in mmHg (raw values)

#### Opcode 0x13 (19) - ReadBandSportReq → ReadDetailSportDataRsp

**Response Payload** (Multi-packet):
- **Packet 0xF0** (Init):
  ```
  Offset | Size | Field      | Type   | Description
  -------|------|------------|--------|-------------
  0      | 1    | Marker     | uint8  | 0xF0
  2      | 1    | Flag       | uint8  | 1 = calorie scaled by 10
  ```
  
- **Data Packets**:
  ```
  Offset | Size | Field          | Type   | Description
  -------|------|----------------|--------|-------------
  0      | 1    | Year (BCD)     | uint8  | Year (BCD, +2000)
  1      | 1    | Month (BCD)    | uint8  | Month (BCD)
  2      | 1    | Day (BCD)      | uint8  | Day (BCD)
  3      | 1    | Time Index     | uint8  | Time index
  4      | 1    | Packet Index   | uint8  | Current index
  5      | 1    | Total Packets  | uint8  | Total - 1
  6-7    | 2    | Calorie        | uint16 | Calories (LE, scaled by 10 if flag set)
  8-9    | 2    | Steps          | uint16 | Steps (LE)
  10-11  | 2    | Distance       | uint16 | Distance (LE, units unknown)
  ```
  
- **Units**: 
  - Calories: kcal (scaled by 10 if flag set)
  - Steps: count
  - Distance: units unknown (likely meters * 10)

#### Opcode 0x03 (3) - Battery Query → BatteryRsp

**Response Payload**:
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0      | 1    | Battery    | uint8  | Battery level (0-100%)
1      | 1    | Charging   | uint8  | 1 = charging, 0 = not charging
```

#### Opcode 0x3C (60) - DeviceSupportReq → DeviceSupportFunctionRsp

**Response Payload** (Feature Bitmap):
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0      | 1    | Reserved   | uint8  | Unknown
1      | 1    | Features1  | uint8  | Bit flags (bit 0-7)
2      | 1    | Features2  | uint8  | Bit flags (bit 8-15)
3      | 1    | Features3  | uint8  | Bit flags (bit 16-23)
4      | 1    | Features4  | uint8  | Bit flags (bit 24-31)
5      | 1    | Features5  | uint8  | Bit flags (bit 32-39)
6      | 1    | Features6  | uint8  | Bit flags (bit 40-47)
7      | 1    | Features7  | uint8  | Bit flags (bit 48-55)
8      | 1    | Reserved   | uint8  | Unknown
9      | 1    | Features9  | uint8  | Bit flags (bit 64-71)
```

**Feature Bits** (from `DeviceSupportFunctionRsp.acceptData()`):
- Byte 1: Features c, d, e, f, H, g (bits 0,1,2,3,6,7)
- Byte 2: Features h, i, j, k, l, m, n (bits 0-6)
- Byte 3: Features y, w, x, z, A, I (bits 0,2,3,4,5,7)
- Byte 4: Features B, D, E, F (bits 3,4,5,7)
- Byte 5: Feature C (bit 0), plus extended features if C != 0
- Byte 6: Features M, G, J, K, L (bits 3,4,5,6,7)
- Byte 7: Features O, P, Q, R, S, N, T (bits 0-6)
- Byte 9: Feature U (bit 1)

#### Opcode 0x2F (47) - PackageLengthRsp

**Response Payload**:
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0      | 1    | MTU        | uint8  | Device MTU capability
```

- Used to set `JPackageManager.setLength(Math.max(mtu, 20))`
- Minimum MTU: 20 bytes

#### Opcode 0x1E (30) - RealTimeHeartRateRsp (Unsolicited)

**Notification Payload**:
```
Offset | Size | Field      | Type   | Description
-------|------|------------|--------|-------------
0      | 1    | Heart Rate | uint8  | Current heart rate (bpm)
```

- **Stream**: Continuous notifications while measurement active
- **Trigger**: Sent after `StartHeartRateReq` (0x69)
- **Stop**: `StopHeartRateReq` command

### 5.3 Opcode Details

#### ReadHeartRateReq (0x15)
- **Payload**: 4 bytes (UTC timestamp as int)
- **Response**: Multi-packet
  - Packet 0x00: `[count(1), range(1)]` - allocates buffer
  - Packet 0x01: `[timestamp(4), data...]` - UTC time + first data
  - Packets 0x02+: `[index(1), data(13)]` - sequential data
  - Each record: 13 bytes (timestamp + heart rate value)
  - Sample rate: 5-minute intervals (288 samples/day)

#### ReadSleepDetailsReq (0x44)
- **Payload**: Sleep date/time
- **Response**: Sleep stage data

#### ReadBandSportReq (0x13)
- **Payload**: Sport date range
- **Response**: Sport activity data

#### SetTimeReq (0x01)
- **Payload**: Current time (UTC timestamp)
- **Response**: ACK

### 5.4 Error Codes
- **Status Field**: `BaseRspCmd.getStatus()` returns error code
- **No Explicit Error Codes Found**: Error handling via status field, but specific codes not enumerated

## 6. Command Sequencing & Initialization

### 6.1 Required Initialization Sequence

**After Connection Established** (`bleServiceDiscovered()` callback):

1. **Enable Notifications** (500ms delay):
   - `EnableNotifyRequest` on UUID `6e40fff0-b5a3-f393-e0a9-e50e24dcca9e` / `6e400003-b5a3-f393-e0a9-e50e24dcca9e`
   - Sets CCCD to 0x0001 (enable notifications)
   - Required before any data exchange

2. **Common Commands** (`runCommonCmd()`, 500ms delay):
   - **Battery Query** (Opcode 0x03): Query battery level
   - **Device Support Query** (Opcode 0x3C): Query device capabilities
   - **Package Length Query** (Opcode 0x2F): Query MTU capability
   - **App Revision Query** (Opcode 0xA1): Query app/firmware revision

3. **Time Sync** (if needed):
   - **SetTimeReq** (Opcode 0x01): Sync device time with phone
   - Not mandatory, but recommended for accurate timestamps

4. **User Profile Sync** (if needed):
   - **TimeFormatReq** (Opcode 0x0A): Set time format, units, user profile
   - Includes: gender, age, height, weight, heart rate zones

### 6.2 Command Sequencing Constraints

**Rate Limiting**:
- **Inter-command Delay**: Not explicitly enforced, but uses BLE stack defaults
- **Lock Mechanism**: `BleOperateManager.waitUntilActionResponse()` waits for response before next command
- **Timeout**: Lock timeout prevents infinite wait (not explicitly shown)

**Required Precedence**:
- **Enable Notifications** MUST precede all data commands
- **Device Support Query** should precede feature-specific commands
- **Time Sync** should precede history downloads (for timestamp accuracy)

**History Download Sequence**:
1. **Prepare Sync** (if required by device model - not explicitly shown)
2. **Select Data Type** (via opcode: 0x15=HR, 0x14=BP, 0x13=Sport, 0x44=Sleep)
3. **Send Query** with date/time range
4. **Receive Multi-packet Response** (handle `acceptData()` return values)
5. **Complete** when `acceptData()` returns `false`

### 6.3 Error Semantics

**Status/Error Codes**:
- **No Explicit Error Codes**: Responses don't include explicit error status bytes
- **Error Indication**: 
  - `0xFF` marker = no data available
  - `0xFFFFFFFF` timestamp = end of data stream
  - Empty response = command not supported or failed

**Device-side Error Conditions**:
- **"Busy"**: Not explicitly handled; may drop commands if processing previous request
- **"Invalid Param"**: Not explicitly validated; device may ignore invalid commands
- **"No Data"**: Indicated by `0xFF` packet marker or `0xFFFFFFFF` timestamp
- **"Auth Required"**: Not observed; bonding appears optional

**Recovery Actions**:
- **Retry**: Not explicitly implemented; app may retry on timeout
- **Reconnect**: Auto-reconnect on disconnect (up to 10 attempts)
- **Re-enable CCCD**: Not explicitly handled; assumes CCCD remains enabled
- **Reset Transfer State**: `acceptData()` state reset on new query

**Timeout Behavior**:
- **Lock Timeout**: `BleOperateManager` has lock mechanism with timeout
- **Reconnect Timeout**: 40 seconds for service discovery (`f26094u` runnable)
- **No Response**: Device may drop connection if no response received

## 7. Data Models & Normalization Rules

### 6.1 Timestamp Format
- **Format**: Unix timestamp (seconds since epoch)
- **Storage**: `int` (32-bit) for timestamps
- **Timezone Handling**: 
  - UTC timestamps stored
  - Timezone offset applied: `timestamp -= (timezoneOffset * 3600)`
  - `getTimeZone()` returns offset in hours

### 6.2 Units & Scaling

#### Heart Rate
- **Unit**: bpm (beats per minute)
- **Storage**: `int`
- **Scaling**: Raw value (no scaling observed)
- **Sample Rate**: 5-minute intervals (288 samples/day)

#### Blood Pressure
- **Unit**: mmHg
- **Storage**: `int` (SBP and DBP separate)
- **Scaling**: Raw value

#### Blood Oxygen (SpO2)
- **Unit**: Percentage (%)
- **Storage**: `int` (0-100)

#### Temperature
- **Unit**: Celsius (°C)
- **Storage**: `float` or `int` (scaled by 10 or 100)
- **Scaling**: Check `IntervalTemperatureEntity` - appears to use 2-byte values

#### Steps
- **Unit**: Count
- **Storage**: `int`

#### Calories
- **Unit**: kcal
- **Storage**: `int`

### 6.3 Data Validity Rules
- **Out-of-range Filtering**: Not explicitly implemented in parsing code
- **Missing Timestamps**: Handled via null checks
- **Deduplication**: Primary keys use `(mac, timestamp)` tuple

### 6.4 Database Schema

#### AppHeartEntity
```sql
CREATE TABLE app_heart (
    mac TEXT PRIMARY KEY,
    timestamp INTEGER PRIMARY KEY,
    date_str TEXT,
    heart INTEGER,
    isUploadServer BOOLEAN,
    upload_server_unit_time INTEGER
)
```

#### BloodPressureEntity
```sql
CREATE TABLE blood_pressure (
    device_address TEXT PRIMARY KEY,
    unix_time INTEGER PRIMARY KEY,
    sbp INTEGER,
    dbp INTEGER,
    sync BOOLEAN,
    last_sync_time INTEGER
)
```

**Primary Keys**: `(mac/device_address, timestamp/unix_time)` - prevents duplicates

## 7. History Download Protocol

### 7.1 Request Parameters
- **Last Sync ID**: Not explicitly used; uses timestamp-based queries
- **Start/End Time**: UTC timestamps passed to read commands
- **Page Size**: Not paginated at protocol level; device returns all available data
- **Record Count**: Device reports count in first packet

### 7.2 Device Response Format
- **Multi-packet Stream**: 
  - First packet: Header with total count
  - Subsequent packets: Data records
  - Last packet: Identified by packet index
- **Batching**: Device sends in MTU-sized chunks
- **End Marker**: Packet index == total count - 1

### 7.3 Sync State Persistence
- **Last Sync Time**: Stored in entities (`lastSyncTime` field)
- **Per Device**: Tracked via MAC address
- **Upload Status**: `isUploadServer` flag tracks cloud sync

## 8. Live Notification Protocol

### 8.1 Notification Characteristics
- **RX Characteristic**: `0xFD04` (64772) - main notifications
- **Large Data RX**: `de5bf72a-d711-4e47-af26-65e3012a5dc7` - file transfer notifications

### 8.2 Subscription Sequence
1. Connect to device
2. Discover services (`processServices()`)
3. Resolve characteristics
4. Enable CCCD: `setCharacteristicNotification(gatt, characteristic, true)`
5. Write CCCD descriptor: `descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)`
6. Wait for CCCD write confirmation
7. Start receiving notifications

### 8.3 Live Measurement Opcodes
- **Real-time Heart Rate**: `StartHeartRateReq` (0x69) triggers live streaming
- **Device Notifications**: `DeviceNotifyRsp` - various device events
- **Sport Notifications**: `DeviceSportNotifyListener` - live sport data
- **Camera Notifications**: `CameraNotifyRsp` - camera remote control

### 8.4 Stop Sequence
- **Stop Heart Rate**: `StopHeartRateReq` command
- **Disable Notifications**: Set CCCD to 0x0000 (not implemented in code, uses disconnect)

## 9. State Machine & Ordering Constraints

### 9.1 Required Flow
1. **Connect**: `BluetoothGatt.connectGatt()`
2. **Discover Services**: `gatt.discoverServices()`
3. **Resolve Characteristics**: `processServices()` finds TX/RX characteristics
4. **Enable CCCD**: `enableCccd()` writes notification descriptor
5. **Optional MTU**: `requestMtu()` if needed (not explicitly called)
6. **Optional Priority**: `requestConnectionPriority()` (not explicitly called)
7. **Handshake**: No explicit handshake observed
8. **Data Operations**: Commands can be sent

### 9.2 Mandatory Steps
- **Service Discovery**: Required
- **CCCD Enable**: Required for receiving notifications
- **No Auth/Key Exchange**: No authentication protocol observed
- **No Time Sync Required**: Time sync is a command, not mandatory

### 9.3 Timeout Values
- **Lock Timeout**: `BleOperateManager` has timeout mechanism
- **CCCD Timeout**: Not explicitly set (uses BLE stack defaults)
- **Connection Timeout**: Not explicitly set

### 9.4 Recovery Paths
- **Disconnect/Reconnect**: `GattConnParams.reconnectTimes()` controls retries
- **Re-enable CCCD**: Not explicitly implemented; reconnection handles it
- **Error Recovery**: Status checks in response handlers

## 10. Security & Permissions

### 10.1 Android Permissions

#### Android 12+ (API 31+)
- `BLUETOOTH_SCAN`: Required for scanning
- `BLUETOOTH_CONNECT`: Required for connection
- `BLUETOOTH_ADVERTISE`: Required for advertising (if needed)

#### Legacy (API < 31)
- `BLUETOOTH`: General Bluetooth access
- `BLUETOOTH_ADMIN`: Admin functions
- `ACCESS_COARSE_LOCATION`: Required for BLE scanning (Android < 12)
- `ACCESS_FINE_LOCATION`: Required for BLE scanning

### 10.2 Protocol-Level Security
- **No Encryption**: Payloads appear unencrypted
- **No Authentication**: No key exchange or token authentication
- **No Hardcoded Keys**: No encryption keys found in code

### 10.3 Data Encryption
- **Not Encrypted**: Data appears in plaintext
- **No Key Material**: No key derivation or storage found

## 11. Persistence Layer

### 11.1 Database Schema (Room Database)

**Tables**:
- `app_heart` - Heart rate data
- `blood_pressure` - Blood pressure data
- `blood_oxygen` - SpO2 data
- `app_temperature` - Temperature data
- `blood_sugar` - Blood sugar data
- `sleep_detail` - Sleep data
- `sport_data` - Sport/activity data
- `device_setting` - Device settings
- `contacts` - Contact sync
- `quran` - Quran data
- `anla_name` - Anla names
- `menstruation` - Menstruation tracking

### 11.2 Migration Strategy
- **Room Migrations**: Not visible in extracted code
- **Versioning**: Room database versioning (not shown)

### 11.3 Raw Payload Storage
- **Not Stored**: Only parsed/decoded data stored
- **No Raw Bytes**: No raw packet storage observed

## 12. UI/Export Requirements

### 12.1 Data Views
- **Decoded View**: Human-readable units (bpm, mmHg, %, °C)
- **Raw Bytes View**: Not implemented in UI
- **Export**: Not explicitly implemented (may be in UI code not shown)

### 12.2 Export Formats
- **CSV/JSON**: Not found in extracted code
- **Session Logs**: Not implemented

## 13. Validation Artifacts

### 13.1 Test Vectors
- **Not Found**: No golden test vectors in code
- **Logging**: `XLog` used for debugging, but no test data

### 13.2 Regression Tests
- **Not Found**: No unit tests in extracted code

## 14. Raw Data Exposure & Validation

### 14.1 Raw Data Definition

**Three Levels of "Raw" Data**:

1. **Raw BLE Notifications** (Level 1):
   - Bytes as received from `onCharacteristicChanged()`
   - Format: 16-byte frame with opcode + payload + CRC8
   - Location: `BleBaseControl.onCharacteristicChanged()` → `bleCharacteristicChanged()`
   - Logged: `LogToFile.getInstance().wtfNotify(hexString)`

2. **Decoded Protocol Frames** (Level 2):
   - After CRC validation and opcode extraction
   - Format: Opcode (byte 0) + Payload (bytes 1-14) + CRC (byte 15)
   - Location: `QCDataParser.parserAndDispatchNotifyData()` / `parserAndDispatchReqData()`
   - Payload extraction: `Arrays.copyOfRange(data, 1, data.length - 1)`

3. **Per-Record Raw Sensor Bytes** (Level 3):
   - Individual records before scaling/interpretation
   - Format: Command-specific (see Section 5.3)
   - Location: `BaseRspCmd.acceptData()` → parsed into entity objects
   - Example: Heart rate record = 13 bytes (timestamp + HR + reserved)

### 14.2 Raw Data Access Points

**BLE Notification Level**:
```java
// BleBaseControl.java:177
public void onCharacteristicChanged(BluetoothGatt gatt, 
                                    BluetoothGattCharacteristic characteristic) {
    byte[] rawBytes = characteristic.getValue();
    // Log: DataTransferUtils.getHexString(rawBytes)
    // LogToFile: wtfNotify(hexString)
}
```

**Protocol Frame Level**:
```java
// QCDataParser.java:26
public static boolean parserAndDispatchNotifyData(SparseArray<ICommandResponse> sparseArray, 
                                                   byte[] bArr) {
    int opcode = bArr[0] & (~0x80);
    byte[] payload = Arrays.copyOfRange(bArr, 1, bArr.length - 1);
    // Payload is raw protocol payload (14 bytes max)
}
```

**Record Level**:
```java
// Example: ReadHeartRateRsp.acceptData()
public boolean acceptData(byte[] bArr) {
    // bArr is payload (14 bytes) without opcode/CRC
    // Parse into 13-byte records
    byte[] record = new byte[13];
    System.arraycopy(bArr, 1, record, 0, 13);
}
```

### 14.3 Ground Truth Validation Artifacts

**Required Captures** (for protocol validation):

1. **Live Measurement Stream**:
   - Command: `StartHeartRateReq` (0x69)
   - Response: `RealTimeHeartRateRsp` (0x1E) notifications
   - Expected: Continuous 16-byte frames with opcode 0x1E, payload[0] = HR value

2. **History Download - Heart Rate**:
   - Command: `ReadHeartRateReq` (0x15) with timestamp
   - Response: Multi-packet (0x00 header, 0x01 timestamp, 0x02+ data)
   - Expected: Packet 0x00 = {0x00, count, range}, Packet 0x01 = {0x01, timestamp[4], data...}

3. **History Download - Sleep**:
   - Command: `ReadSleepDetailsReq` (0x44)
   - Response: Multi-packet (0xF0 init, data packets)
   - Expected: Packet 0xF0 = {0xF0, ...}, Data packets = {year, month, day, index, ...}

4. **History Download - Blood Pressure**:
   - Command: `ReadPressureReq` (0x14)
   - Response: Multi-packet (50 records per batch)
   - Expected: Each packet = {timestamp[4], DBP, SBP} × 50 records

5. **History Download - Sport Data**:
   - Command: `ReadBandSportReq` (0x13)
   - Response: Multi-packet (0xF0 init, data packets)
   - Expected: Packet 0xF0 = {0xF0, ..., flag}, Data packets = {year, month, day, ...}

6. **Large Data Transfer** (if applicable):
   - Command: File transfer via large data service
   - Response: 0xBC header frames with CRC16
   - Expected: Header = {0xBC, cmd, length[2], crc16[2], payload...}

**Expected Decoded Values** (for schema validation):

- **Heart Rate**: Raw bpm (0-255), typically 60-100 for resting
- **Blood Pressure**: Raw mmHg (SBP: 90-180, DBP: 60-120)
- **Steps**: Raw count (0-65535 per interval)
- **Calories**: Raw kcal (may be scaled by 10)
- **Sleep Quality**: 0-255 (higher = better)
- **Timestamps**: UTC seconds (Unix epoch), timezone-adjusted

**Capture Format**:
- **Preferred**: pcapng (Wireshark) with BLE dissector
- **Alternative**: nRF Sniffer logs
- **Android**: HCI snoop log (`/data/misc/bluetooth/logs/btsnoop_hci.log`)
- **Log Format**: Hex strings (as logged by `DataTransferUtils.getHexString()`)

### 14.4 Validation Checklist

**For Each Capture**:
- [ ] Frame length = 16 bytes (standard) or variable (large data)
- [ ] CRC8 validation passes (standard) or CRC16 (large data)
- [ ] Opcode extraction: `opcode = data[0] & (~0x80)`
- [ ] Payload length = 14 bytes (standard) or variable (large data)
- [ ] Multi-packet reassembly: Packet index matches expected sequence
- [ ] End condition: `acceptData()` returns `false` on last packet
- [ ] Decoded values: Within expected ranges (HR: 40-200, BP: 60-200, etc.)
- [ ] Timestamps: Valid Unix epoch, timezone-adjusted correctly

### 14.5 Key Code References

**RX Notification Parser/Demux** (Most Critical):
- **File**: `sources/com/oudmon/ble/base/bluetooth/QCBluetoothCallbackReceiver.java`
- **Method**: `onCharacteristicChange()` (line 18)
- **Flow**: 
  1. Check length == 16 bytes
  2. Validate CRC: `QCDataParser.checkCrc()`
  3. Try request response: `QCDataParser.parserAndDispatchReqData()`
  4. Fallback to notification: `QCDataParser.parserAndDispatchNotifyData()`

**Opcode Factory**:
- **File**: `sources/com/oudmon/ble/base/bluetooth/BeanFactory.java`
- **Method**: `createBean(int opcode, int type)` (line 50)
- **Purpose**: Creates response parser object for each opcode

**Frame Format**:
- **File**: `sources/com/oudmon/ble/base/bluetooth/QCDataParser.java`
- **CRC Check**: `checkCrc()` (line 18) - simple sum mod 256
- **Opcode Extract**: `opcode = data[0] & (~Constants.f26289m)` where `f26289m = 128 (0x80)`

## 15. Additional Notes

### 14.1 Packet Header Discrepancy
- **User Mentioned**: 0xAA header
- **Code Shows**: 0xBC (188) header for large data frames
- **Standard Commands**: No header byte, just opcode + payload + CRC

### 14.2 Multiple Protocol Layers
- **Standard Commands**: Simple opcode + payload + CRC (16 bytes total)
- **Large Data**: 0xBC header + command + length + CRC16 + payload
- **File Transfer**: Uses large data protocol

### 14.3 Device Models Supported
- R01, R02, R03, R04, R05, R06, R11 (Ring models)
- VK-5098, MERLIN, Hello Ring, RING1, boAtring (Ring variants)
- Y25, H59 (Band models)

---

**Note**: This specification is extracted from decompiled Android APK code. Some implementation details may vary in actual device firmware. The 0xAA header mentioned by the user may refer to a different protocol layer or device variant not visible in this codebase.
