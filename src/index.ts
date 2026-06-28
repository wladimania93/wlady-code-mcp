#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { allTools, handleTool } from "./tools/index.js";
import { startVisualizationServer } from "./visualization/server.js";

startVisualizationServer();

const server = new Server(
  { name: "wlady-code", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  return handleTool(req.params.name, req.params.arguments ?? {});
});

const transport = new StdioServerTransport();
await server.connect(transport);
