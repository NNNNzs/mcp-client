# 🤖 多智能体协同系统

基于现有MCP客户端项目实现的多智能体协同Demo系统，参考OpenManus设计理念，支持思考、工具调用和多智能体协作。系统采用SSE (Server-Sent Events) 流式接口设计，实时推送智能体的思考过程、工具调用结果和协作状态。

## ✨ 核心特性

- 🤖 **多智能体协同**: 支持多个智能体并行工作和协作
- 🔄 **流式响应**: 基于SSE的实时思考过程和执行状态推送
- 🛠️ **MCP工具集成**: 支持多种MCP工具和扩展
- 💭 **思考过程可视化**: 展示智能体的推理和决策过程
- 🎯 **任务自动分解**: 将复杂任务拆解为可执行步骤
- 📊 **状态管理**: 完整的执行状态跟踪和管理
- 🌐 **现代化前端**: 美观的Web界面，实时展示协作过程

## 🏗️ 技术栈

- **后端**: Node.js + TypeScript + Express
- **智能体框架**: 基于OpenManus架构设计
- **MCP集成**: @modelcontextprotocol/sdk
- **LLM**: OpenAI API (支持其他LLM)
- **通信协议**: SSE (Server-Sent Events)
- **前端**: 原生HTML/CSS/JavaScript
- **数据格式**: JSON

## 📁 项目结构

```
mcp-client/
├── docs/                    # 设计文档
│   ├── README.md           # 项目概述
│   ├── agent-design.md     # 智能体设计
│   ├── api-protocol.md     # API协议
│   └── flow-control.md     # 流程控制
├── src/                    # 源代码
│   ├── agents/             # 智能体实现
│   │   ├── BaseAgent.ts    # 基础智能体
│   │   ├── ReActAgent.ts   # ReAct智能体
│   │   └── PlannerAgent.ts # 规划智能体
│   ├── core/              # 核心模块
│   │   ├── Memory.ts      # 记忆系统
│   │   ├── LLMClient.ts   # LLM客户端
│   │   └── TaskManager.ts # 任务管理
│   ├── server/            # 服务器
│   │   └── app.ts         # Express应用
│   ├── types/             # 类型定义
│   │   └── index.ts       # 基础类型
│   ├── utils/             # 工具函数
│   │   ├── Logger.ts      # 日志工具
│   │   └── uuid.ts        # UUID生成
│   └── main.ts            # 程序入口
├── public/                # 静态文件
│   └── index.html         # 前端Demo
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
└── README.md             # 本文件
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，设置必要的环境变量：

```env
# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 3. 启动服务

```bash
# 构建项目
npm run build

# 启动服务器
npm start

# 或者使用开发模式（自动重启）
npm run dev
```

### 4. 访问Demo

打开浏览器访问：
- 前端Demo: http://localhost:3000/static/index.html
- 健康检查: http://localhost:3000/health
- API文档: 见下方API接口说明

## 📖 API接口

### 创建协同任务

```http
POST /api/v1/tasks/collaborate
Content-Type: application/json

{
  "task": "分析AI技术发展趋势并生成报告",
  "priority": "normal",
  "options": {
    "stream": true,
    "maxSteps": 10,
    "timeout": 300
  }
}
```

### SSE流式接口

```http
GET /api/v1/tasks/{taskId}/stream
```

支持的事件类型：
- `connected`: 连接建立
- `task_started`: 任务开始
- `agent_thinking`: 智能体思考
- `agent_action`: 智能体行动
- `task_completed`: 任务完成
- `task_failed`: 任务失败
- `heartbeat`: 心跳检测

### 获取任务状态

```http
GET /api/v1/tasks/{taskId}
```

## 🤖 智能体架构

系统采用分层的智能体设计：

```
应用层：具体业务智能体 (PlannerAgent, ExecutorAgent)
   ↓
框架层：智能体基础能力 (ToolCallAgent)
   ↓  
核心层：基础抽象 (ReActAgent)
   ↓
基础层：通用功能 (BaseAgent)
```

### 智能体类型

- **PlannerAgent**: 规划智能体，负责任务分析和计划制定
- **ExecutorAgent**: 执行智能体，负责具体工具调用和任务执行
- **MonitorAgent**: 监控智能体，负责状态监控和异常处理

## 🔄 执行流程

1. **任务接收**: 用户提交任务，系统验证并标准化
2. **任务规划**: 规划智能体分析任务，制定执行计划
3. **任务分配**: 根据计划分配给相应的执行智能体
4. **并行执行**: 多个智能体协同执行任务步骤
5. **状态监控**: 监控智能体跟踪执行状态和处理异常
6. **结果聚合**: 收集各智能体的执行结果并整合
7. **完成反馈**: 通过SSE实时推送执行过程和最终结果

## 🎯 Demo功能

前端Demo展示了完整的多智能体协同过程：

- **任务输入**: 支持复杂任务描述和优先级设置
- **实时监控**: 通过SSE实时显示智能体思考和行动过程
- **进度追踪**: 可视化任务执行进度和状态变化
- **结果展示**: 展示最终的执行计划和结果
- **统计信息**: 显示消息数量、思考次数等统计数据

## 🛠️ 开发指南

### 添加新的智能体

1. 继承 `ReActAgent` 或 `BaseAgent`
2. 实现 `think()` 和 `act()` 方法
3. 定义智能体的系统提示和配置
4. 在任务管理器中注册新智能体

### 扩展工具能力

1. 集成MCP工具到智能体配置
2. 在 `act()` 方法中调用相应工具
3. 处理工具执行结果和错误

### 自定义事件

1. 在类型定义中添加新的事件类型
2. 在智能体中发送自定义事件
3. 在前端处理新的事件类型

## 📋 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- OpenAI API Key (或其他支持的LLM API)

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 感谢 OpenManus 项目提供的智能体架构设计理念
- 感谢 OpenAI 提供的强大语言模型API
- 感谢 Model Context Protocol (MCP) 提供的工具集成框架

## 📞 联系方式

- 项目维护者: nnnnzs
- 项目地址: [https://github.com/nnnnzs/mcp-client](https://github.com/nnnnzs/mcp-client)

---

**🌟 如果这个项目对您有帮助，请给个Star！** 