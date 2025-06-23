/**
 * MCP客户端主程序
 * @author nnnnzs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import express from 'express'

const mcp_settingPath = path.join(import.meta.dirname, 'mcp_setting.json');

dotenv.config();

/**
 * MCP设置接口定义
 */
interface McpServerSetting {
  type: 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
}

/**
 * 创建系统提示词
 * @returns {string} 系统提示词
 */
const createSystemPrompt = () => {
  const systemPrompt = `
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
  {{
      "name": "工具名称",
      "arguments": {{
          "参数名": "参数值"
      }}
  }}
  - 无参数时使用空对象：
  {{
      "name": "工具名称",
      "arguments": {{}}
  }}
  
  # 重要约束
  - 工具名称必须与列表中的完全匹配
  - 参数必须符合工具要求
  - 不要添加任何解释性文字
  - 只返回JSON，不要有其他内容
  - 如果没有合适的工具，返回空JSON对象 {{}}\n
    `;
  return systemPrompt;
}

/**
 * 加载MCP配置
 * @returns {Promise<Record<string, McpServerSetting>>} MCP服务器配置
 */
const loadMcpSettings = async () => {
  try {
    const setting = await fs.readFile(mcp_settingPath, 'utf8');
    const settingJson = JSON.parse(setting);
    return settingJson.mcpServers as Record<string, McpServerSetting>;
  } catch (error) {
    console.error('加载 mcp_setting.json 失败:', error);
    return {};
  }
}

/**
 * 创建MCP客户端
 * @returns {Promise<Client>} MCP客户端实例
 */
const createMcpClient = async () => {
  const client = new Client({
    name: "nnnnzs-mcp-client",
    version: "1.0.0"
  });

  try {
    const mcpSettings = await loadMcpSettings();

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

        await client.connect(transport);
        console.log(`服务器 ${name} 连接成功`);
      } catch (error) {
        console.error(`连接服务器 ${name} 失败:`, error);
        // 继续尝试连接其他服务器
      }
    }

    // 检查是否有任何服务器连接成功
    const tools = await client.listTools();
    if (!tools || tools.length === 0) {
      throw new Error('没有可用的工具，请检查服务器配置');
    }

    return client;
  } catch (error) {
    console.error('创建MCP客户端失败:', error);
    throw error;
  }
}

/**
 * 创建Express应用
 * @param client MCP客户端实例
 * @param model LLM模型实例
 * @returns Express应用实例
 */
const createExpressApp = (client: Client, model: ChatOpenAI) => {
  const app = express();
  app.use(express.json());

  // 健康检查接口
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * 聊天接口
   * 请求体格式：
   * {
   *   "text": "用户输入的文本"
   * }
   */
  app.post('/chat', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: '缺少必要的text参数'
        });
      }

      // 获取可用工具列表
      const tools = await client.listTools();

      // 创建提示词模板
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", createSystemPrompt()],
        ["human", "{text}"]
      ]);

      // 调用LLM获取工具选择
      const promptValue = await prompt.invoke({
        text,
        tools_description: tools
      });

      const result = await model.invoke(promptValue);
      const resContent = result.content as string;

      try {
        const toolsParse = JSON.parse(resContent);
        console.log('工具选择结果:', toolsParse);

        if (toolsParse.name) {
          const toolCallRes = await client.callTool(toolsParse);
          return res.json({
            success: true,
            tool: toolsParse,
            result: toolCallRes
          });
        } else {
          return res.json({
            success: true,
            message: '没有找到合适的工具'
          });
        }
      } catch (error) {
        console.error('解析LLM响应失败:', error);
        return res.status(500).json({
          error: '解析LLM响应失败'
        });
      }
    } catch (error) {
      console.error('处理请求失败:', error);
      res.status(500).json({
        error: '服务器内部错误'
      });
    }
  });

  return app;
}

/**
 * 主程序入口
 */
const main = async () => {
  let client: Client | null = null;
  const PORT = process.env.PORT || 3000;

  try {
    // 初始化环境变量
    const modelName = process.env.OPEN_ROUTER_MODEL_NAME;
    const baseURL = process.env.OPEN_ROUTER_BASE_URL;
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (!modelName || !baseURL || !apiKey) {
      throw new Error('缺少必要的环境变量配置');
    }

    // 创建MCP客户端
    client = await createMcpClient();
    console.log('MCP客户端创建成功');

    // 创建LLM实例
    const model = new ChatOpenAI({
      modelName: modelName,
      temperature: 0,
      openAIApiKey: apiKey,
      configuration: {
        apiKey: apiKey,
        baseURL: baseURL
      }
    });

    // 创建Express应用
    const app = createExpressApp(client, model);

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口 ${PORT}`);
    });

  } catch (error) {
    console.error('程序执行错误:', error);
    process.exit(1);
  }

  // 处理进程退出
  const cleanup = async () => {
    if (client) {
      try {
        await client.close();
        console.log('MCP客户端已关闭');
      } catch (error) {
        console.error('关闭MCP客户端失败:', error);
      }
    }
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 启动主程序
main().catch((error) => {
  console.error('程序启动失败:', error);
  process.exit(1);
});