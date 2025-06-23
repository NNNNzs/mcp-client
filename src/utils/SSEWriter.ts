import { Response } from 'express';

/**
 * SSE响应写入器
 */
export class SSEWriter {
  private res: Response;

  constructor(res: Response) {
    this.res = res;
    this.setupHeaders();
  }

  /**
   * 设置 SSE 所需的响应头
   */
  private setupHeaders() {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
  }

  /**
   * 发送数据
   * @param data 要发送的数据
   */
  public send(data: any) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * 发送错误信息
   * @param error 错误信息
   */
  public sendError(error: string) {
    this.send({ error });
  }

  /**
   * 结束 SSE 连接
   */
  public end() {
    this.res.end();
  }
} 