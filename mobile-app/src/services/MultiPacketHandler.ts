/**
 * Multi-Packet Handler
 * Handles accumulation of multi-packet responses
 * Based on BLE_PROTOCOL_SPECIFICATION.md
 */

export interface PacketBuffer {
  opcode: number;
  packets: Map<number, number[]>; // packetIndex -> payload
  headerPacket?: number[];
  totalPackets?: number;
  totalRecords?: number;
  isComplete: boolean;
}

class MultiPacketHandler {
  private buffers: Map<number, PacketBuffer> = new Map();

  /**
   * Process incoming packet and determine if more packets are expected
   * @param opcode - Response opcode
   * @param frame - Complete 16-byte frame
   * @returns true if more packets expected, false if complete
   */
  processPacket(opcode: number, frame: number[]): boolean {
    if (frame.length !== 16) {
      return false;
    }

    // Extract payload (bytes 1-14, excluding opcode and CRC)
    const payload = frame.slice(1, 15);
    const packetMarker = payload[0];

    // Get or create buffer for this opcode
    let buffer = this.buffers.get(opcode);
    if (!buffer) {
      buffer = {
        opcode,
        packets: new Map(),
        isComplete: false,
      };
      this.buffers.set(opcode, buffer);
    }

    // Handle different packet types based on marker
    if (packetMarker === 0x00) {
      // Header packet (Heart Rate, HRV, Pressure)
      buffer.headerPacket = payload;
      buffer.totalRecords = payload[1];
      buffer.totalPackets = Math.ceil((buffer.totalRecords * 13) / 13) + 1; // Approximate
      buffer.packets.set(0, payload);
    } else if (packetMarker === 0x01) {
      // Timestamp/Date packet
      buffer.packets.set(1, payload);
    } else if (packetMarker === 0xF0) {
      // Init packet (Sleep, Sport)
      buffer.headerPacket = payload;
      buffer.packets.set(0xF0, payload);
    } else if (packetMarker >= 0x02 && packetMarker <= 0xFE) {
      // Data packet
      const packetIndex = packetMarker;
      buffer.packets.set(packetIndex, payload);

      // Check if this is the last packet
      if (buffer.headerPacket) {
        const header = buffer.headerPacket;
        if (header[0] === 0x00) {
          // Standard pattern: check if packetIndex == totalRecords - 1
          const totalRecords = header[1];
          if (packetIndex >= totalRecords - 1) {
            buffer.isComplete = true;
            return false;
          }
        } else if (header[0] === 0xF0) {
          // Sleep/Sport pattern: check packet[5] (totalPackets - 1)
          const totalPacketsMinusOne = payload[5];
          if (packetIndex >= totalPacketsMinusOne) {
            buffer.isComplete = true;
            return false;
          }
        }
      }
    } else if (packetMarker === 0xFF) {
      // End marker (no data)
      buffer.isComplete = true;
      return false;
    }

    // Check for Blood Pressure end marker (timestamp 0xFFFFFFFF)
    if (opcode === 0x14 && payload.length >= 4) {
      const timestamp = (payload[0] | (payload[1] << 8) | (payload[2] << 16) | (payload[3] << 24)) >>> 0;
      if (timestamp === 0xFFFFFFFF) {
        buffer.isComplete = true;
        return false;
      }
    }

    return true; // More packets expected
  }

  /**
   * Get complete data for an opcode
   */
  getCompleteData(opcode: number): PacketBuffer | null {
    const buffer = this.buffers.get(opcode);
    if (buffer && buffer.isComplete) {
      return buffer;
    }
    return null;
  }

  /**
   * Clear buffer for an opcode
   */
  clearBuffer(opcode: number): void {
    this.buffers.delete(opcode);
  }

  /**
   * Get all packets in order
   */
  getOrderedPackets(opcode: number): number[][] {
    const buffer = this.buffers.get(opcode);
    if (!buffer) return [];

    const packets: number[][] = [];
    const indices = Array.from(buffer.packets.keys()).sort((a, b) => a - b);
    
    for (const index of indices) {
      const packet = buffer.packets.get(index);
      if (packet) {
        packets.push(packet);
      }
    }

    return packets;
  }
}

export const multiPacketHandler = new MultiPacketHandler();
