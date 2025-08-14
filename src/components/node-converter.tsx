"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Copy,
  Download,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Link,
  Sparkles,
  Code2,
} from "lucide-react"
import { parseSurgeNodes, convertNodesToSSUrls, type SurgeNode } from "@/lib/surge-parser"
import { type ClashProxy } from "@/lib/clash-template"
import { cn } from "@/lib/utils"

export default function NodeConverter() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<{
    success: SurgeNode[]
    failed: string[]
    ssUrls: string[]
    skipped?: {
      comments: number
      duplicates: number
    }
  } | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [showRawResults, setShowRawResults] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleConvert = async () => {
    if (!input.trim()) return

    setIsConverting(true)

    // 添加一点延迟来展示加载动画
    await new Promise((resolve) => setTimeout(resolve, 500))

    const parseResult = parseSurgeNodes(input)
    const ssUrls = convertNodesToSSUrls(parseResult.success)

    setResults({
      success: parseResult.success,
      failed: parseResult.failed,
      ssUrls,
      skipped: parseResult.skipped
    })

    setIsConverting(false)
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccessMessage("已复制到剪贴板")
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  const handleCopyAll = async () => {
    if (!results?.ssUrls.length) return
    const allUrls = results.ssUrls.join("\n")
    try {
      await navigator.clipboard.writeText(allUrls)
      showSuccessMessage(`已复制 ${results.ssUrls.length} 个节点到剪贴板`)
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  const handleDownload = () => {
    if (!results?.ssUrls.length) return

    const content = results.ssUrls.join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ss-nodes.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showSuccessMessage("文件下载成功")
  }

  const handleGenerateSubscription = async () => {
    if (!results?.ssUrls.length) return

    // 将所有 SS URL 编码
    const encodedUrls = encodeURIComponent(results.ssUrls.join("\n"))

    // 使用当前网址生成订阅链接
    const currentUrl = window.location.origin
    const subscriptionUrl = `${currentUrl}/api/subscription?urls=${encodedUrls}`

    try {
      await navigator.clipboard.writeText(subscriptionUrl)
      showSuccessMessage("订阅链接已复制到剪贴板")
    } catch (err) {
      console.error("复制订阅链接失败:", err)
    }
  }

  const handleGenerateClashConfig = async () => {
    if (!results?.success.length) return

    // 将解析成功的 Surge 节点映射为 Clash proxies（仅 ss 协议）
    const proxies: ClashProxy[] = results.success.map((n) => {
      const proxy: ClashProxy = {
        name: n.name,
        type: 'ss',
        server: n.server,
        port: n.port,
        cipher: n.encryptMethod,
        password: n.password,
        udp: true,
      }
      if (n.obfs === 'http' || n.obfs === 'tls') {
        proxy.plugin = 'obfs'
        proxy['plugin-opts'] = { mode: n.obfs }
        if (n.obfsHost) proxy['plugin-opts'].host = n.obfsHost
      }
      return proxy
    })

    try {
      // 使用短 token 方案，避免 URL 过长
      const res = await fetch('/api/clash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies }),
      })
      if (!res.ok) throw new Error('生成 token 失败')
      const data: { token: string } = await res.json()
      const current = window.location.origin
      const url = `${current}/api/clash?t=${encodeURIComponent(data.token)}`

      await navigator.clipboard.writeText(url)
      window.open(url, '_blank')
      showSuccessMessage('Clash 配置链接已复制并在新标签打开')
    } catch (err) {
      console.error('生成 Clash 配置失败:', err)
    }
  }

  const handleClear = () => {
    setInput("")
    setResults(null)
  }

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 h-screen flex flex-col p-4">
        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className="fixed top-4 right-4 z-50"
            >
              <Alert className="glass-card text-white border-emerald-400/50 bg-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                <AlertDescription className="font-medium text-emerald-100">{successMessage}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 glass-card rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Surge SS 节点转换器</h1>
          </div>
          <p className="text-white/80 text-sm">将 Surge 配置的 SS 节点转换为 base64 编码格式</p>
        </motion.div>

        {/* Example formats - moved to top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card className="glass-card border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                节点示例
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                <div className="glass-button rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="w-4 h-4 text-blue-300" />
                    <span className="font-medium text-white">普通节点格式</span>
                  </div>
                  <code className="text-xs text-white/80 font-mono break-all">
                    🇭🇰 HK01 = ss, example.com, 8443, encrypt-method=aes-128-gcm, password=1234567, ecn=true,
                    udp-relay=true
                  </code>
                </div>

                <div className="glass-button rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="w-4 h-4 text-orange-300" />
                    <span className="font-medium text-white">obfs混淆格式</span>
                  </div>
                  <code className="text-xs text-white/80 font-mono break-all">
                    🇭🇰 HKG 01 = ss, example.com, 20001, encrypt-method=aes-128-gcm, password=1234567,
                    obfs=http, obfs-host=example.com
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col min-h-0"
          >
            <Card className="glass-card border-white/20 flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  输入配置
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3">
                <Textarea
                  placeholder="请粘贴您的 Surge 节点配置，每行一个节点..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 font-mono text-sm"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleConvert}
                    disabled={!input.trim() || isConverting}
                    className="flex-1 h-10 glass-button text-white border-white/30 hover:bg-white/20"
                  >
                    {isConverting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        转换中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        开始转换
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={!input && !results}
                    className="h-10 px-4 glass-button text-white border-white/30 hover:bg-white/20 bg-transparent"
                  >
                    清空
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col min-h-0"
          >
            <Card className="glass-card border-white/20 flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <div
                      className={cn("w-2 h-2 rounded-full", results ? "bg-blue-400 animate-pulse" : "bg-gray-400")}
                    ></div>
                    转换结果
                  </CardTitle>

                  {results && results.ssUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRawResults(!showRawResults)}
                        className="h-8 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
                        title={showRawResults ? "还原base64加密信息 SS URL" : "查看base64解密信息"}
                      >
                        {showRawResults ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showRawResults ? "还原base64加密信息" : "查看base64解密信息"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAll}
                        className="h-8 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
                        title="复制所有节点"
                      >
                        <Copy className="w-3 h-3" />
                        批量复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        className="h-8 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
                        title="下载为文件"
                      >
                        <Download className="w-3 h-3" />
                        文件导出
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateSubscription}
                        className="h-8 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
                        title="生成订阅链接"
                      >
                        <Link className="w-3 h-3" />
                        订阅链接
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateClashConfig}
                        className="h-8 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
                        title="生成 Clash 配置文件"
                      >
                        <Code2 className="w-3 h-3" />
                        Clash 配置
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  {!results ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center flex-1 text-white/60"
                    >
                      <Zap className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">等待转换...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden"
                    >
                      {/* Success Results */}
                      {results.success.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                          <div className="flex-shrink-0 mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="font-medium text-white text-sm">
                                成功转换 {results.success.length} 个节点
                              </span>
                            </div>
                            {results.skipped && (results.skipped.comments > 0 || results.skipped.duplicates > 0) && (
                              <div className="flex items-center gap-3 text-xs text-white/70 ml-6">
                                {results.skipped.comments > 0 && (
                                  <span className="flex items-center gap-1">
                                    📝 跳过注释: {results.skipped.comments}
                                  </span>
                                )}
                                {results.skipped.duplicates > 0 && (
                                  <span className="flex items-center gap-1">
                                    🔄 跳过重复: {results.skipped.duplicates}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {results.ssUrls.map((url, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group"
                              >
                                <div className="flex items-center gap-1 mb-1 flex-wrap">
                                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                                    {results.success[index].name}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-500/20 text-blue-200 border-blue-400/30"
                                  >
                                    {results.success[index].encryptMethod}
                                  </Badge>
                                  {results.success[index].obfs && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-orange-500/20 text-orange-200 border-orange-400/30"
                                    >
                                      obfs: {results.success[index].obfs}
                                    </Badge>
                                  )}
                                </div>

                                <div className="relative">
                                  <code
                                    className={cn(
                                      "block p-2 bg-white/10 rounded text-xs border border-white/20 group-hover:border-white/40 transition-colors break-all text-white/90",
                                      showRawResults ? "font-mono" : "",
                                    )}
                                  >
                                    {showRawResults
                                      ? `${results.success[index].encryptMethod}:${results.success[index].password}@${results.success[index].server}:${results.success[index].port}`
                                      : url}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white hover:bg-white/20"
                                    onClick={() => handleCopy(url)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Failed Results */}
                      {results.failed.length > 0 && (
                        <Alert className="bg-red-500/20 border-red-500/30 text-white flex-shrink-0 backdrop-blur-sm">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <AlertDescription>
                            <div className="font-medium mb-2 text-sm flex items-center gap-2 text-red-100">
                              ⚠️ 无法解析 {results.failed.length} 个节点
                            </div>
                            <div className="space-y-2 text-xs max-h-20 overflow-y-auto custom-scrollbar">
                              {results.failed.map((line, index) => (
                                <div key={index} className="bg-red-600/20 p-2 rounded border border-red-500/30">
                                  <div className="font-mono text-red-100 break-all">{line}</div>
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
