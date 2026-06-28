import { embedQuery, EMBEDDING_DIMS } from '../embeddings/embedder.js';
import type { WladyDatabase } from '../db/database.js';
import type { Symbol } from '../types.js';
import { SearchEngine } from './bm25.js';
import type { SearchOptions } from './bm25.js';

const RRF_K = 60;

function dotProduct(a: Float32Array, b: Float32Array): number {
  // Vectors are pre-normalized (normalize: true), so dot product == cosine similarity
  let sum = 0;
  for (let i = 0; i < EMBEDDING_DIMS; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Hybrid BM25 + vector search fused via Reciprocal Rank Fusion.
 * Falls back to BM25-only if no embeddings exist or query embedding fails.
 */
export async function hybridSearch(
  query: string,
  projectId: string,
  db: WladyDatabase,
  options: SearchOptions & { limit?: number } = {}
): Promise<Symbol[]> {
  const limit = options.limit ?? 20;
  const engine = new SearchEngine(db);

  // BM25 leg — fetch wider pool for RRF
  const bm25Results = engine.search(query, projectId, { ...options, limit: limit * 3 });

  // If no embeddings exist yet, return BM25 results directly
  if (!db.hasEmbeddings(projectId)) {
    return bm25Results.slice(0, limit);
  }

  // Embed the query
  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return bm25Results.slice(0, limit);
  }

  // Load all project embeddings and score them
  const embeddings = db.getEmbeddingsByProject(projectId);
  const simScores = new Map<number, number>();
  for (const { symbol_id, vector } of embeddings) {
    simScores.set(symbol_id, dotProduct(queryVec, vector));
  }

  // Vector ranking (top candidates by similarity)
  const vecRanking = [...simScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 3)
    .map(([id]) => id);

  // Build rank maps for RRF
  const bm25RankMap = new Map<number, number>();
  bm25Results.forEach((sym, rank) => bm25RankMap.set(sym.id, rank));

  const vecRankMap = new Map<number, number>();
  vecRanking.forEach((id, rank) => vecRankMap.set(id, rank));

  // RRF score = sum of 1/(K + rank + 1) across both lists
  const allIds = new Set<number>([...bm25RankMap.keys(), ...vecRankMap.keys()]);
  const rrfScores = new Map<number, number>();
  for (const id of allIds) {
    let score = 0;
    const b = bm25RankMap.get(id);
    const v = vecRankMap.get(id);
    if (b !== undefined) score += 1 / (RRF_K + b + 1);
    if (v !== undefined) score += 1 / (RRF_K + v + 1);
    rrfScores.set(id, score);
  }

  const topIds = [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  // Resolve symbols — prefer cached BM25 objects, fetch missing from DB
  const symCache = new Map<number, Symbol>();
  for (const sym of bm25Results) symCache.set(sym.id, sym);

  for (const id of topIds) {
    if (!symCache.has(id)) {
      const sym = db.getSymbolById(id);
      if (sym) symCache.set(id, sym);
    }
  }

  return topIds.map(id => symCache.get(id)!).filter(Boolean);
}
