# Prompt版本管理

## 📁 文件结构

```
prompts/
├── README.md                    # 本文件
├── v2.1-aesthetic.txt          # v2.1美学裁剪prompt
├── v2.1-platform.txt           # v2.1平台规范prompt
└── versions/                    # 历史版本存档
    ├── v2.0-aesthetic.txt
    └── v2.0-platform.txt
```

## 🏷️ 版本命名规范

格式: `v{major}.{minor}-{type}.txt`

- **major**: 主版本号，重大架构变更
- **minor**: 次版本号，功能优化和修复
- **type**: prompt类型 (`aesthetic` | `platform`)

## 📋 当前活跃版本

- **美学裁剪**: `v2.1-aesthetic.txt`
- **平台规范**: `v2.1-platform.txt`

## 🔄 版本更新流程

1. 创建新版本文件: `v{x}.{y}-{type}.txt`
2. 移动旧版本到 `versions/` 目录
3. 更新服务代码引用
4. 测试验证新prompt效果
5. 更新本README文档
6. 提交到Git仓库

## 📊 版本对比

### v2.1 vs v2.0 主要差异

| 方面 | v2.0 | v2.1 |
|------|------|------|
| API模型 | gpt-4-vision-preview | gpt-4.1-preview |
| 约束方式 | 详细美学原则列表 | 目标导向 + 具体案例 |
| 返回字段 | aesthetic_reason等3个 | 方案标题+效果2个 |
| quality_settings | 包含 | 移除 |
| 坐标约束 | 固定约束 | 动态约束 |
| temperature | 0.7 | 0.3 |

---

**最后更新**: 2024-09-12  
**维护者**: AI Crop Service Team