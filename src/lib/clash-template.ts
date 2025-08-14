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
  'client-fingerprint'?: string
  tfo?: boolean
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
    const fields: string[] = []

    const pushKV = (k: string, v: string | number | boolean | undefined | null) => {
      if (v === undefined || v === null) return
      fields.push(`${k}: ${ClashTemplate.escapeYaml(v)}`)
    }

    // 顺序按用户期望
    pushKV('name', p.name)
    pushKV('server', p.server)
    pushKV('port', p.port)
    pushKV('client-fingerprint', p['client-fingerprint'] ?? 'chrome')
    pushKV('type', p.type)
    pushKV('cipher', p.cipher)
    pushKV('password', p.password)
    pushKV('tfo', p.tfo ?? false)

    if (p.plugin === 'obfs' && p['plugin-opts']) {
      pushKV('plugin', 'obfs')
      const pluginFields: string[] = []
      if (p['plugin-opts'].mode) pluginFields.push(`mode: ${ClashTemplate.escapeYaml(p['plugin-opts'].mode)}`)
      if (p['plugin-opts'].host) pluginFields.push(`host: ${ClashTemplate.escapeYaml(p['plugin-opts'].host)}`)
      if (pluginFields.length > 0) {
        fields.push(`plugin-opts: {${pluginFields.join(', ')}}`)
      }
    }

    // 生成单行 inline map，并在前面缩进两个空格，确保在 proxies: 下是有效列表项
    return `  - {${fields.join(', ')}}`
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


