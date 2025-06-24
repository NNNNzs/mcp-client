/**
 * MCP服务类
 * 负责管理MCP客户端连接、配置加载和工具调用
 * @author nnnnzs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import fs from 'fs/promises';
import path from 'path';
import type { McpServerSetting, McpServersConfig, ToolCallResult } from '../types/mcp.js';

export class McpService {
  private client: Client | null = null;
  private model: ChatOpenAI;
  private settingPath: string;

  /**
   * 构造函数
   * @param model LLM模型实例
   * @param settingPath MCP配置文件路径
   */
  constructor(model: ChatOpenAI, settingPath?: string) {
    this.model = model;
    console.log('import.meta.dirname',import.meta.dirname);
    this.settingPath = settingPath || path.join(import.meta.dirname, '../mcp_setting.json');
  }

  /**
   * 创建系统提示词
   * @returns 系统提示词
   */
  private createSystemPrompt(): string {
    return `
    # 角色
    你是一个专业的工具选择专家，负责根据用户需求选择最合适的工具。
    
    # 可用工具
    {tools_description}
    
    # 工作流程
    1. 仔细分析用户的问题和需求
    2. 从工具列表中选择最合适的工具
    3. 使用规定的JSON格式返回工具调用指令
    
    # 响应规则
    - 必须且只能返回JSON格式
    - JSON必须包含name和arguments两个字段
    - 格式示例：
    {
        "name": "工具名称",
        "arguments": {
            "参数名": "参数值"
        }
    }
    - 无参数时使用空对象：
    {
        "name": "工具名称",
        "arguments": {}
    }
    
    # 重要约束
    - 工具名称必须与列表中的完全匹配
    - 参数必须符合工具要求
    - 不要添加任何解释性文字
    - 只返回JSON，不要有其他内容
    - 如果没有合适的工具，返回空JSON对象 {}
    `;
  }

  /**
   * 加载MCP配置
   * @returns MCP服务器配置
   */
  private async loadMcpSettings(): Promise<Record<string, McpServerSetting>> {
    try {
      const setting = await fs.readFile(this.settingPath, 'utf8');
      const settingJson: McpServersConfig = JSON.parse(setting);
      return settingJson.mcpServers;
    } catch (error) {
      console.error('加载 mcp_setting.json 失败:', error);
      return {};
    }
  }

  /**
   * 初始化MCP客户端
   * @returns 是否初始化成功
   */
  async initializeClient(): Promise<boolean> {
    if (this.client) {
      console.log('MCP客户端已存在，跳过初始化');
      return true;
    }

    this.client = new Client({
      name: "nnnnzs-mcp-client",
      version: "1.0.0"
    });

    try {
      const mcpSettings = await this.loadMcpSettings();
      let hasConnectedServer = false;

      // 遍历所有配置的服务器
      for (const [name, setting] of Object.entries(mcpSettings)) {
        try {
          let transport;

          if (setting.type === 'sse' && setting.url) {
            // 使用SSE传输
            transport = new SSEClientTransport(new URL(setting.url));
            console.log(`正在连接SSE服务器: ${setting.url}`);
          } else if (setting.type === 'stdio' && setting.command) {
            // 使用STDIO传输
            transport = new StdioClientTransport({
              command: setting.command,
              args: setting.args || []
            });
            console.log(`正在连接STDIO服务器: ${setting.command}`);
          } else {
            console.warn(`跳过配置 ${name}: 配置不完整或类型不支持`);
            continue;
          }

          await this.client.connect(transport);
          console.log(`服务器 ${name} 连接成功`);
          hasConnectedServer = true;
        } catch (error) {
          console.error(`连接服务器 ${name} 失败:`, error);
          // 继续尝试连接其他服务器
        }
      }

      // 检查是否有任何服务器连接成功
      if (!hasConnectedServer) {
        const tools = await this.client.listTools();
        if (!tools || tools.length === 0) {
          throw new Error('没有可用的工具，请检查服务器配置');
        }
      }

      return true;
    } catch (error) {
      console.error('初始化MCP客户端失败:', error);
      this.client = null;
      return false;
    }
  }

  /**
   * 获取可用工具列表
   * @returns 工具列表
   */
  async getAvailableTools(): Promise<any> {
    if (!this.client) {
      throw new Error('MCP客户端未初始化');
    }

    try {
      return await this.client.listTools();
    } catch (error) {
      console.error('获取工具列表失败:', error);
      throw error;
    }
  }

  /**
   * 使用LLM选择并调用工具
   * @param userText 用户输入文本
   * @returns 工具调用结果
   */
  async processUserRequest(userText: string): Promise<{
    tool?: ToolCallResult;
    result?: any;
    message?: string;
  }> {
    if (!this.client) {
      throw new Error('MCP客户端未初始化');
    }

    try {
      // 获取可用工具列表
      const tools = await this.getAvailableTools();

      // 创建提示词模板
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this.createSystemPrompt()],
        ["human", "{text}"]
      ]);

      // 调用LLM获取工具选择
      const promptValue = await prompt.invoke({
        text: userText,
        tools_description: tools
      });

      const result = await this.model.invoke(promptValue);
      const resContent = result.content as string;

      // 解析LLM响应
      const toolsParse: ToolCallResult = JSON.parse(resContent);
      console.log('工具选择结果:', toolsParse);

      if (toolsParse.name) {
        // 调用选中的工具
        const toolCallRes = await this.client.callTool({
          name: toolsParse.name,
          arguments: toolsParse.arguments || {}
        });
        return {
          tool: toolsParse,
          result: toolCallRes
        };
      } else {
        return {
          message: '没有找到合适的工具'
        };
      }
    } catch (error) {
      console.error('处理用户请求失败:', error);
      throw error;
    }
  }

  /**
   * 关闭MCP客户端连接
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('MCP客户端已关闭');
        this.client = null;
      } catch (error) {
        console.error('关闭MCP客户端失败:', error);
        throw error;
      }
    }
  }

  /**
   * 检查客户端是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * 获取客户端实例（仅用于调试）
   * @returns 客户端实例
   */
  getClient(): Client | null {
    return this.client;
  }
} 