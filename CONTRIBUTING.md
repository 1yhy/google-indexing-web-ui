# Contributing to Google Indexing Web UI

感谢您对 Google Indexing Web UI 项目的贡献兴趣！在提交您的贡献之前，请确保仔细阅读以下指南。

## 行为准则

本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/version/2/0/code_of_conduct/) 行为准则。作为贡献者，您需要遵守这个准则。

## Pull Request 指南

- 从 `main` 分支创建新的特性分支
- 如果添加新功能：
  - 添加相应的测试用例
  - 提供添加此功能的合理理由
- 如果修复 bug：
  - 在 PR 中详细描述该 bug
  - 如果适用，添加适当的测试覆盖
- 确保测试通过
- 遵循现有的代码风格
- 编写有意义的提交信息

## 开发环境设置

1. Fork 仓库
2. 克隆你的 fork：
```bash
git clone https://github.com/<your-username>/google-indexing-web-ui.git
cd google-indexing-web-ui
```

3. 安装依赖：
```bash
pnpm install
```

4. 创建 `.env` 文件：
```bash
cp .env.example .env
```

5. 启动开发服务器：
```bash
pnpm dev
```

## 可用脚本

- `pnpm dev`: 启动开发服务器
- `pnpm build`: 构建生产版本
- `pnpm lint`: 运行代码检查
- `pnpm format`: 格式化代码
- `pnpm test`: 运行测试

## 提交更改

1. 创建新分支：
```bash
git checkout -b my-feature
```

2. 进行更改并提交：
```bash
git add .
git commit -m "feat: add some feature"
```

3. 推送到你的 fork：
```bash
git push origin my-feature
```

4. 提交 Pull Request

## 许可证

通过为 Google Indexing Web UI 做出贡献，您同意您的贡献将根据 MIT 许可证进行许可。
