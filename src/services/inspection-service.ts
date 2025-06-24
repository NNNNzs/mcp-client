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
        content: '是否要生成详细的巡检报告？',
        delay: 500,
        requiresConfirmation: true
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
            
            // 如果是最后一个确认（生成报告），则开始生成报告
            if (step.content.includes('生成详细的巡检报告')) {
              yield* this.generateReportStream(sessionId);
            }
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
   * 生成报告数据流
   * @param sessionId 会话ID
   * @returns AsyncGenerator<SSEChunk>
   */
  async* generateReportStream(sessionId: string): AsyncGenerator<SSEChunk> {
    console.log(`开始为会话 ${sessionId} 生成报告数据流`);

    // 拆分报告内容为多个chunk
    const reportChunks = this.splitReportContent();

    for (const chunk of reportChunks) {
      await this.delay(chunk.delay);
      
      yield {
        id: uuidv4(),
        type: SSEChunkType.REPORT_ADD,
        content: chunk.content,
        date: new Date().toISOString()
      };
    }

    // 报告生成完成
    yield {
      id: uuidv4(),
      type: SSEChunkType.TEXT,
      content: '巡检报告生成完成！',
      date: new Date().toISOString()
    };
  }

  /**
   * 拆分报告内容为多个chunk
   * @returns 报告块数组
   */
  private splitReportContent(): Array<{ content: string; delay: number }> {
    const currentTime = new Date().toLocaleString();
    
    return [
      {
        content: '# 系统巡检报告\n\n## 概要\n当前系统状态：**正常运行**',
        delay: 800
      },
      {
        content: '## 检查项目\n- [x] 服务器资源使用率\n- [x] 数据库连接状态\n- [x] 应用程序响应时间\n- [x] 网络连接状态\n- [x] 服务依赖检查\n- [ ] 日志错误分析',
        delay: 1000
      },
      {
        content: '## 系统架构图\n```mermaid\ngraph TD\n    A[用户请求] --> B[负载均衡器]\n    B --> C[Web服务器1]\n    B --> D[Web服务器2]\n    C --> E[应用服务器]\n    D --> E\n    E --> F[数据库主库]\n    E --> G[数据库从库]\n    E --> H[Redis缓存]\n    F --> I[备份系统]\n\n    style A fill:#e1f5fe\n    style B fill:#f3e5f5\n    style E fill:#e8f5e8\n    style F fill:#fff3e0\n    style H fill:#fce4ec\n```',
        delay: 1500
      },
      {
        content: '## 性能监控流程\n```mermaid\nflowchart LR\n    Start([开始监控]) --> Check{检查服务状态}\n    Check -->|正常| Monitor[持续监控]\n    Check -->|异常| Alert[发送告警]\n    Monitor --> Collect[收集指标]\n    Collect --> Analyze[分析数据]\n    Analyze --> Report[生成报告]\n    Alert --> Fix[修复问题]\n    Fix --> Check\n    Report --> Archive[归档数据]\n\n    style Start fill:#c8e6c9\n    style Alert fill:#ffcdd2\n    style Fix fill:#fff9c4\n```',
        delay: 1200
      },
      {
        content: '## 详细信息\n\n### CPU 使用率\n当前CPU使用率为 **25%**，属于正常范围。\n\n### 内存使用\n内存使用率为 **68%**，建议关注。',
        delay: 800
      },
      {
        content: '```mermaid\npie title 内存使用分布\n    "应用程序" : 45\n    "系统服务" : 23\n    "缓存" : 20\n    "空闲" : 12\n```',
        delay: 1000
      },
      {
        content: '### 磁盘空间\n磁盘使用率为 **45%**，状态良好。\n\n### 网络状态\n网络延迟平均为 **2ms**，连接稳定。',
        delay: 600
      },
      {
        content: '## 系统状态时序图\n```mermaid\nsequenceDiagram\n    participant U as 用户\n    participant W as Web服务\n    participant A as 应用服务\n    participant D as 数据库\n    participant C as 缓存\n\n    U->>W: 发送请求\n    W->>A: 转发请求\n    A->>C: 查询缓存\n    alt 缓存命中\n        C->>A: 返回缓存数据\n    else 缓存未命中\n        A->>D: 查询数据库\n        D->>A: 返回数据\n        A->>C: 更新缓存\n    end\n    A->>W: 返回结果\n    W->>U: 响应用户\n```',
        delay: 1800
      },
      {
        content: '## 告警级别\n```mermaid\ngitgraph\n    commit id: "正常"\n    commit id: "轻微告警"\n    branch warning\n    checkout warning\n    commit id: "中等告警"\n    commit id: "严重告警"\n    checkout main\n    merge warning\n    commit id: "恢复正常"\n```',
        delay: 1000
      },
      {
        content: '## 巡检结果总结\n\n| 检查项目 | 状态 | 详情 |\n|---------|------|------|\n| CPU使用率 | ✅ 正常 | 25% |\n| 内存使用 | ⚠️ 关注 | 68% |\n| 磁盘空间 | ✅ 正常 | 45% |\n| 网络延迟 | ✅ 正常 | 2ms |\n| 数据库连接 | ✅ 正常 | 连接池正常 |',
        delay: 1200
      },
      {
        content: '### 建议措施\n1. **内存优化**：建议清理不必要的缓存数据\n2. **性能监控**：继续保持24小时监控\n3. **备份检查**：确保备份系统正常运行\n\n> **注意**: 系统整体运行良好，建议定期进行性能优化。',
        delay: 800
      },
      {
        content: `---\n*报告生成时间：${currentTime}*\n*巡检执行人：AI智能助手*`,
        delay: 500
      }
    ];
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