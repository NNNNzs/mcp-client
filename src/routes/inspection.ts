/**
 * 巡检路由处理器
 * @author nnnnzs
 */

import express from 'express';
import { InspectionService } from '../services/inspection-service.js';
import { 
  StartInspectionRequest, 
  StartInspectionResponse, 
  ConfirmActionRequest, 
  ConfirmActionResponse 
} from '../types/inspection.js';

/**
 * 创建巡检路由
 * @param inspectionService 巡检服务实例
 * @returns Express路由
 */
export const createInspectionRoutes = (inspectionService: InspectionService): express.Router => {
  const router = express.Router();

  /**
   * 开始巡检接口
   * POST /api/inspection/start
   */
  router.post('/start', async (req, res) => {
    try {
      const { systemId }: StartInspectionRequest = req.body;

      if (!systemId) {
        res.status(400).json({
          error: '缺少必要的systemId参数'
        });
        return;
      }

      const sessionId = inspectionService.createSession(systemId);
      
      const response: StartInspectionResponse = {
        sessionId,
        createdAt: new Date().toISOString()
      };

      console.log(`巡检会话创建成功: ${sessionId}`);
      res.json(response);
    } catch (error) {
      console.error('创建巡检会话失败:', error);
      res.status(500).json({
        error: '服务器内部错误'
      });
    }
  });

  /**
   * SSE长连接接口
   * GET /api/inspection/stream?sessionId=xxx
   */
  router.get('/stream', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        res.status(400).json({
          error: '缺少必要的sessionId参数'
        });
        return;
      }

      const session = inspectionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: '会话不存在'
        });
        return;
      }

      // 设置SSE响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      console.log(`开始SSE流，会话ID: ${sessionId}`);

      // 发送连接成功消息
      res.write(`data: ${JSON.stringify({
        id: 'connection',
        type: 'TEXT',
        content: '连接建立成功，开始巡检流程...',
        date: new Date().toISOString()
      })}\n\n`);

      try {
        // 生成并发送巡检数据流
        for await (const chunk of inspectionService.generateInspectionStream(sessionId)) {
          const data = JSON.stringify(chunk);
          res.write(`data: ${data}\n\n`);
          console.log(`发送SSE数据: ${chunk.type} - ${chunk.content.substring(0, 50)}...`);
        }

        // 发送结束消息
        res.write(`data: ${JSON.stringify({
          id: 'end',
          type: 'END',
          content: '巡检流程已完成',
          date: new Date().toISOString()
        })}\n\n`);

        res.end();
      } catch (error) {
        console.error('生成巡检流程失败:', error);
        res.write(`data: ${JSON.stringify({
          id: 'error',
          type: 'TEXT',
          content: '巡检流程出现错误',
          date: new Date().toISOString()
        })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error('处理SSE请求失败:', error);
      res.status(500).json({
        error: '服务器内部错误'
      });
    }
  });

  /**
   * 确认或拒绝操作接口
   * POST /api/inspection/confirm
   */
  router.post('/confirm', async (req, res) => {
    try {
      const { chunkId, confirmed, note }: ConfirmActionRequest = req.body;

      if (!chunkId || typeof confirmed !== 'boolean') {
        res.status(400).json({
          error: '缺少必要的参数：chunkId 和 confirmed'
        });
        return;
      }

      const success = inspectionService.handleConfirmation(chunkId, confirmed);
      
      if (success) {
        const response: ConfirmActionResponse = {
          success: true,
          message: confirmed ? '操作确认成功' : '操作已拒绝'
        };

        console.log(`用户${confirmed ? '确认' : '拒绝'}操作, chunk ID: ${chunkId}${note ? `, 备注: ${note}` : ''}`);
        res.json(response);
      } else {
        res.status(404).json({
          success: false,
          message: '未找到待确认的操作或操作已过期'
        });
      }
    } catch (error) {
      console.error('处理确认请求失败:', error);
      res.status(500).json({
        error: '服务器内部错误'
      });
    }
  });

  /**
   * 获取会话状态接口
   * GET /api/inspection/session/:sessionId
   */
  router.get('/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = inspectionService.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          error: '会话不存在'
        });
        return;
      }

      res.json({
        sessionId: session.sessionId,
        systemId: session.systemId,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        pendingChunkId: session.pendingChunkId
      });
    } catch (error) {
      console.error('获取会话状态失败:', error);
      res.status(500).json({
        error: '服务器内部错误'
      });
    }
  });

  return router;
}; 