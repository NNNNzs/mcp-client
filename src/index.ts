/**
 * MCP客户端主程序
 * @author nnnnzs
 */

import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { InspectionService } from './services/inspection-service.js';
import { McpService } from './services/mcp-service.js';
import { createInspectionRoutes } from './routes/inspection.js';
// import { createMcpRoutes } from './routes/mcp.js';

dotenv.config();

/**
 * 创建Express应用
 * @param mcpService MCP服务实例
 * @param inspectionService 巡检服务实例
 * @returns Express应用实例
 */
const createExpressApp = (mcpService: McpService, inspectionService: InspectionService) => {
  const app = express();

  // 中间件配置
  app.use(express.json());
  app.use(express.static(path.join(import.meta.dirname, '../public'))); // 提供静态文件服务

  // CORS配置
  app.use((req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // 健康检查接口
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'ok' });
  });

  // 注册路由
  app.use('/api/inspection', createInspectionRoutes(inspectionService));
  // app.use('/api/mcp', createMcpRoutes(mcpService));

  // 保持原有的聊天接口兼容性（重定向到新接口）
  // app.post('/chat', (req: any, res: any) => {
  //   // 转发到新的MCP API
  //   const mcpRoutes = createMcpRoutes(mcpService);
  //   req.url = '/chat';
  //   mcpRoutes(req, res, () => {});
  // });

  return app;
}

/**
 * 主程序入口
 */
const main = async () => {
  let mcpService: McpService | null = null;
  const PORT = process.env.PORT || 3000;

  try {
    // 初始化环境变量
    const modelName = process.env.OPEN_ROUTER_MODEL_NAME;
    const baseURL = process.env.OPEN_ROUTER_BASE_URL;
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (!modelName || !baseURL || !apiKey) {
      throw new Error('缺少必要的环境变量配置');
    }

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

    // 创建服务实例
    mcpService = new McpService(model);
    const inspectionService = new InspectionService();

    // 初始化MCP客户端
    const mcpInitialized = await mcpService.initializeClient();
    if (mcpInitialized) {
      console.log('MCP客户端初始化成功');
    } else {
      console.warn('MCP客户端初始化失败，部分功能可能不可用');
    }

    // 创建Express应用
    const app = createExpressApp(mcpService, inspectionService);

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口 ${PORT}`);
      console.log(`MCP聊天接口: http://localhost:${PORT}/api/mcp/chat`);
      console.log(`MCP工具列表: http://localhost:${PORT}/api/mcp/tools`);
      console.log(`MCP状态检查: http://localhost:${PORT}/api/mcp/status`);
      console.log(`巡检测试页面: http://localhost:${PORT}/inspection-test.html`);
    });

    // 定时清理过期会话（每小时执行一次）
    setInterval(() => {
      inspectionService.cleanupExpiredSessions();
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('程序执行错误:', error);
    process.exit(1);
  }

  // 处理进程退出
  const cleanup = async () => {
    if (mcpService) {
      try {
        await mcpService.close();
        console.log('MCP服务已关闭');
      } catch (error) {
        console.error('关闭MCP服务失败:', error);
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