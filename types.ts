import { proxyIconUrl } from './src/utils/iconProxy';

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  categoryId: string;
  createdAt: number;
  pinned?: boolean;
  pinnedOrder?: number;
  order?: number;
  weight?: number;
  iconType?: string;
  iconConfig?: Record<string, unknown>;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  password?: string;
  parentId?: string;
  isSubcategory?: boolean;
  weight?: number;
}

export interface UserItem {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number | null;
}

export interface SessionItem {
  id: string;
  userId: string;
  expiresAt: number;
}

export interface AppState {
  links: LinkItem[];
  categories: Category[];
  darkMode: boolean;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
}

export type AIProvider = 'google' | 'openai' | 'claude';

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  providers?: Partial<Record<AIProvider, AIProviderConfig>>;
  websiteTitle?: string;
  faviconUrl?: string;
  navigationName?: string;
  sidebarNavigationName?: string;
  defaultViewMode?: 'compact' | 'detailed';
}

// 图标获取方式类型
export type IconSourceType = 'faviconextractor' | 'google' | 'customapi' | 'customurl';

// 图标配置
export interface IconConfig {
  source: IconSourceType;
  faviconextractor?: {
    enabled: boolean;
  };
  google?: {
    enabled: boolean;
    apiKey?: string;
  };
  customapi?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  customurl?: {
    enabled: boolean;
    url: string;
  };
}

// 密码过期时间单位
export type PasswordExpiryUnit = 'day' | 'week' | 'month' | 'year' | 'permanent';

// 密码过期时间配置
export interface PasswordExpiryConfig {
  value: number; // 数值
  unit: PasswordExpiryUnit; // 单位
}

// 网站配置
export interface WebsiteConfig {
  passwordExpiry: PasswordExpiryConfig;
}

// 搜索模式类型
export type SearchMode = 'internal' | 'external';

// 外部搜索源配置
export interface ExternalSearchSource {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled: boolean;
  createdAt: number;
}

// 搜索配置
export interface SearchConfig {
  mode: SearchMode;
  externalSources: ExternalSearchSource[];
  selectedSource?: ExternalSearchSource | null; // 选中的搜索源
  defaultEngine?: string; // 默认搜索引擎 ID
  customEngineUrl?: string; // 自定义搜索引擎 URL
  customEngineIcon?: string; // 自定义搜索引擎 Logo (URL 或 SVG 代码)
}

// 滚动 Ticker 来源类型
export type TickerSource = 'mastodon' | 'memos' | 'custom';

// 滚动 Ticker 配置
export interface TickerConfig {
  enabled: boolean;
  source: TickerSource;
  // Mastodon
  mastodonInstance?: string;
  mastodonUsername?: string;
  mastodonLimit?: number;
  mastodonExcludeReplies?: boolean;
  mastodonExcludeReblogs?: boolean;
  // Memos
  memosHost?: string;
  memosToken?: string;
  memosLimit?: number;
  memosCreator?: string;
  memosVisibility?: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
  // Custom
  customItems?: string[];
}

// 天气 API 类型
export type WeatherProvider = 'jinrishici' | 'qweather' | 'openweather' | 'visualcrossing' | 'accuweather';

// 天气配置
export interface WeatherConfig {
  enabled: boolean;
  provider: WeatherProvider;
  // QWeather
  qweatherHost?: string;
  qweatherApiKey?: string;
  qweatherLocation?: string;
  // OpenWeather
  openweatherApiKey?: string;
  openweatherCity?: string;
  // Visual Crossing
  visualcrossingApiKey?: string;
  visualcrossingLocation?: string;
  // AccuWeather
  accuweatherApiKey?: string;
  accuweatherLocationKey?: string;
  // Common
  unit?: 'celsius' | 'fahrenheit';
}

// 完全统一的应用配置（包含所有配置）
export interface AppConfig {
  // AI 配置
  ai?: AIConfig;

  // 网站配置
  website?: WebsiteConfig;

  // WebDAV 配置
  webdav?: WebDavConfig;

  // 搜索配置
  search?: SearchConfig;

  // 滚动 Ticker 配置
  ticker?: TickerConfig;

  // 天气配置
  weather?: WeatherConfig;

  // 图标配置
  icon?: IconConfig;

  // 视图配置
  view?: {
    mode: 'compact' | 'detailed'; // 用户个人视图偏好
    defaultMode?: 'compact' | 'detailed'; // 管理员设置的默认视图模式
  };

  // 界面配置
  ui?: {
    showPinnedWebsites: boolean; // 是否显示置顶网站
    darkMode?: boolean; // 深色模式偏好（可选，主要使用系统级主题）
  };

  // 其他用户偏好设置
  preferences?: {
    [key: string]: any;
  };
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "common", name: "常用推荐", icon: "Star" },
  { id: "tools","name":"工具","icon":"Folder","isSubcategory":false},
  { id: "life","name":"生活工具","icon":"Target","parentId":"tools","isSubcategory":true},
  { id: "network","name":"网络工具","icon":"Wifi","parentId":"tools","isSubcategory":true},
];

export const INITIAL_LINKS: LinkItem[] = [
  { id: '17656786301830', title: 'Cloudflare Dashboard', url: 'https://dash.cloudflare.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/dash.cloudflare.com?larger=true'), description: 'Cloudflare 资源和 Worker 控制台', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 0, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 0 },
  { id: '17656786301831', title: 'GitHub', url: 'https://github.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/github.com?larger=true'), description: '代码托管和协作平台', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 1, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 1 },
  { id: '17656786301832', title: 'Cloudflare Docs', url: 'https://developers.cloudflare.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/developers.cloudflare.com?larger=true'), description: 'Cloudflare 官方文档', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 2, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 2 },
  { id: '17656786301833', title: 'ChatGPT', url: 'https://chatgpt.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/chatgpt.com?larger=true'), description: 'OpenAI 对话助手', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 3, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 3 },
  { id: '17656786301834', title: 'Gemini', url: 'https://gemini.google.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/gemini.google.com?larger=true'), description: 'Google AI 助手', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 4, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 4 },
  { id: '17656786301835', title: 'Gmail', url: 'https://mail.google.com/', icon: proxyIconUrl('https://www.faviconextractor.com/favicon/mail.google.com?larger=true'), description: '邮件收发入口', categoryId: 'common', createdAt: 1765678630183, pinned: true, order: 5, iconType: 'faviconextractor', iconConfig: { iconType: 'faviconextractor' }, pinnedOrder: 5 }
];
