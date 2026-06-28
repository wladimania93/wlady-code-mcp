import * as os from 'os';
import * as path from 'path';

const MODEL_ID = 'Snowflake/snowflake-arctic-embed-xs';
export const EMBEDDING_DIMS = 384;
const BATCH_SIZE = 32;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (...args: any[]) => Promise<any>;

let _pipe: AnyPipeline | null = null;
let _loading: Promise<AnyPipeline | null> | null = null;
let _failed = false;

async function loadPipeline(): Promise<AnyPipeline | null> {
  if (_failed) return null;
  if (_pipe) return _pipe;
  if (_loading) return _loading;

  _loading = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = path.join(os.homedir(), '.wlady-code-mcp', 'models');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).allowLocalModels = true;
    const p = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' });
    _pipe = p as unknown as AnyPipeline;
    _loading = null;
    return _pipe;
  })().catch(() => {
    _failed = true;
    _loading = null;
    return null;
  });

  return _loading;
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const pipe = await loadPipeline();
  if (!pipe || texts.length === 0) return [];

  const results: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const output = await pipe(batch, { pooling: 'mean', normalize: true });
      const flat: Float32Array = output.data;
      for (let j = 0; j < batch.length; j++) {
        results.push(flat.slice(j * EMBEDDING_DIMS, (j + 1) * EMBEDDING_DIMS));
      }
    } catch {
      // skip failed batch — pad with empty slots
      for (let j = 0; j < batch.length; j++) {
        results.push(new Float32Array(EMBEDDING_DIMS));
      }
    }
  }
  return results;
}

export async function embedQuery(text: string): Promise<Float32Array | null> {
  try {
    const pipe = await loadPipeline();
    if (!pipe) return null;
    const output = await pipe([text], { pooling: 'mean', normalize: true });
    return (output.data as Float32Array).slice(0, EMBEDDING_DIMS);
  } catch {
    return null;
  }
}

export function embeddingsAvailable(): boolean {
  return !_failed && (_pipe !== null || _loading !== null);
}
