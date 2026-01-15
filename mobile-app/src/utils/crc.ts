/**
 * CRC8 Calculation
 * Simple sum of bytes 0-14, modulo 256
 * Based on BLE_PROTOCOL_SPECIFICATION.md
 */

import { OPCODE_MASK } from '../types/ble';

/**
 * Calculate CRC8 checksum for BLE frame
 * @param data - Frame data (bytes 0-14, excluding CRC)
 * @returns CRC8 value (byte)
 */
export function calculateCRC8(data: number[]): number {
  let crc = 0;
  for (let i = 0; i < data.length && i < 15; i++) {
    crc = (crc + (data[i] & 0xff)) & 0xff;
  }
  return crc;
}

/**
 * Validate CRC8 checksum for received frame
 * @param frame - Complete 16-byte frame
 * @returns true if CRC is valid
 */
export function validateCRC8(frame: number[]): boolean {
  if (frame.length !== 16) {
    return false;
  }
  
  const data = frame.slice(0, 15);
  const receivedCRC = frame[15];
  const calculatedCRC = calculateCRC8(data);
  
  return receivedCRC === calculatedCRC;
}

/**
 * Build BLE frame with CRC
 * @param opcode - Command opcode
 * @param payload - Payload data (0-14 bytes)
 * @returns Complete 16-byte frame
 */
export function buildFrame(opcode: number, payload: number[] = []): number[] {
  if (payload.length > 14) {
    throw new Error('Payload too large (max 14 bytes)');
  }
  
  const frame = new Array(16).fill(0);
  frame[0] = opcode & OPCODE_MASK; // Clear bit 7
  frame[0] |= 0x80; // Set bit 7 for request (device may use this flag)
  
  // Copy payload
  for (let i = 0; i < payload.length && i < 14; i++) {
    frame[i + 1] = payload[i] & 0xff;
  }
  
  // Note: Bit 7 (0x80) is NOT set for requests - it's only set in responses
  // The opcode is stored as-is (with bit 7 cleared)
  frame[0] = opcode & OPCODE_MASK;
  
  // Calculate and set CRC
  const crc = calculateCRC8(frame.slice(0, 15));
  frame[15] = crc;
  
  return frame;
}

/**
 * Extract opcode from received frame
 * @param frame - Received frame
 * @returns Opcode (with bit 7 cleared)
 */
export function extractOpcode(frame: number[]): number {
  if (frame.length === 0) {
    return 0;
  }
  return frame[0] & OPCODE_MASK;
}
