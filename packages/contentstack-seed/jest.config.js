module.exports = {
  "roots": [
    "<rootDir>"
  ],
  "testMatch": [
    "**/tests/**/*.+(ts|tsx)",
    "**/?(*.)+(spec|test).+(ts|tsx)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}