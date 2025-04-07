// Export mocks to allow their reset
export const mockChalk = {
  blue: jest.fn((text) => text),
  green: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  red: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  dim: jest.fn((text) => text),
  italic: jest.fn((text) => text),
  underline: jest.fn((text) => text),
  inverse: jest.fn((text) => text),
  strikethrough: jest.fn((text) => text),
  black: jest.fn((text) => text),
  bgBlue: jest.fn((text) => text),
  bgGreen: jest.fn((text) => text),
  bgYellow: jest.fn((text) => text),
  bgRed: jest.fn((text) => text),
  bgMagenta: jest.fn((text) => text),
  bgCyan: jest.fn((text) => text),
  bgWhite: jest.fn((text) => text),
  bgBlack: jest.fn((text) => text)
}

export const mockWinston = {
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn()
  },
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }),
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}

export const mockWinstonDailyRotateFile = jest.fn()

// Mocks configuration
jest.mock('chalk', () => ({
  default: mockChalk
}))

jest.mock('winston', () => mockWinston)

jest.mock('winston-daily-rotate-file', () => ({
  default: mockWinstonDailyRotateFile
}))
