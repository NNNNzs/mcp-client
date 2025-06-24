/**
 * 巡检相关类型定义
 * @author nnnnzs
 */

/**
 * SSE数据块类型枚举
 */
export enum SSEChunkType {
  THINK = 'THINK',
  CALL_CONFIRM = 'CALL-CONFIRM',
  MCP_RESULT = 'MCP-RESULT',
  TEXT = 'TEXT',
  REPORT_ADD = 'REPORT',
  END = 'END'
}

/**
 * SSE数据块接口
 */
export interface SSEChunk {
  /** 唯一标识符 */
  id: string;
  /** 数据类型 */
  type: SSEChunkType;
  /** 数据内容 */
  content: string;
  /** 创建时间 */
  date: string;
}

/**
 * 巡检会话接口
 */
export interface InspectionSession {
  /** 会话ID */
  sessionId: string;
  /** 系统ID */
  systemId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 当前状态 */
  status: 'active' | 'waiting' | 'completed' | 'failed';
  /** 待确认的chunk ID */
  pendingChunkId?: string;
}

/**
 * 开始巡检请求接口
 */
export interface StartInspectionRequest {
  /** 系统ID */
  systemId: string;
}

/**
 * 开始巡检响应接口
 */
export interface StartInspectionResponse {
  /** 会话ID */
  sessionId: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 确认操作请求接口
 */
export interface ConfirmActionRequest {
  /** chunk ID */
  chunkId: string;
  /** 是否确认 */
  confirmed: boolean;
  /** 备注信息 */
  note?: string;
}

/**
 * 确认操作响应接口
 */
export interface ConfirmActionResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
} 