# Surge SS 节点转换器

一个现代化前端应用，用于将 Surge 配置中的 Shadowsocks 节点转换为 base64 编码格式。

## ✨ 功能特点

- 🚀 **批量转换**: 支持多行 Surge 节点配置批量转换
- 🎯 **智能解析**: 自动解析节点配置中的关键信息
- 📋 **一键复制**: 支持单个或批量复制转换结果
- 💾 **导出功能**: 可导出转换结果为文本文件
- 🔗 **订阅链接**: 生成本站托管的订阅链接，无需第三方服务
- 🎨 **现代化 UI**: 使用 TailwindCSS 和 shadcn 构建
- ⚡ **动画效果**: 流畅的动画提升用户体验

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: TailwindCSS
- **组件库**: shadcn
- **图标**: Lucide React
- **动画**: Framer Motion

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建项目

```bash
pnpm build
```

### 部署到 Vercel

项目已配置为可直接部署到 Vercel：

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 自动部署完成

## 📖 使用说明

### 输入格式

支持标准的 Surge 节点配置格式：

```
🇭🇰 HK01 = ss, example.com, 8443, encrypt-method=aes-128-gcm, password=1234567, ecn=true, udp-relay=true
```

### 输出格式

转换后生成标准的 SS URL 格式：

```
ss://YWVzLTEyOC1nY206MTIzNDU2N0BleGFtcGxlLmNvbTo4NDQz#%F0%9F%87%AD%F0%9F%87%B0%20HK01
```

## 🎯 项目特性

- **混合架构**: 节点解析在浏览器中完成，订阅链接由本站API提供
- **隐私安全**: 节点数据不会发送到第三方服务器，仅在生成订阅时使用本站API
- **自托管订阅**: 订阅链接由本站提供，无需依赖外部服务
- **性能优化**: 使用 Next.js 的最新特性优化性能