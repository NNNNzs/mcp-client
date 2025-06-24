/**
 * 巡检服务类
 * @author nnnnzs
 */

import { v4 as uuidv4 } from 'uuid';
import { InspectionSession, SSEChunk, SSEChunkType } from '../types/inspection.js';

/**
 * 巡检服务类
 */
export class InspectionService {
  /** 会话存储 */
  private sessions: Map<string, InspectionSession> = new Map();
  /** 待确认的操作 */
  private pendingConfirmations: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  /**
   * 创建新的巡检会话
   * @param systemId 系统ID
   * @returns 会话ID
   */
  createSession(systemId: string): string {
    const sessionId = uuidv4();
    const session: InspectionSession = {
      sessionId,
      systemId,
      createdAt: new Date(),
      status: 'active'
    };
    
    this.sessions.set(sessionId, session);
    console.log(`创建巡检会话: ${sessionId}, 系统ID: ${systemId}`);
    
    return sessionId;
  }

  /**
   * 获取会话信息
   * @param sessionId 会话ID
   * @returns 会话信息
   */
  getSession(sessionId: string): InspectionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 更新会话状态
   * @param sessionId 会话ID
   * @param status 新状态
   * @param pendingChunkId 待确认的chunk ID
   */
  updateSessionStatus(sessionId: string, status: InspectionSession['status'], pendingChunkId?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.pendingChunkId = pendingChunkId;
    }
  }

  /**
   * 生成模拟巡检数据流
   * @param sessionId 会话ID
   * @returns AsyncGenerator<SSEChunk>
   */
  async* generateInspectionStream(sessionId: string): AsyncGenerator<SSEChunk> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    console.log(`开始为会话 ${sessionId} 生成巡检数据流`);

    // 模拟巡检流程
    const inspectionSteps = [
      {
        type: SSEChunkType.TEXT,
        content: `开始对系统 ${session.systemId} 进行巡检...`,
        delay: 1000
      },
      {
        type: SSEChunkType.THINK,
        content: '正在分析系统当前状态...',
        delay: 2000
      },
      {
        type: SSEChunkType.TEXT,
        content: '检测到系统负载较高，建议进行性能优化',
        delay: 1500
      },
      {
        type: SSEChunkType.CALL_CONFIRM,
        content: '是否要调用MCP工具获取详细的系统监控数据？',
        delay: 1000,
        requiresConfirmation: true
      },
      {
        type: SSEChunkType.MCP_RESULT,
        content: JSON.stringify({
          cpu_usage: '75%',
          memory_usage: '82%',
          disk_usage: '65%',
          network_io: '1.2MB/s'
        }, null, 2),
        delay: 2000
      },
      {
        type: SSEChunkType.THINK,
        content: '正在分析监控数据，生成优化建议...',
        delay: 3000
      },
      {
        type: SSEChunkType.TEXT,
        content: '基于监控数据分析，建议：\n1. 优化内存使用，清理缓存\n2. 检查CPU密集型进程\n3. 监控磁盘I/O性能',
        delay: 1000
      },
      {
        type: SSEChunkType.CALL_CONFIRM,
        content: '是否要执行自动优化脚本？',
        delay: 500,
        requiresConfirmation: true
      },
      {
        type: SSEChunkType.TEXT,
        content: '巡检完成，已生成详细报告',
        delay: 1000
      }
    ];

    for (const step of inspectionSteps) {
      await this.delay(step.delay);
      
      const chunk: SSEChunk = {
        id: uuidv4(),
        type: step.type,
        content: step.content,
        date: new Date().toISOString()
      };

      yield chunk;

      // 如果需要确认，等待用户响应
      if (step.requiresConfirmation) {
        this.updateSessionStatus(sessionId, 'waiting', chunk.id);
        console.log(`等待用户确认操作，chunk ID: ${chunk.id}`);
        
        try {
          const confirmed = await this.waitForConfirmation(chunk.id);
          if (confirmed) {
            yield {
              id: uuidv4(),
              type: SSEChunkType.TEXT,
              content: '用户已确认，继续执行...',
              date: new Date().toISOString()
            };
          } else {
            yield {
              id: uuidv4(),
              type: SSEChunkType.TEXT,
              content: '用户已拒绝，跳过此步骤...',
              date: new Date().toISOString()
            };
          }
        } catch (error) {
          yield {
            id: uuidv4(),
            type: SSEChunkType.TEXT,
            content: '等待确认超时，自动跳过...',
            date: new Date().toISOString()
          };
        }
        
        this.updateSessionStatus(sessionId, 'active');
      }
    }

    this.updateSessionStatus(sessionId, 'completed');
    console.log(`会话 ${sessionId} 的巡检流程已完成`);
  }

  /**
   * 处理用户确认
   * @param chunkId chunk ID
   * @param confirmed 是否确认
   * @returns 处理结果
   */
  handleConfirmation(chunkId: string, confirmed: boolean): boolean {
    const pending = this.pendingConfirmations.get(chunkId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingConfirmations.delete(chunkId);
      pending.resolve(confirmed);
      console.log(`用户${confirmed ? '确认' : '拒绝'}了操作，chunk ID: ${chunkId}`);
      return true;
    }
    return false;
  }

  /**
   * 等待用户确认
   * @param chunkId chunk ID
   * @param timeoutMs 超时时间（毫秒）
   * @returns Promise<boolean>
   */
  private waitForConfirmation(chunkId: string, timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingConfirmations.delete(chunkId);
        reject(new Error('确认超时'));
      }, timeoutMs);

      this.pendingConfirmations.set(chunkId, {
        resolve,
        reject,
        timeout
      });
    });
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.createdAt.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`清理过期会话: ${sessionId}`);
      }
    }
  }
} 