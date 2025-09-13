# AI Image Crop Service

🎨 **智能图片裁剪服务** - 基于多AI模型的智能图片美学裁剪工具

## ✨ 功能特性

### 🤖 多AI模型支持
- **GPT-4.1** / **GPT-4.1 Mini** (2025-04-14)
- **GPT-5** / **GPT-5 Mini** (2025-08-07) 
- **ChatGPT-4o Latest**
- **Claude Opus 4.1** (2025-08-05)
- **Claude 3.7 Sonnet** (2025-02-19)
- **Gemini 2.5 Pro Preview** (06-05)

### 🎯 核心功能
- 🎨 **美学裁剪**: AI智能分析图片构图，提供最佳裁剪方案
- 📦 **批量处理**: 支持多张图片同时处理
- 🐛 **调试模式**: 可视化调试工具，支持自定义提示词
- 📊 **实时对比**: 原图与裁剪效果实时对比
- 💾 **历史记录**: 处理历史查询和文件管理

### 🛠️ 技术特性
- ⚡ **高性能**: Express.js + Sharp 图像处理
- 🔄 **版本管理**: 支持多版本提示词管理
- 🛡️ **容错机制**: 完整的错误处理和备用算法
- 📱 **响应式**: 自适应UI设计
- 🎛️ **可配置**: 支持多种参数调整

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/LpcPaul/ai-crop-service.git
cd ai-crop-service
```

2. **安装依赖**
```bash
npm install
```

3. **配置API密钥**
```bash
# 在 server.js 中配置你的 API 密钥
# 或创建 .env 文件
```

4. **启动服务**
```bash
npm start
```

5. **访问应用**
- 🌐 **主页**: http://localhost:3001
- 🐛 **调试工具**: http://localhost:3001/debug.html
- 📊 **API文档**: http://localhost:3001/api/health

## 📡 API 接口

### 美学裁剪
```http
POST /api/crop/aesthetic
Content-Type: multipart/form-data

参数:
- image: 图片文件
```

### 批量处理
```http
POST /api/crop/batch-aesthetic
Content-Type: multipart/form-data

参数:
- images: 图片文件数组 (最多20张)
```

### 调试接口
```http
POST /api/analyze-debug
Content-Type: multipart/form-data

参数:
- image: 图片文件
- model: AI模型名称
- prompt: 自定义提示词
```

### 文件下载
```http
GET /api/download/:filename
```

### 处理历史
```http
GET /api/history
```

## 🎮 使用方式

### 1. 调试工具
访问 `http://localhost:3001/debug.html` 使用可视化调试工具：
- 📤 拖拽上传图片
- 🤖 选择AI模型
- ✏️ 编辑System Prompt
- 🖼️ 查看裁剪效果对比

### 2. API调用
```javascript
// 美学裁剪示例
const formData = new FormData();
formData.append('image', imageFile);

fetch('/api/crop/aesthetic', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## 📁 项目结构

```
ai-crop-service/
├── server.js              # 主服务文件
├── debug.html              # 调试工具页面
├── package.json           # 项目配置
├── prompts/               # 提示词版本管理
│   ├── v0.5-aesthetic.txt
│   ├── v0.7-aesthetic.txt
│   └── ...
├── output/                # 输出文件目录
├── temp/                  # 临时文件目录
└── README.md              # 项目说明
```

## 🔧 配置说明

### 支持的图片格式
- JPEG / JPG
- PNG
- GIF
- WebP

### 环境变量
```env
PORT=3001                  # 服务端口
API_KEY=your_api_key      # AI服务API密钥
```

### 提示词版本
- `v0.5-aesthetic.txt`: 基础美学裁剪
- `v0.7-aesthetic.txt`: 增强版美学分析
- 支持自定义提示词模板

## 📊 性能特性

- ⚡ **响应速度**: GPT-5 Mini模式下平均响应时间 < 5秒
- 🔄 **容错处理**: 双重重试机制 + 备用算法
- 📈 **并发支持**: 支持多用户同时使用
- 💾 **内存优化**: 流式处理大文件

## 🎯 版本历史

### v2.2 (Latest)
- ➕ 添加多模型调试工具
- ⚡ 支持GPT-5 Mini快速响应
- 🎨 全新调试界面设计
- 🔧 通用AI分析函数

### v2.1
- 🤖 GPT-4.1集成和版本管理系统
- 📝 提示词优化

### v2.0
- 🏗️ 主要架构更新
- 🔧 GPT-4.1集成处理

## 🤝 贡献指南

欢迎提交 Issues 和 Pull Requests！

1. Fork 本项目
2. 创建特性分支
3. 提交你的更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 👥 作者

- **LpcPaul** - *初始开发* - [GitHub](https://github.com/LpcPaul)

---

⭐ 如果这个项目对你有帮助，请给个星标支持！