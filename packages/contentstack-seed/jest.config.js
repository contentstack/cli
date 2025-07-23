module.exports = {
  "roots": [
    "<rootDir>"
  ],
  "testMatch": [
    "**/tests/**/*.+(ts|tsx|js|jsx)",
    "**/?(*.)+(spec|test).+(ts|tsx|js|jsx)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      "tsconfig": "tsconfig.json"
    }]
  },
  "moduleFileExtensions": ["ts", "tsx", "js", "jsx", "json"],
  "testEnvironment": "node",
  "transformIgnorePatterns": [
    "node_modules/(?!(@contentstack)/)"
  ]
}