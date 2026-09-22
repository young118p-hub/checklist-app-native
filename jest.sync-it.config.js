// 동기화 통합 테스트 전용 설정 (npm run test:sync).
// jest-expo 프리셋은 전역 fetch를 Expo 네이티브 fetch 스텁으로 바꿔서 실제 네트워크를 못 쓴다 → 노드 환경 + 최소 스텁
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/sync/__tests__/engine.integration.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/sync/__tests__/stubs/react-native.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/src/sync/__tests__/stubs/empty.js',
    '^expo-crypto$': '<rootDir>/src/sync/__tests__/stubs/expo-crypto.js',
    '^expo/virtual/env$': '<rootDir>/src/sync/__tests__/stubs/expo-env.js',
  },
};
