# 巡检功能使用说明

## 概述

本项目现在包含了完整的巡检功能，支持实时的系统巡检流程，包括：

1. **巡检会话管理** - 创建和管理巡检会话
2. **实时数据流** - 通过SSE推送巡检进度
3. **用户交互确认** - 支持用户确认关键操作
4. **模拟数据生成** - 完整的模拟巡检流程

## 快速开始

### 1. 启动服务器

```bash
# 编译项目
pnpm build

# 启动服务器
pnpm start
```

服务器启动后，你会看到类似以下的输出：
```
服务器已启动，监听端口 3000
巡检测试页面: http://localhost:3000/inspection-test.html
```

### 2. 使用测试页面

打开浏览器访问 `http://localhost:3000/inspection-test.html`

这是一个完整的测试界面，包含：
- 创建巡检会话
- 实时SSE数据流监控
- 交互式确认操作
- 完整的日志显示

### 3. API接口测试

你也可以直接使用API接口：

#### 创建巡检会话
```bash
curl -X POST http://localhost:3000/api/inspection/start \
  -H "Content-Type: application/json" \
  -d '{"systemId": "system-001"}'
```

#### 监听SSE数据流
```bash
curl -N http://localhost:3000/api/inspection/stream?sessionId=your-session-id
```

#### 确认操作
```bash
curl -X POST http://localhost:3000/api/inspection/confirm \
  -H "Content-Type: application/json" \
  -d '{"chunkId": "your-chunk-id", "confirmed": true}'
```

## 功能特性

### 📡 实时数据流
- 使用Server-Sent Events (SSE) 技术
- 支持多种数据类型：THINK、CALL-CONFIRM、MCP-RESULT、TEXT
- 自动重连和错误处理

### 🤝 用户交互
- 智能等待用户确认
- 超时自动处理
- 支持用户备注信息

### 🔄 会话管理
- 唯一会话ID管理
- 会话状态跟踪
- 自动清理过期会话

### 🎭 模拟数据
包含完整的模拟巡检流程：
1. 系统状态分析
2. 性能监控数据获取
3. 用户确认MCP工具调用
4. 生成优化建议
5. 执行优化脚本确认

## 数据格式

### SSE数据块格式
```json
{
  "id": "unique-chunk-id",
  "type": "THINK|CALL-CONFIRM|MCP-RESULT|TEXT",
  "content": "数据内容",
  "date": "2024-01-01T00:00:00.000Z"
}
```

### 会话状态
- `active` - 巡检进行中
- `waiting` - 等待用户确认
- `completed` - 巡检完成
- `failed` - 巡检失败

## 开发扩展

### 添加新的巡检步骤

编辑 `src/services/inspection-service.ts` 中的 `inspectionSteps` 数组：

```typescript
{
  type: SSEChunkType.TEXT,
  content: '你的巡检步骤描述',
  delay: 1000,
  requiresConfirmation: false // 是否需要用户确认
}
```

### 集成真实的MCP工具

在 `generateInspectionStream` 方法中，将模拟的MCP调用替换为真实的工具调用：

```typescript
// 替换模拟数据
const mcpResult = await client.callTool({
  name: 'your-tool-name',
  arguments: { /* your args */ }
});
```

### 自定义数据类型

在 `src/types/inspection.ts` 中添加新的数据类型：

```typescript
export enum SSEChunkType {
  // ... 现有类型
  YOUR_NEW_TYPE = 'YOUR_NEW_TYPE'
}
```

## 项目结构

```
src/
├── types/
│   └── inspection.ts        # 类型定义
├── services/
│   └── inspection-service.ts # 巡检服务核心逻辑
├── routes/
│   └── inspection.ts        # API路由处理
├── docs/
│   └── inspection-api.md    # API文档
└── index.ts                 # 主程序（已集成巡检功能）

public/
└── inspection-test.html     # 测试页面
```

## 注意事项

1. **内存管理**: 服务会自动清理24小时以上的过期会话
2. **并发处理**: 支持多个会话同时进行
3. **错误处理**: 包含完整的错误处理和超时机制
4. **跨域支持**: 已配置CORS，支持前端跨域访问

## 故障排除

### 常见问题

1. **SSE连接失败**
   - 检查防火墙设置
   - 确认服务器正在运行
   - 检查浏览器控制台错误

2. **确认操作无响应**
   - 检查chunk ID是否正确
   - 确认操作是否已超时
   - 查看服务器日志

3. **会话不存在**
   - 确认会话ID正确
   - 检查会话是否已过期
   - 重新创建会话

## 下一步

这个巡检系统已经提供了完整的基础架构，你可以：

1. 集成真实的系统监控工具
2. 添加更多的巡检类型
3. 实现巡检报告生成
4. 添加用户权限管理
5. 集成通知系统

如有问题，请查看控制台日志或测试页面的实时日志输出。 