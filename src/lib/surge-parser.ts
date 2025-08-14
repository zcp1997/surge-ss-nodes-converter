export interface SurgeNode {
  name: string;
  type: string;
  server: string;
  port: number;
  encryptMethod: string;
  password: string;
  obfs?: string;
  obfsHost?: string;
}

// 支持的 Shadowsocks 加密方法
const SUPPORTED_ENCRYPT_METHODS = [
  // AEAD ciphers
  'aes-128-gcm',
  'aes-192-gcm',
  'aes-256-gcm',
  'chacha20-ietf-poly1305',
  'xchacha20-ietf-poly1305',
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
  '2022-blake3-chacha20-poly1305'
];

// 支持的混淆方法
const SUPPORTED_OBFS_METHODS = [
  'http',
  'tls',
  'plain'
];

/**
 * 验证服务器地址是否合法
 */
function isValidServer(server: string): boolean {
  if (!server || server.length === 0) return false;
  
  // 检查是否为有效的域名或IP地址
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return domainRegex.test(server) || ipv4Regex.test(server) || ipv6Regex.test(server);
}

/**
 * 验证端口是否合法
 */
function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * 验证加密方法是否支持
 */
function isValidEncryptMethod(method: string): boolean {
  return SUPPORTED_ENCRYPT_METHODS.includes(method.toLowerCase());
}

/**
 * 验证密码是否合法
 */
function isValidPassword(password: string): boolean {
  return Boolean(password && password.length > 0 && password.length <= 256);
}

/**
 * 验证混淆方法是否支持
 */
function isValidObfsMethod(method: string): boolean {
  return SUPPORTED_OBFS_METHODS.includes(method.toLowerCase());
}

export interface ParseResult {
  success: SurgeNode[];
  failed: string[];
  skipped?: {
    comments: number;
    duplicates: number;
  };
}

/**
 * 解析 Surge 节点配置字符串
 */
export function parseSurgeNode(nodeConfig: string): SurgeNode | null {
  try {
    // 移除多余的空格并分割
    const trimmed = nodeConfig.trim();
    if (!trimmed) return null;

    // 分离节点名称和配置
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) return null;

    const name = trimmed.substring(0, equalIndex).trim();
    const config = trimmed.substring(equalIndex + 1).trim();

    // 分割配置参数
    const parts = config.split(',').map(part => part.trim());
    if (parts.length < 4) return null;

    // 解析类型
    const type = parts[0];
    if (type !== 'ss') return null; // 只支持 shadowsocks

    // 解析服务器和端口
    const server = parts[1];
    const port = parseInt(parts[2]);
    
    // 验证服务器地址
    if (!isValidServer(server)) return null;
    
    // 验证端口
    if (!isValidPort(port)) return null;

    // 解析加密方法、密码和混淆参数
    let encryptMethod = '';
    let password = '';
    let obfs = '';
    let obfsHost = '';

    for (let i = 3; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('encrypt-method=')) {
        encryptMethod = part.replace('encrypt-method=', '');
      } else if (part.startsWith('password=')) {
        password = part.replace('password=', '').replace(/"/g, '');
      } else if (part.startsWith('obfs=')) {
        obfs = part.replace('obfs=', '');
      } else if (part.startsWith('obfs-host=')) {
        obfsHost = part.replace('obfs-host=', '');
      }
    }

    // 验证加密方法
    if (!isValidEncryptMethod(encryptMethod)) return null;
    
    // 验证密码
    if (!isValidPassword(password)) return null;

    // 验证混淆方法（如果存在）
    if (obfs && !isValidObfsMethod(obfs)) return null;

    const node: SurgeNode = {
      name,
      type,
      server,
      port,
      encryptMethod,
      password
    };

    // 添加混淆参数（如果存在）
    if (obfs) {
      node.obfs = obfs;
    }
    if (obfsHost) {
      node.obfsHost = obfsHost;
    }

    return node;
  } catch {
    return null;
  }
}

/**
 * 解析多行 Surge 节点配置
 */
export function parseSurgeNodes(input: string): ParseResult {
  const lines = input.split('\n').filter(line => line.trim());
  const success: SurgeNode[] = [];
  const failed: string[] = [];
  const seenNodes = new Set<string>(); // 用于去重的 Set
  let commentsCount = 0;
  let duplicatesCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过注释行（以 # 开头）
    if (trimmedLine.startsWith('#')) {
      commentsCount++;
      continue;
    }
    
    // 跳过空行
    if (!trimmedLine) {
      continue;
    }

    const parsed = parseSurgeNode(trimmedLine);
    if (parsed) {
      // 创建节点的唯一标识符用于去重
      const nodeKey = `${parsed.server}:${parsed.port}:${parsed.encryptMethod}:${parsed.password}`;
      
      // 检查是否已存在相同的节点
      if (!seenNodes.has(nodeKey)) {
        seenNodes.add(nodeKey);
        success.push(parsed);
      } else {
        duplicatesCount++;
      }
      // 如果是重复节点，直接跳过，不添加到失败列表
    } else {
      failed.push(trimmedLine);
    }
  }

  const result: ParseResult = { success, failed };
  
  // 只有在有跳过的内容时才添加 skipped 信息
  if (commentsCount > 0 || duplicatesCount > 0) {
    result.skipped = {
      comments: commentsCount,
      duplicates: duplicatesCount
    };
  }

  return result;
}

/**
 * 将 SurgeNode 转换为 SS URL 格式的 base64 编码
 * 格式: ss://base64(method:password)@server:port#name
 * 或带混淆: ss://base64(method:password)@server:port/?plugin=obfs-local%3Bobfs%3Dhttp%3Bobfs-host%3Dexample.com#name
 */
export function convertToSSUrl(node: SurgeNode): string {
  // 对于带混淆的节点，使用不同的格式
  if (node.obfs) {
    // 只对加密方法和密码进行base64编码，并移除填充字符
    const auth = `${node.encryptMethod}:${node.password}`;
    const base64Auth = btoa(auth).replace(/=+$/, '');
    
    let pluginParams = `obfs-local%3Bobfs%3D${node.obfs}`;
    
    // 添加混淆主机（如果存在）
    if (node.obfsHost) {
      pluginParams += `%3Bobfs-host%3D${node.obfsHost}`;
    }
    
    // 从节点名称中提取简化名称（去除emoji等）
    const simplifiedName = node.name.replace(/[🇭🇰🇸🇬🇺🇸🇯🇵🇬🇧🇩🇪🇫🇷🇰🇷🇨🇳]/g, '').trim();
    
    return `ss://${base64Auth}@${node.server}:${node.port}/?plugin=${pluginParams}#${encodeURIComponent(simplifiedName)}`;
  }
  
  // 普通节点（无混淆）- 完整的auth信息进行base64编码
  const auth = `${node.encryptMethod}:${node.password}@${node.server}:${node.port}`;
  const base64Auth = btoa(auth);
  return `ss://${base64Auth}#${encodeURIComponent(node.name)}`;
}

/**
 * 批量转换节点为 SS URL
 */
export function convertNodesToSSUrls(nodes: SurgeNode[]): string[] {
  return nodes.map(convertToSSUrl);
}

/**
 * 获取支持的加密方法列表
 */
export function getSupportedEncryptMethods(): string[] {
  return [...SUPPORTED_ENCRYPT_METHODS];
}

/**
 * 获取支持的混淆方法列表
 */
export function getSupportedObfsMethods(): string[] {
  return [...SUPPORTED_OBFS_METHODS];
}

/**
 * 验证节点配置的详细错误信息
 */
export function validateNodeConfig(nodeConfig: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const trimmed = nodeConfig.trim();
    if (!trimmed) {
      errors.push('配置不能为空');
      return { isValid: false, errors };
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      errors.push('配置格式错误：缺少等号分隔符');
      return { isValid: false, errors };
    }

    const config = trimmed.substring(equalIndex + 1).trim();
    const parts = config.split(',').map(part => part.trim());
    
    if (parts.length < 4) {
      errors.push('配置参数不足：至少需要类型、服务器、端口和加密参数');
      return { isValid: false, errors };
    }

    // 检查类型
    if (parts[0] !== 'ss') {
      errors.push('不支持的代理类型：仅支持 shadowsocks (ss)');
    }

    // 检查服务器
    if (!isValidServer(parts[1])) {
      errors.push('无效的服务器地址：请提供有效的域名或IP地址');
    }

    // 检查端口
    const port = parseInt(parts[2]);
    if (!isValidPort(port)) {
      errors.push('无效的端口号：端口必须在 1-65535 范围内');
    }

    // 检查加密方法、密码和混淆参数
    let encryptMethod = '';
    let password = '';
    let obfs = '';
    let obfsHost = '';
    
    for (let i = 3; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('encrypt-method=')) {
        encryptMethod = part.replace('encrypt-method=', '');
      } else if (part.startsWith('password=')) {
        password = part.replace('password=', '').replace(/"/g, '');
      } else if (part.startsWith('obfs=')) {
        obfs = part.replace('obfs=', '');
      } else if (part.startsWith('obfs-host=')) {
        obfsHost = part.replace('obfs-host=', '');
      }
    }

    if (!encryptMethod) {
      errors.push('缺少加密方法参数');
    } else if (!isValidEncryptMethod(encryptMethod)) {
      errors.push(`不支持的加密方法：${encryptMethod}。支持的方法：${SUPPORTED_ENCRYPT_METHODS.join(', ')}`);
    }

    if (!password) {
      errors.push('缺少密码参数');
    } else if (!isValidPassword(password)) {
      errors.push('无效的密码：密码长度必须在 1-256 字符之间');
    }

    // 验证混淆参数（如果存在）
    if (obfs && !isValidObfsMethod(obfs)) {
      errors.push(`不支持的混淆方法：${obfs}。支持的方法：${SUPPORTED_OBFS_METHODS.join(', ')}`);
    }

    // 若存在 obfsHost 但没有 obfs，也应提示
    if (obfsHost && !obfs) {
      errors.push('提供了 obfs-host 但未指定 obfs 类型');
    }

    return { isValid: errors.length === 0, errors };
  } catch {
    errors.push('配置解析失败：请检查配置格式');
    return { isValid: false, errors };
  }
}
