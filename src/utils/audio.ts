import * as lamejs from '@breezystack/lamejs';

/**
 * Converts a Base64 string of raw PCM 16-bit linear audio data to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Base64 string of raw PCM 16-bit linear audio data to Int16Array.
 */
export function base64ToInt16Array(base64: string): Int16Array {
  const bytes = base64ToUint8Array(base64);
  // Ensure the underlying buffer is copied or correctly aligned
  const bufferCopy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Int16Array(bufferCopy);
}

/**
 * Writes a string directly to a DataView starting at the specified offset.
 */
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Packs raw 16-bit linear PCM mono samples into a standard WAVE (.wav) file Blob.
 */
export function pcmToWav(pcmData: Int16Array, sampleRate = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);

  // 1. ChunkID: "RIFF"
  writeString(view, 0, 'RIFF');
  // 2. ChunkSize: 36 + subchunk2Size
  view.setUint32(4, 36 + pcmData.length * 2, true);
  // 3. Format: "WAVE"
  writeString(view, 8, 'WAVE');
  
  // 4. Subchunk1ID: "fmt "
  writeString(view, 12, 'fmt ');
  // 5. Subchunk1Size: 16 (for PCM)
  view.setUint32(16, 16, true);
  // 6. AudioFormat: 1 (uncompressed PCM)
  view.setUint16(20, 1, true);
  // 7. NumChannels: 1 (mono)
  view.setUint16(22, 1, true);
  // 8. SampleRate: e.g. 24000
  view.setUint32(24, sampleRate, true);
  // 9. ByteRate: sampleRate * channels * bitsPerSample/8
  view.setUint32(28, sampleRate * 1 * 2, true);
  // 10. BlockAlign: channels * bitsPerSample/8
  view.setUint16(32, 2, true);
  // 11. BitsPerSample: 16
  view.setUint16(34, 16, true);

  // 12. Subchunk2ID: "data"
  writeString(view, 36, 'data');
  // 13. Subchunk2Size: size of raw PCM data
  view.setUint32(40, pcmData.length * 2, true);

  // Write the 16-bit PCM samples
  const samplesOffset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(samplesOffset + i * 2, pcmData[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Concatenates multiple base64-encoded PCM parts into a single Int16Array.
 */
export function concatenatePCMParts(parts: string[]): Int16Array {
  const decodedParts = parts.map(part => base64ToInt16Array(part));
  const totalLength = decodedParts.reduce((sum, part) => sum + part.length, 0);
  const result = new Int16Array(totalLength);
  
  let offset = 0;
  for (const part of decodedParts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  return result;
}

/**
 * Encodes 16-bit PCM mono samples to MP3 using lamejs.
 */
export function pcmToMp3(pcmData: Int16Array, sampleRate = 24000, kbps = 128): Blob {
  // Safe instantiation in case imports are wrapped or nested
  // @ts-ignore
  const EncoderClass = lamejs.Mp3Encoder || (lamejs.default && lamejs.default.Mp3Encoder);
  if (!EncoderClass) {
    throw new Error('LameMP3 encoder not found');
  }

  const mp3encoder = new EncoderClass(1, sampleRate, kbps);
  const mp3Data: any[] = [];
  
  const sampleBlockSize = 576 * 10;
  for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
    const chunk = pcmData.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Estimates duration in seconds for mono raw 16-bit PCM data.
 */
export function estimateDuration(length: number, sampleRate = 24000): number {
  return length / sampleRate;
}
