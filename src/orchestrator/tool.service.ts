import { Injectable, Logger } from '@nestjs/common';
import { DockerManagerService } from './docker-manager.service';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  category: 'web' | 'file' | 'system' | 'api';
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  result: string;
  error?: string;
}

export interface ExecutionContext {
  containerId: string;
  workingDir: string;
  agentId: string;
  taskId: string;
}

@Injectable()
export class ToolService {
  private readonly logger = new Logger(ToolService.name);

  constructor(private readonly dockerManager: DockerManagerService) {}

  private readonly availableTools: ToolDefinition[] = [
    {
      name: 'search_web',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Maximum results (default: 5)' },
      },
      category: 'web',
    },
    {
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        path: { type: 'string', description: 'File path relative to working directory' },
      },
      category: 'file',
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        path: { type: 'string', description: 'File path relative to working directory' },
        content: { type: 'string', description: 'File content' },
      },
      category: 'file',
    },
    {
      name: 'list_directory',
      description: 'List contents of a directory',
      parameters: {
        path: { type: 'string', description: 'Directory path (default: current directory)' },
      },
      category: 'file',
    },
    {
      name: 'execute_shell',
      description: 'Execute a shell command',
      parameters: {
        command: { type: 'string', description: 'Shell command to execute' },
        args: { type: 'array', description: 'Command arguments' },
      },
      category: 'system',
    },
    {
      name: 'make_http_request',
      description: 'Make HTTP request to external API',
      parameters: {
        url: { type: 'string', description: 'Request URL' },
        method: { type: 'string', description: 'HTTP method (GET, POST, PUT, DELETE)' },
        headers: { type: 'object', description: 'Request headers' },
        body: { type: 'string', description: 'Request body (for POST/PUT)' },
      },
      category: 'api',
    },
  ];

  getAvailableTools(): ToolDefinition[] {
    return this.availableTools;
  }

  async detectToolCall(llmResponse: string): Promise<ToolCall | null> {
    // Pattern to detect tool calls in LLM responses
    // Looking for patterns like: use_tool("tool_name", {"param": "value"})
    const toolCallPattern = /use_tool\s*\(\s*["']([^"']+)["']\s*,\s*({[^}]*})\s*\)/;
    const match = llmResponse.match(toolCallPattern);

    if (match) {
      try {
        const toolName = match[1];
        const args = JSON.parse(match[2]);
        return { name: toolName, arguments: args };
      } catch (error) {
        this.logger.warn(`Failed to parse tool call: ${error.message}`);
        return null;
      }
    }

    return null;
  }

  async executeToolCall(
    toolCall: ToolCall,
    context: ExecutionContext,
  ): Promise<ToolResult> {
    this.logger.log(
      `Executing tool: ${toolCall.name} with args:`,
      toolCall.arguments,
    );

    try {
      let result: string;
      
      switch (toolCall.name) {
        case 'search_web':
          result = await this.searchWeb(
            toolCall.arguments.query,
            toolCall.arguments.maxResults || 5,
          );
          break;
          
        case 'read_file':
          result = await this.readFile(
            toolCall.arguments.path,
            context.containerId,
            context.workingDir,
          );
          break;
          
        case 'write_file':
          result = await this.writeFile(
            toolCall.arguments.path,
            toolCall.arguments.content,
            context.containerId,
            context.workingDir,
          );
          break;
          
        case 'list_directory':
          result = await this.listDirectory(
            toolCall.arguments.path || '.',
            context.containerId,
            context.workingDir,
          );
          break;
          
        case 'execute_shell':
          result = await this.executeShellCommand(
            toolCall.arguments.command,
            toolCall.arguments.args || [],
            context.containerId,
            context.workingDir,
          );
          break;
          
        case 'make_http_request':
          result = await this.makeHttpRequest(toolCall.arguments as {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: string;
          });
          break;
          
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Tool execution failed: ${error.message}`);
      return { success: false, result: '', error: error.message };
    }
  }

  async searchWeb(query: string, maxResults: number = 5): Promise<string> {
    // Mock web search implementation
    // In production, integrate with search APIs like Google, Bing, or DuckDuckGo
    this.logger.log(`Web search: ${query} (max: ${maxResults})`);
    
    const mockResults = [
      {
        title: `Result for "${query}" - Documentation`,
        url: `https://docs.example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Official documentation and guides for ${query}...`,
      },
      {
        title: `${query} Tutorial - Learn More`,
        url: `https://tutorial.example.com/${query.toLowerCase()}`,
        snippet: `Comprehensive tutorial covering ${query} fundamentals...`,
      },
      {
        title: `GitHub - ${query} Examples`,
        url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Open source examples and implementations of ${query}...`,
      },
    ];

    const results = mockResults.slice(0, maxResults);
    return JSON.stringify(results, null, 2);
  }

  async readFile(
    path: string,
    containerId: string,
    workingDir: string = '/app',
  ): Promise<string> {
    const fullPath = path.startsWith('/') ? path : `${workingDir}/${path}`;
    return this.dockerManager.executeCommand(containerId, ['cat', fullPath]);
  }

  async writeFile(
    path: string,
    content: string,
    containerId: string,
    workingDir: string = '/app',
  ): Promise<string> {
    const fullPath = path.startsWith('/') ? path : `${workingDir}/${path}`;
    
    // Use echo to write content, escaping special characters
    const escapedContent = content.replace(/'/g, "'\"'\"'");
    await this.dockerManager.executeCommand(
      containerId,
      ['sh', '-c', `echo '${escapedContent}' > '${fullPath}'`],
    );
    
    return `File written successfully: ${path}`;
  }

  async listDirectory(
    path: string = '.',
    containerId: string,
    workingDir: string = '/app',
  ): Promise<string> {
    const fullPath = path.startsWith('/') ? path : `${workingDir}/${path}`;
    return this.dockerManager.executeCommand(containerId, ['ls', '-la', fullPath]);
  }

  async executeShellCommand(
    command: string,
    args: string[],
    containerId: string,
    workingDir: string = '/app',
  ): Promise<string> {
    return this.dockerManager.executeCommand(
      containerId,
      [command, ...args],
      workingDir,
    );
  }

  async makeHttpRequest(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<string> {
    const { url, method = 'GET', headers = {}, body } = options;
    
    try {
      // Use Node.js fetch (available in Node 18+) or a HTTP client
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'Prometheus-Agent/1.0',
          ...headers,
        },
        body: method !== 'GET' ? body : undefined,
      });

      const responseText = await response.text();
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      }, null, 2);
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
}