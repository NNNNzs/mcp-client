# 巡检API接口文档

## 概述

巡检API提供了三个主要接口，用于系统巡检流程的管理：

1. **开始巡检** - 创建新的巡检会话
2. **SSE数据流** - 获取实时巡检数据
3. **确认操作** - 处理用户确认或拒绝

## 接口详情

### 1. 开始巡检

**接口路径：** `POST /api/inspection/start`

**请求体：**
```json
{
  "systemId": "system-001"
}
```

**响应：**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. SSE数据流

**接口路径：** `GET /api/inspection/stream?sessionId={sessionId}`

**响应格式：** Server-Sent Events (SSE)

**数据格式：**
```
data: {"id":"chunk-001","type":"THINK","content":"正在分析系统状态...","date":"2024-01-01T00:00:00.000Z"}

data: {"id":"chunk-002","type":"CALL-CONFIRM","content":"是否要调用MCP工具？","date":"2024-01-01T00:00:00.000Z"}

data: {"id":"chunk-003","type":"MCP-RESULT","content":"{\"cpu\":\"75%\"}","date":"2024-01-01T00:00:00.000Z"}

data: {"id":"chunk-004","type":"TEXT","content":"巡检完成","date":"2024-01-01T00:00:00.000Z"}
```

**数据类型说明：**
- `THINK` - AI思考过程
- `CALL-CONFIRM` - 需要用户确认的操作
- `MCP-RESULT` - MCP工具调用结果
- `TEXT` - 普通文本消息

### 3. 确认操作

**接口路径：** `POST /api/inspection/confirm`

**请求体：**
```json
{
  "chunkId": "chunk-002",
  "confirmed": true,
  "note": "用户同意执行操作"
}
```

**响应：**
```json
{
  "success": true,
  "message": "操作确认成功"
}
```

### 4. 获取会话状态

**接口路径：** `GET /api/inspection/session/{sessionId}`

**响应：**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "systemId": "system-001",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "pendingChunkId": "chunk-002"
}
```

**状态说明：**
- `active` - 巡检进行中
- `waiting` - 等待用户确认
- `completed` - 巡检完成
- `failed` - 巡检失败

## 使用示例

### JavaScript示例

```javascript
// 1. 开始巡检
const response = await fetch('/api/inspection/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ systemId: 'system-001' })
});
const { sessionId } = await response.json();

// 2. 监听SSE数据流
const eventSource = new EventSource(`/api/inspection/stream?sessionId=${sessionId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到数据:', data);
  
  // 如果需要确认
  if (data.type === 'CALL-CONFIRM') {
    // 用户确认后调用确认接口
    fetch('/api/inspection/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunkId: data.id,
        confirmed: true
      })
    });
  }
};
```

### curl示例

```bash
# 开始巡检
curl -X POST http://localhost:3000/api/inspection/start \
  -H "Content-Type: application/json" \
  -d '{"systemId": "system-001"}'

# 获取SSE流（在新终端中运行）
curl -N http://localhost:3000/api/inspection/stream?sessionId=your-session-id

# 确认操作
curl -X POST http://localhost:3000/api/inspection/confirm \
  -H "Content-Type: application/json" \
  -d '{"chunkId": "your-chunk-id", "confirmed": true}'
```

## 错误处理

所有接口都会返回标准的HTTP状态码：

- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器内部错误

错误响应格式：
```json
{
  "error": "错误描述信息"
}
``` 