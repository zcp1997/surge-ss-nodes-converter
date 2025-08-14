export type ClashProxy = {
  name: string
  type: 'ss'
  server: string
  port: number
  cipher: string
  password: string
  udp?: boolean
  plugin?: 'obfs'
  'plugin-opts'?: {
    mode?: 'http' | 'tls'
    host?: string
  }
}

/**
 * 用于生成 Clash 配置文本的模板类
 * 仅注入动态的 proxies 与 proxy-groups 的代理名称列表
 */
export class ClashTemplate {
  /**
   * 生成最终的 YAML 文本
   */
  static build(proxies: ClashProxy[]): string {
    const proxyNames = proxies.map(p => p.name)

    const proxiesYaml = proxies
      .map(p => ClashTemplate.proxyToYaml(p))
      .join('\n')

    const groupProxyNamesYaml = proxyNames.map(n => `    - ${ClashTemplate.escapeYaml(n)}`).join('\n')

    // 基础模板，按用户提供内容整理，仅保留通用部分
    // 动态部分：proxies 与 proxy-groups 中的 proxies 列表
    return [
      'port: 7890',
      'allow-lan: true',
      'mode: rule',
      'log-level: info',
      'unified-delay: true',
      'global-client-fingerprint: chrome',
      'dns:',
      '  enable: true',
      '  listen: :53',
      '  ipv6: true',
      '  enhanced-mode: fake-ip',
      '  fake-ip-range: 198.18.0.1/16',
      '  default-nameserver:',
      '    - 223.5.5.5',
      '    - 114.114.114.114',
      '    - 8.8.8.8',
      '  nameserver:',
      '    - https://dns.alidns.com/dns-query',
      '    - https://doh.pub/dns-query',
      '  fallback:',
      '    - https://1.0.0.1/dns-query',
      '    - tls://dns.google',
      '  fallback-filter:',
      '    geoip: true',
      '    geoip-code: CN',
      '    ipcidr:',
      '      - 240.0.0.0/4',
      '',
      '# 根据解析出的节点动态生成',
      'proxies:',
      proxiesYaml ? proxiesYaml : '  []',
      '',
      'proxy-groups:',
      '- name: 负载均衡',
      '  type: load-balance',
      '  url: http://www.gstatic.com/generate_204',
      '  interval: 300',
      '  proxies:',
      groupProxyNamesYaml || '    - DIRECT',
      '',
      '- name: 自动选择',
      '  type: url-test',
      '  url: http://www.gstatic.com/generate_204',
      '  interval: 300',
      '  tolerance: 50',
      '  proxies:',
      groupProxyNamesYaml || '    - DIRECT',
      '',
      '- name: "🌍选择代理"',
      '  type: select',
      '  proxies:',
      '    - 负载均衡',
      '    - 自动选择',
      '    - DIRECT',
      groupProxyNamesYaml,
      '',
      'rules:',
      '  - GEOIP,LAN,DIRECT',
      '  - GEOIP,CN,DIRECT',
      '  - MATCH,🌍选择代理',
      ''
    ].join('\n')
  }

  private static proxyToYaml(p: ClashProxy): string {
    const lines: string[] = []
    lines.push(`- name: ${ClashTemplate.escapeYaml(p.name)}`)
    lines.push(`  type: ${p.type}`)
    lines.push(`  server: ${ClashTemplate.escapeYaml(p.server)}`)
    lines.push(`  port: ${p.port}`)
    lines.push(`  cipher: ${ClashTemplate.escapeYaml(p.cipher)}`)
    lines.push(`  password: ${ClashTemplate.escapeYaml(p.password)}`)
    lines.push(`  udp: ${p.udp === false ? 'false' : 'true'}`)

    if (p.plugin === 'obfs' && p['plugin-opts']) {
      lines.push('  plugin: obfs')
      lines.push('  plugin-opts:')
      if (p['plugin-opts'].mode) {
        lines.push(`    mode: ${ClashTemplate.escapeYaml(p['plugin-opts'].mode)}`)
      }
      if (p['plugin-opts'].host) {
        lines.push(`    host: ${ClashTemplate.escapeYaml(p['plugin-opts'].host)}`)
      }
    }

    // 缩进到 proxies: 之下，YAML 需要在 key 下至少多两个空格
    return lines.map((l) => `  ${l}`).join('\n')
  }

  private static escapeYaml(value: string | number | boolean | undefined | null): string {
    if (value === undefined || value === null) return ''
    const str = String(value)
    // 简单处理：若包含需转义字符或以数字/特殊符号开头，则包裹引号
    if (/[:#\-]|^\s|\s$|^\d|["']/.test(str)) {
      return JSON.stringify(str)
    }
    return str
  }
}


