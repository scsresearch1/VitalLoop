/**
 * Logger Utility
 * Helps debug BLE communication and data parsing
 */

const DEBUG = __DEV__; // Enable in development

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(`[VitalLoop] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.warn(`[VitalLoop] ⚠️ ${message}`, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[VitalLoop] ❌ ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(`[VitalLoop] 🔍 ${message}`, ...args);
    }
  },

  logFrame: (direction: 'TX' | 'RX', frame: number[]) => {
    if (DEBUG) {
      const opcode = frame[0] & 0x7F;
      const hex = frame.map(b => `0x${(b & 0xFF).toString(16).padStart(2, '0')}`).join(' ');
      logger.debug(`${direction} Frame [opcode: 0x${opcode.toString(16)}]: ${hex}`);
    }
  },

  logData: (type: string, data: any) => {
    if (DEBUG) {
      logger.log(`📊 ${type}:`, JSON.stringify(data, null, 2));
    }
  },
};
