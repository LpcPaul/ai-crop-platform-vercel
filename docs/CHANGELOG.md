# 变更记录

## 未发布
- 修复 `POST /api/crop/analyze` 在服务端依赖 DOM `Image` 导致崩溃的问题，改为使用 `image-size` 解析真实宽高，并在无法读取尺寸时返回 400。
- 基于真实图片尺寸驱动 AI 解析与回退逻辑，避免固定 1200x800 带来的裁剪错误。
- 为缓存层引入可选的 Redis 客户端实现，修复启用标志无效的问题，并在 Redis 不可用时自动降级至内存缓存。
- 更正 Redis `setex` TTL 单位，避免 3600 秒被截断为 3 秒的缓存有效期。
- 新增共享限流工具，优先使用 Redis 进行跨实例计数，缺失 Redis 时回落到进程内存，以替换原先单节点 `Map`。
- 新增 `image-size` 与 `ioredis` 依赖以支持服务端图片解析与 Redis 缓存。
- 下载接口改用 `config.cropService.url`，避免线上环境仍指向 `localhost`。
- `Customer` 表新增 `authUserId` 唯一约束，并在 TRPC 插入逻辑使用 `ON CONFLICT DO NOTHING`，防止重复入驻。
- Admin 布局新增管理员鉴权与重定向，防止非管理员访问后台。
- 管理后台 GitHub 登录回跳地址基于当前 origin 生成，避免线上返回本地地址。
- 限流配置新增 `RATE_LIMIT_USE_REDIS` 开关，允许在未启用缓存的情况下独立使用 Redis 进行跨实例限流。
