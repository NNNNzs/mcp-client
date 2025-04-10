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
const loadMcpSettings = async () => {
  const setting = await fs.readFile(mcp_settingPath, 'utf8');
  try {
    const settingJson = JSON.parse(setting);
    return settingJson.mcpServers;
  } catch (error) {
    console.error('mcp_setting.json 格式错误', error);
    return {};
  }
}

const createMcpClient = async () => {

  // const mcpSettings = await loadMcpSettings();

  const client = new Client(
    {
      name: "nnnnzs-mcp-client",
      version: "1.0.0"
    }
  );

  // console.log('mcpSettings', mcpSettings);
  // Object.values(mcpSettings).forEach(async (setting) => {
  //   const transport = new StdioClientTransport(setting as any);
  //   await client.connect(transport);
  // })
  // const transport = new StdioClientTransport({
  //   command: "npx",
  //   args: [
  //     '-y',
  //     "@nnnnzs/server-status-mcp-server@0.0.6"
  //   ]
  // });
  const transport = new SSEClientTransport(new URL('http://172.18.1.105/registry/sse'))

  await client.connect(transport);



  // for (const setting of mcpSettings) {
  //   const transport = new StdioClientTransport(setting);
  //   await client.connect(transport);
  // }
  return client;
}

const main = async () => {

  const modelName = process.env.OPEN_ROUTER_MODEL_NAME;
  const baseURL = process.env.OPEN_ROUTER_BASE_URL;
  const apiKey = process.env.OPEN_ROUTER_API_KEY;

  const client = await createMcpClient();
  client.listTools();
  return;


  const model = new ChatOpenAI({
    modelName: modelName,
    temperature: 0,
    openAIApiKey: apiKey,
    configuration: {
      apiKey: apiKey,
      baseURL: baseURL
    }
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", createSystemPrompt()],
    ["human", "{text}"]
  ]);

  const promptValue = await prompt.invoke({
    text: "查询服务器状态",
    tools_description: await client.listTools()
  });

  console.log('promptValue', promptValue);

  const result2 = await model.invoke(promptValue);
  const resContent = result2.content as string;
  const toolsParse = JSON.parse(resContent);
  console.log(result2);
  console.log('toolsParse', toolsParse)

  if (toolsParse.name) {
    const toolCallRes = await client.callTool(toolsParse);
    console.log('toolCallRes', toolCallRes);
  }



  client.close();
}



try {
  main();
} catch (error) {
  console.error(error);
}