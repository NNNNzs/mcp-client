/**
 * MCP相关类型定义
 * @author nnnnzs
 */

/**
 * MCP服务器设置接口定义
 */
export interface McpServerSetting {
  type: 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
}

/**
 * MCP服务器配置
 */
export interface McpServersConfig {
  mcpServers: Record<string, McpServerSetting>;
}

/**
 * 聊天请求接口
 */
export interface ChatRequest {
  text: string;
}

/**
 * 聊天响应接口 - 成功
 */
export interface ChatSuccessResponse {
  success: true;
  tool?: {
    name: string;
    arguments: Record<string, any>;
  };
  result?: any;
  message?: string;
}

/**
 * 聊天响应接口 - 错误
 */
export interface ChatErrorResponse {
  success: false;
  error: string;
}

/**
 * 聊天响应接口
 */
export type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

/**
 * 工具调用解析结果
 */
export interface ToolCallResult {
  name?: string;
  arguments?: Record<string, any>;
} 