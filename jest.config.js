module.exports = {
    "roots": [
      "<rootDir>/dist"
    ],
    "testMatch": [
      "**/test/**/*.+(ts|tsx|js)",
      "**/?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    "transform": {
      "^.+\\.(ts|tsx)$": "ts-jest"
    }
  }