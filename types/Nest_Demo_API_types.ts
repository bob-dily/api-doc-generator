// Auto-generated TypeScript types from Swagger schema

export interface User {
  /** 用户ID */
  id: number;
  /** 用户名 */
  name: string;
  /** 用户邮箱 */
  email: string;
  /** 头像URL */
  avatar?: string;
}

export interface NotificationSettings {
  /** 邮件通知是否开启 */
  email: boolean;
  /** 推送通知是否开启 */
  push: boolean;
  /** 短信通知是否开启 */
  sms: boolean;
}

export interface Preferences {
  /** 是否启用夜间模式 */
  nightMode: boolean;
  /** 字体大小 */
  fontSize: "small" | "medium" | "large";
  /** 是否启用动画效果 */
  animations: boolean;
  /** 自定义时区 */
  timezone: string;
}

export interface UserConfig {
  /** 用户ID */
  userId: number;
  /** 主题设置 */
  theme: "light" | "dark";
  /** 语言设置 */
  language: string;
  /** 通知设置 */
  notifications: NotificationSettings;
  /** 个性化设置 */
  preferences: Preferences;
}

