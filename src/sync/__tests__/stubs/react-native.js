// 통합 테스트(노드 환경)용 최소 스텁. 동기화 코드가 쓰는 것만
module.exports = {
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'android' },
};
