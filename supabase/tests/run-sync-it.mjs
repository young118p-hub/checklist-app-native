// 로컬 미니 스택을 띄우고 앱 동기화 통합 테스트를 돌린 뒤 정리한다
// 실행: npm run test:sync   (PostgREST 바이너리 필요: POSTGREST_BIN 또는 PATH의 postgrest, libpq)
import { spawn } from 'node:child_process';

const stack = spawn('node', ['supabase/tests/local-stack.mjs'], { stdio: ['pipe', 'pipe', 'inherit'] });
const ready = new Promise((resolve, reject) => {
  stack.stdout.on('data', d => { if (String(d).includes('READY')) resolve(); });
  stack.on('exit', code => reject(new Error(`stack exited ${code}`)));
});
try {
  await ready;
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const jest = spawn('npx', ['jest', '-c', 'jest.sync-it.config.js', '--runInBand'], {
  stdio: 'inherit', env: { ...process.env, SYNC_IT: '1' },
});
jest.on('exit', code => {
  stack.stdin.end();
  stack.kill('SIGTERM');
  process.exit(code ?? 1);
});
