import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Small, deterministic PCM fixtures. Their supplied transcript is synthetic;
// they exercise workflow/provenance, not speech recognition or video quality.
export function generateMedia(outputDirectory) {
  const output = resolve(outputDirectory);
  mkdirSync(output, { recursive: true });
  const sampleRate = 8000;
  const durationSeconds = 8;
  const samples = sampleRate * durationSeconds;
  const sources = [];
  for (const [index, id] of ['asset-a', 'asset-b'].entries()) {
    const bytes = Buffer.alloc(44 + samples * 2);
    bytes.write('RIFF', 0);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(sampleRate, 24);
    bytes.writeUInt32LE(sampleRate * 2, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36);
    bytes.writeUInt32LE(samples * 2, 40);
    for (let sample = 0; sample < samples; sample += 1) {
      const period = index === 0 ? 80 : 40;
      bytes.writeInt16LE(sample % period < period / 2 ? 1600 : -1600, 44 + sample * 2);
    }
    const file = `${id}.wav`;
    writeFileSync(resolve(output, file), bytes);
    sources.push({ id, file, bytes: bytes.length, durationSeconds,
      sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const manifest = { fixture: 'reference-interview', version: '0.1.0', synthetic: true, sources };
  writeFileSync(resolve(output, 'sources.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) {
    console.error('Usage: node generate-media.mjs <disposable-output-directory>');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(generateMedia(process.argv[2]), null, 2));
  }
}
