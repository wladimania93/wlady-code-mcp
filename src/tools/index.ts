import { indexingTools, indexingHandlers } from './indexing.js';
import { navigationTools, navigationHandlers } from './navigation.js';
import { searchTools, searchHandlers } from './search-tools.js';
import { impactTools, impactHandlers } from './impact.js';
import { analysisTools, analysisHandlers } from './analysis.js';
import { architectureTools, architectureHandlers } from './architecture.js';
import { adrTools, adrHandlers } from './adr.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler = Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>
>;

export const allTools: ToolDefinition[] = [
  ...indexingTools,
  ...navigationTools,
  ...searchTools,
  ...impactTools,
  ...analysisTools,
  ...architectureTools,
  ...adrTools,
];

const allHandlers: ToolHandler = {
  ...indexingHandlers,
  ...navigationHandlers,
  ...searchHandlers,
  ...impactHandlers,
  ...analysisHandlers,
  ...architectureHandlers,
  ...adrHandlers,
};

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const handler = allHandlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}. Available tools: ${allTools.map(t => t.name).join(', ')}` }],
    };
  }

  try {
    return await handler(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error executing ${name}: ${message}` }],
    };
  }
}
