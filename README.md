## 🧠 How to work with code assistants (Claude/others)
**Start here**: `architecture/AI_BRIEF.md`（总览/不变式/数据流）  
**Interfaces**: `contracts/` 是 API/事件契约的 **唯一真源**  
**Module facts**: 各模块应有 `MODULE_FACTS.md`（职责/入口/下游/不变式/常见坑）  
**Repo map**: `architecture/repomap.md`（符号→文件/跨文件关系）  
**Traces**: `architecture/traces/`（关键用户旅程真实调用链）
**Changes**: `docs/CHANGELOG.md`（记录最新代码改动）

### Guardrails
- ❗修改 `assets/`, `public/`, `*.svg/png/ico` 等静态资源，PR 中必须注明：`Static-Change: APPROVED-BY-<name>`
- 每个 PR 必须包含：
  1) **影响面**（入口路由/下游依赖/共享数据）
  2) **不变式检查**（如何保持不变式）
  3) **回归用例**（新增或指明覆盖的测试）
- 修复流程：先列“入口/下游/共享数据（3–7行）”，再给根因假设与验证方法，最后提供**最小修复**的 diff 与回归点。

# AI 协作规范（README 版｜最终稿）

**Guideline Version: 2025-09-16**

本项目允许 AI 直接写代码与提交；为避免误操作，请严格遵守以下规则。静态文件可改，但必须先征得所有者（我）的同意。

## 0. 工作方式（默认流程）
1. 在分支 `ai/<feature>` 上开发并提交（如 `ai/login-form`）。
2. 每次提交前，请先输出变更计划与受影响文件清单。
3. 如涉及需要同意的改动（见 §2），先发起授权请求，等待我回复；得到同意后再执行改动并提交。
4. 代码就绪后，创建 PR（或提示我创建）。PR 描述中附上：动机、变更点、风险、回滚方式。

## 1. 允许直接改动（无需同意）
* `src/**` 应用源码
* `tests/**` 测试
* `scripts/**` 开发/构建脚本（不含发布密钥）
* 配置：`*.config.*`, `.editorconfig`, eslint/prettier 等不涉及密钥与锁文件的配置
* 文档：`docs/**`（不含品牌手册与对外法务文件）

**要求**：仅改与当前功能相关的最小差异；避免无意义的批量格式化、重排。

## 2. 需要征得同意才可执行
先发起"授权请求"，得到我的明确文本同意后再修改与提交。

### 2.1 静态与品牌资产（必须先同意）
* 路径：`public/**`, `assets/**`, `static/**`
* 类型：`*.png`, `*.jpg`, `*.jpeg`, `*.svg`, `*.ico`, `*.icns`, `*.webp`, 字体、音频/视频、品牌色值、favicon、App 图标

### 2.2 对外可见标识与对外承诺（必须先同意）
* 项目/包名、应用名称、Bundle ID / ApplicationId、可见版权与 License 文案、对外协议/政策

### 2.3 可能影响稳定性的动作（必须先同意）
* 锁文件：`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`（除非是专门的依赖升级任务）
* 发布流水线/CI：`.github/workflows/**`, `Dockerfile`, `deploy/**`
* 数据结构/迁移：破坏性数据库迁移、公共 API 变更

若只是建议更换某静态资源或流程，请先给出方案与预期收益，不要直接改。

## 3. 高风险动作（默认禁止，除非我给出"高级同意"）
* Git 远程与分支策略变动（`git remote set-url`, 删除/强推分支等）
* 仓库重命名、目录大规模重构、历史改写（`git rebase -i`、`git filter-repo` 等）
* 秘钥与凭证（任何 `.env*`、云密钥、证书）

若确有必要，请先给出影响评估与回滚方案，等待我回复 `APPROVE INFRA:` 才能执行。

## 4. 授权请求与同意——固定话术
当你需要我的同意时，请严格使用以下格式向我发起请求（不要执行写入）：

### （AI 发起）授权请求模板
```
CONSENT REQUEST [TYPE: STATIC]
Reason: <为什么需要改>
Files: <逐项列出将修改/新增/删除的文件路径>
Impact: <影响范围与可见性>
Fallback: <如果不同意的替代方案>
```

**TYPE 取值**：
* `STATIC`（静态/品牌资产）
* `IDENTITY`（名称/包名/对外文案）
* `STABILITY`（锁文件/CI/部署/API 破坏性变更）
* `INFRA`（高风险基础设施）

### （我回复）同意或拒绝模板
```
APPROVE STATIC: <精确文件列表或"ALL LISTED">
```
或
```
DENY: <简单原因>
```

只有在收到 `APPROVE <TYPE> ...` 的明确文本后，你才可以执行相应改动与提交。

## 5. 输出与提交要求
* **先计划、后改动**：每次修改前先输出 ①目的 ②方案 ③受影响文件 ④风险/回滚。
* **补丁优先**：能以统一补丁（unified diff）展示的，优先给出补丁供确认。
* **提交信息**：使用简洁英文的 Conventional Commits（如 `feat: ...`, `fix: ...`）。
* **最小可运行**：新增功能需附最小测试或可运行示例（脚本/说明皆可）。
* **避免骚操作**：不得随意格式化整个仓库、移动大量文件、改动与当前任务无关的资源。

## 6. 出错后的自救（仅做参考）
* 丢弃工作区改动：`git restore .`
* 丢弃已暂存改动：`git restore --staged .`
* 恢复指定文件到上次提交：`git checkout -- <path>`
* 查看远程设置：`git remote -v`（误改时请先发起 INFRA 请求）

---

**强提醒**：如果没有收到"APPROVE …"的明确文本，只能提出方案，不得修改对应文件。

---

<div align="center" width="100%">
    <img src="./saasfly-logo.svg" width="128" alt="" />
</div>

# Saasfly </br>
<a href="https://trendshift.io/repositories/8929" target="_blank"><img src="https://trendshift.io/api/badge/repositories/8929" alt="saasfly%2Fsaasfly | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

[![GitHub Actions Workflow Status][check-workflow-badge]][check-workflow-badge-link] [![GitHub License][github-license-badge]][github-license-badge-link]  [![Discord][discord-badge]][discord-badge-link] [![Saasfly][made-by-nextify-badge]][made-by-nextify-badge-link]
[![Chinese](https://img.shields.io/badge/-Chinese-red.svg)](README_zh.md)
[![German](https://img.shields.io/badge/-German-yellow.svg)](README_de.md)
[![Vietnamese](https://img.shields.io/badge/-Vietnamese-yellow.svg)](README_vi.md) </br>
![COMMIT_ACTIVITY](https://img.shields.io/github/commit-activity/m/saasfly/saasfly?style=for-the-badge">)
[![Visitors](https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fsaasfly%2Fsaasfly&labelColor=%23f47373&countColor=%23263759)](https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Fsaasfly%2Fsaasfly)

An easy-to-use and enterprise-grade Next.js boilerplate.

You don't need to buy templates anymore; Saasfly provides a complete, open-source solution for building SaaS applications quickly and easily.

> **[Nextify](https://nextify.ltd)** provides a complete Enterprise SaaS solution. Contact us at [contact@nextify.ltd](mailto:contact@nextify.ltd) if you're interested in discussing your project, or if you'd simply like to have a conversation with us, please feel free to reach out.

> ❤️ We provide **free technical support and deployment services to non-profit organizations**.
>
> 🙌 All profits obtained from our open source projects will be **entirely dedicated to supporting open source initiatives and charitable causes**.

## ⚡ Live Demo

Try it out for yourself!

Demo Server (Location: Washington - USA): <https://show.saasfly.io>

See more documentation at <https://document.saasfly.io>

## 🌟 Star History

[![Star History Chart](https://app.repohistory.com/api/svg?repo=saasfly/saasfly&type=Timeline)](https://repohistory.com)

## Sponsors

<table>
  <tr>
   <td style="width: 64px;">
      <a href="https://libra.dev/">
        <div style="width: 64px;">
          <img alt="Clerk" src="https://raw.githubusercontent.com/nextify-limited/libra/main/logo.svg">
        </div>
      </a>
    </td>
    <td style="width: 64px;">
      <a href="https://go.clerk.com/uKDp7Au">
        <div style="width: 64px;">
          <img alt="Clerk" src="/clerk.png">
        </div>
      </a>
    </td>
    <td style="width: 64px;">
      <a href="https://www.twillot.com/">
        <div style="width: 64px;">
          <img alt="Take Control of All Your Twitter Assets" src="/twillot.png">
        </div>
      </a>
    </td>
    <td style="width: 64px;">
      <a href="https://www.setupyourpay.com/" title="如何注册美国公司进行收款">
        <div style="width: 64px;">
          <img alt="全球收款手册" src="/setupyourpay.png">
        </div>
      </a>
    </td>
  </tr>
</table>

<a href="mailto:contact@nextify.ltd">
  Add your logo here
</a>

## 🚀 Getting Started

### 🖱 One Click Template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsaasfly%2Fsaasfly&env=NEXT_PUBLIC_APP_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,STRIPE_API_KEY,STRIPE_WEBHOOK_SECRET,POSTGRES_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,RESEND_API_KEY,RESEND_FROM&install-command=bun%20install&build-command=bun%20run%20build&root-directory=apps%2Fnextjs)

### 📋 Prerequisites

Before you start, make sure you have the following installed:

1. [Bun](https://bun.sh/) & [Node.js](https://nodejs.org/) & [Git](https://git-scm.com/)

   1. Linux

    ```bash
      curl -sL https://gist.github.com/tianzx/874662fb204d32390bc2f2e9e4d2df0a/raw -o ~/downloaded_script.sh && chmod +x ~/downloaded_script.sh && source ~/downloaded_script.sh
    ```

   2. MacOS

    ```bash
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      brew install git
      brew install oven-sh/bun/bun
      brew install nvm
    ```

2. [PostgreSQL](https://www.postgresql.org/)
   1. You can use Vercel Postgres or a local PostgreSQL server(add POSTGRES_URL env in .env.local)
      ```bash
         POSTGRES_URL = ''
      ```

### Installation

To get started with this boilerplate, we offer two options:

1. Use the `bun create` command(🌟Strongly recommend🌟):

```bash
bun create saasfly 
```

2. Manually clone the repository:

```bash
git clone https://github.com/saasfly/saasfly.git
cd saasfly
bun install
```

### Setup

Follow these steps to set up your project:

1. Set up the environment variables:

```bash
cp .env.example .env.local
// (you must have a database prepared before running this command)
bun db:push
```

2. Run the development server:

```bash
bun run dev:web
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

4. (Optional alpha)`bun run tailwind-config-viewer` Open [http://localhost:3333](http://localhost:3333) in your browser to see your Tailwind CSS configuration

### Other Notes

We are using Clerk as the default authentication provider after 1st June 2025.

You can find the NextAuth implementation here ( https://github.com/saasfly/saasfly/tree/feature-nextauth ) .


## 🥺 Project Roadmap

1. Admin Dashboard Page (in alpha !!!)
    1. Only provide static page now and we plan to integrate with headless arch
    2. You can provide your admin account and change **ADMIN_EMAIL="admin@saasfly.io,root@saasfly.io"** in .env.local and access host:port/admin/dashboard
    3. Based on security concerns, we will not provide online demos for the time being.
2. Consider integrating Payload CMS.

## ⭐ Features

### 🐭 Frameworks

- **[Next.js](https://nextjs.org/)** - The React Framework for the Web (with **App Directory**)
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication for Next.js
- **[Kysely](https://kysely.dev/)** - The type-safe SQL query builder for TypeScript
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM for Node.js and TypeScript, used as a schema management tool
- **[React-email](https://react.email/)** - A React renderer for creating beautiful emails using React components

### 🐮 Platforms

- **[Clerk](https://go.clerk.com/uKDp7Au)** - The most comprehensive User Management Platform
- **[Vercel](https://vercel.com/)** – Deploy your Next.js app with ease
- **[Stripe](https://stripe.com/)** – Payment processing for internet businesses
- **[Resend](https://resend.com/)** – Email marketing platform for developers

### 🐯 Enterprise Features

- **[i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)** - Support for internationalization
- **[SEO](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)** - Search engine optimization
- **[MonoRepo](https://turbo.build/)** - Monorepo for better code management
- **[T3 Env](https://env.t3.gg/)** - Manage your environment variables with ease

### 🐰 Data Fetching

- **[trpc](https://trpc.io/)** – End-to-end typesafe APIs made easy
- **[tanstack/react-query](https://react-query.tanstack.com/)** – Hooks for fetching, caching and updating asynchronous data in React

### 🐲 Global State Management

- **[Zustand](https://zustand.surge.sh/)** – Small, fast and scalable state management for React

### 🐒 UI

- **[Tailwind CSS](https://tailwindcss.com/)** – Utility-first CSS framework for rapid UI development
- **[Shadcn/ui](https://ui.shadcn.com/)** – Re-usable components built using Radix UI and Tailwind CSS
- **[Framer Motion](https://framer.com/motion)** – Motion library for React to animate components with ease
- **[Lucide](https://lucide.dev/)** – Beautifully simple, pixel-perfect icons
- **[next/font](https://nextjs.org/docs/basic-features/font-optimization)** – Optimize custom fonts and remove external network requests for improved performance

### 🐴 Code Quality

- **[TypeScript](https://www.typescriptlang.org/)** – Static type checker for end-to-end type safety
- **[Prettier](https://prettier.io/)** – Opinionated code formatter for consistent code style
- **[ESLint](https://eslint.org/)** – Pluggable linter for Next.js and TypeScript
- **[Husky](https://typicode.github.io/husky)** – Git hooks made easy

### 🐑 Performance

- **[Vercel Analytics](https://vercel.com/analytics)** – Real-time performance metrics for your Next.js app
- **[bun.sh](https://bun.sh/)** – npm alternative for faster and more reliable package management

### 🐘 Database

- **[PostgreSQL](https://www.postgresql.org/)** – The world's most advanced open source database

## 📦 Apps and Packages

- `web`: The main Next.js application
- `ui`: Shared UI components
- `db`: Database schema and utilities
- `auth`: Authentication utilities
- `email`: Email templates and utilities

## 📜 License

This project is licensed under the MIT License. For more information, see the [LICENSE](./LICENSE) file.

## 🙏 Credits

This project was inspired by shadcn's [Taxonomy](https://github.com/shadcn-ui/taxonomy) and t3-oss's [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).

## 👨‍💻 Contributors

<a href="https://github.com/saasfly/saasfly/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=saasfly/saasfly" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

<!-- Badges and links -->

[check-workflow-badge]: https://img.shields.io/github/actions/workflow/status/saasfly/saasfly/ci.yml?label=ci
[github-license-badge]: https://img.shields.io/badge/License-MIT-green.svg
[discord-badge]: https://img.shields.io/discord/1204690198382911488?color=7b8dcd&link=https%3A%2F%2Fsaasfly.io%2Fdiscord
[made-by-nextify-badge]: https://img.shields.io/badge/made_by-nextify-blue?color=FF782B&link=https://nextify.ltd/

[check-workflow-badge-link]: https://github.com/saasfly/saasfly/actions/workflows/check.yml
[github-license-badge-link]: https://github.com/saasfly/saasfly/blob/main/LICENSE
[discord-badge-link]: https://discord.gg/8SwSX43wnD
[made-by-nextify-badge-link]: https://nextify.ltd
