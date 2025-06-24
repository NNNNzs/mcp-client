/**
 * MCP相关路由
 * @author nnnnzs
 */

import express from 'express';
import { McpService } from '../services/mcp-service.js';
import type { ChatRequest, ChatResponse } from '../types/mcp.js';

/**
 * 创建MCP路由
 * @param mcpService MCP服务实例
 * @returns Express路由实例
 */
export const createMcpRoutes = (mcpService: McpService): express.Router => {
  const router = express.Router();

  /**
   * 聊天接口
   * POST /chat
   * 请求体格式：
   * {
   *   "text": "用户输入的文本"
   * }
   */
  router.post('/chat', async (req, res) => {
    try {
      const { text }: ChatRequest = req.body;

      if (!text) {
        const errorResponse: ChatResponse = {
          success: false,
          error: '缺少必要的text参数'
        };
        res.status(400).json(errorResponse);
        return;
      }

      // 检查MCP服务是否已初始化
      if (!mcpService.isInitialized()) {
        const errorResponse: ChatResponse = {
          success: false,
          error: 'MCP服务未初始化'
        };
        res.status(503).json(errorResponse);
        return;
      }

      // 处理用户请求
      const result = await mcpService.processUserRequest(text);

      const successResponse: ChatResponse = {
        success: true,
        tool: result.tool ? {
          name: result.tool.name || '',
          arguments: result.tool.arguments || {}
        } : undefined,
        result: result.result,
        message: result.message
      };

      res.json(successResponse);
    } catch (error) {
      console.error('处理聊天请求失败:', error);
      
      const errorResponse: ChatResponse = {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误'
      };
      
      res.status(500).json(errorResponse);
    }
  });

  /**
   * 获取可用工具列表
   * GET /tools
   */
  router.get('/tools', async (req, res) => {
    try {
      if (!mcpService.isInitialized()) {
        res.status(503).json({
          error: 'MCP服务未初始化'
        });
        return;
      }

      const tools = await mcpService.getAvailableTools();
      res.json({
        success: true,
        tools: tools
      });
    } catch (error) {
      console.error('获取工具列表失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '服务器内部错误'
      });
    }
  });

  /**
   * 获取MCP服务状态
   * GET /status
   */
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      initialized: mcpService.isInitialized(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}; 