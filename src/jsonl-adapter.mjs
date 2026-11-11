import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { performance } from 'node:perf_hooks';

export class JsonlAdapter {
  constructor(command, args, { timeoutMs = 30_000, maxBytes = 2_000_000 } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxBytes = maxBytes;
    this.sequence = 0;
    this.pending = new Map();
    const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'TZ'].filter((name) => process.env[name]).map((name) => [name, process.env[name]]));
    this.child = spawn(command, args, { shell: false, env, stdio: ['pipe', 'pipe', 'pipe'] });
    // Candidate stderr can contain secrets; drain it without retaining it.
    this.child.stderr.resume();
    this.child.stdin.on('error', () => this.failAll('Adapter input closed.'));
    this.child.on('error', () => this.failAll('Adapter could not start.'));
    this.child.on('exit', () => this.failAll('Adapter exited before its response.'));
    let buffered = 0;
    this.child.stdout.on('data', (chunk) => {
      buffered += chunk.length;
      if (buffered > this.maxBytes) {
        this.failAll('Adapter response exceeded its size limit.');
        this.child.kill();
      }
    });
    const lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => {
      buffered = 0;
      try {
        const response = JSON.parse(line);
        const waiting = this.pending.get(response.requestId);
        if (!waiting) throw new Error('Unexpected response.');
        this.pending.delete(response.requestId);
        clearTimeout(waiting.timer);
        waiting.resolve({ response, elapsedMs: performance.now() - waiting.started });
      } catch {
        this.failAll('Adapter returned malformed or unsolicited JSONL.');
      }
    });
  }

  failAll(message) {
    this.failed = message;
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(message));
    }
    this.pending.clear();
  }

  request(operation, payload = {}) {
    if (this.failed) return Promise.reject(new Error(this.failed));
    const requestId = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Adapter timed out during ${operation}.`));
        this.failAll('Adapter timed out.');
        this.child.kill();
      }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer, started: performance.now() });
      this.child.stdin.write(`${JSON.stringify({ requestId, operation, ...payload })}\n`);
    });
  }

  close() {
    this.failAll('Adapter closed.');
    this.child.stdin.end();
    this.child.kill();
  }
}
