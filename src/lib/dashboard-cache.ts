/**
 * 看板本地缓存工具
 * 使用 localForage（底层 IndexedDB）持久化 AI 生成的看板数据，避免重复调用 AI 接口
 *
 * 优势：
 * - IndexedDB 容量远大于 LocalStorage（通常 5-10MB → 数百 MB）
 * - 支持存储二进制数据、异步非阻塞 I/O
 * - 页面刷新 / 浏览器重启后数据不丢失
 *
 * 缓存结构：以 dashboardId 为键，存储 widget 完整渲染数据
 * 缓存键命名规范：dashboard_cache_{dashboardId}
 */

import localforage from "localforage";

/** 专属实例：避免与其他 localForage 数据冲突 */
const dashboardStore = localforage.createInstance({
  name: "ruiying_dashboards",
  storeName: "dashboard_cache",
});

/** 缓存条目类型：单个看板的完整渲染数据 */
export interface CachedDashboardEntry {
  dashboardId: string;
  widgets: Array<{
    widgetId: string;
    type: string;
    title: string;
    data: any[];
  }>;
  cachedAt: number; // Date.now() 时间戳
}

/** 构建缓存键 */
function cacheKey(dashboardId: string): string {
  return `dashboard_cache_${dashboardId}`;
}

/**
 * 读取看板缓存（异步）
 * @returns 缓存数据，若未命中 / 解析失败 / 数据为空则返回 null
 */
export async function getCachedDashboard(
  dashboardId: string
): Promise<CachedDashboardEntry | null> {
  try {
    const raw: unknown = await dashboardStore.getItem(cacheKey(dashboardId));
    if (raw === null || raw === undefined) return null;

    // localForage 已自动反序列化，直接使用
    const entry = raw as CachedDashboardEntry;

    // ── 完整性校验 ──
    if (
      !entry.dashboardId ||
      !Array.isArray(entry.widgets) ||
      entry.widgets.length === 0
    ) {
      console.warn("[DashboardCache] 缓存数据不完整，已丢弃:", dashboardId);
      await dashboardStore.removeItem(cacheKey(dashboardId));
      return null;
    }

    // 校验每个 widget 至少包含 widgetId + data
    const valid = entry.widgets.every(
      (w) => w.widgetId && Array.isArray(w.data)
    );
    if (!valid) {
      console.warn("[DashboardCache] 缓存 widget 结构异常，已丢弃:", dashboardId);
      await dashboardStore.removeItem(cacheKey(dashboardId));
      return null;
    }

    return entry;
  } catch (err) {
    // IndexedDB 读取异常 → 清理脏数据，降级到 AI 生成
    console.warn("[DashboardCache] 读取缓存异常，已丢弃:", dashboardId, err);
    try {
      await dashboardStore.removeItem(cacheKey(dashboardId));
    } catch {}
    return null;
  }
}

/**
 * 将看板数据写入本地缓存（异步）
 * @param entry 看板缓存条目
 */
export async function setCachedDashboard(
  entry: CachedDashboardEntry
): Promise<void> {
  try {
    // 确保 widgets 不为空才写入
    if (!entry.widgets || entry.widgets.length === 0) {
      console.warn("[DashboardCache] 拒绝缓存空 widgets:", entry.dashboardId);
      return;
    }
    const payload: CachedDashboardEntry = {
      ...entry,
      cachedAt: entry.cachedAt || Date.now(),
    };
    // localForage 自动序列化，无需 JSON.stringify
    await dashboardStore.setItem(cacheKey(entry.dashboardId), payload);
  } catch (err) {
    // IndexedDB 写入失败（配额满 / 浏览器隐私模式等）→ 静默降级
    console.warn("[DashboardCache] 写入缓存失败:", entry.dashboardId, err);
  }
}

/**
 * 清除指定看板的缓存（异步）
 */
export async function clearDashboardCache(
  dashboardId: string
): Promise<void> {
  try {
    await dashboardStore.removeItem(cacheKey(dashboardId));
  } catch (err) {
    console.warn("[DashboardCache] 清除缓存失败:", dashboardId, err);
  }
}

/**
 * 清除所有看板缓存（异步）
 * 遍历专属 store 中的所有键，仅删除看板缓存条目
 */
export async function clearAllDashboardCache(): Promise<void> {
  try {
    const keys: string[] = [];
    await dashboardStore.iterate<CachedDashboardEntry, void>((_value, key) => {
      if (key.startsWith("dashboard_cache_")) {
        keys.push(key);
      }
    });
    await Promise.all(keys.map((k) => dashboardStore.removeItem(k)));
  } catch (err) {
    console.warn("[DashboardCache] 清除全部缓存失败:", err);
  }
}
