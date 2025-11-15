import { PERIODS } from "./constants";

/**
 * The format for values that indicate entries for each watcher.
 * @param value 
 * @param isCount 
 * @returns 
 */
export const formatValue = (value: string | number | null, isCount = false): string => {
  if (!value) return "0" + (isCount ? "" : "ms");
  const num = Number(value);
  if (num > 999) {
    return `${(num / 1000).toFixed(2)}${isCount ? "K" : "s"}`;
  }
  return `${num}${isCount ? "" : "ms"}`;
};

/**
 * Turns [] into {} with each [index] as {[index]}
 * @param items 
 * @returns 
 */



export const groupItemsByType = <T extends { type: string }>(items: T[]): Partial<Record<T['type'], T[]>> => Object.groupBy(items, ({ type }) => type);

/**
 * Cleans the request from values that can't be added to redis because of circularity or size.
 * @param content 
 * @returns 
 */
export const sanitizeContent = <T>(content: T): T => {
  const seen = new WeakSet();

  const sanitize = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item));
    }

    if (seen.has(obj)) {
      return "[Circular Reference]";
    }

    seen.add(obj);

    // Create new object to hold sanitized values
    const sanitized: { [key: string]: any } = {};

    // Process each property
    for (const [key, value] of Object.entries(obj)) {
      try {
        // Skip functions
        if (typeof value === "function") {
          continue;
        }
        // Recursively sanitize value
        sanitized[key] = sanitize(value);
      } catch (error: any) {
        // If any error occurs while processing a property, replace with error message
        sanitized[key] = `[Error: ${error.message}]`;
      }
    }

    return sanitized;
  };

  // Start sanitization from the root object
  return sanitize(content);
}

export const formattDurationGraphData = (data: any, period: string) => {
  const totalDuration = PERIODS[period].duration; // in minutes
  const slotsCount = 120; // how many time slots (bars) we want
  const intervalDuration = totalDuration / slotsCount; // each slot in minutes

  const now = Date.now(); // current timestamp (ms)
  const startDate = now - totalDuration * 60 * 1000; // start time (ms)

  const groupedData = Array.from({ length: slotsCount }, (_, index) => ({
    durations: [] as number[],
    avgDuration: 0,
    p95: 0,
    count: 0,
    label: getLabel(index, period),
  }));

  data.forEach((request: any) => {
    const requestTime = new Date(request.created_at).getTime();
    const duration = parseFloat(request.content.duration); // assume it's in ms

    // Figure out which interval slot this request belongs to
    const intervalIndex = Math.floor(
      (requestTime - startDate) / (intervalDuration * 60 * 1000),
    );

    if (intervalIndex >= 0 && intervalIndex < slotsCount) {
      groupedData[intervalIndex].durations.push(duration);
    }
  });

  groupedData.forEach((slot) => {
    const len = slot.durations.length;
    if (len > 0) {
      slot.durations.sort((a, b) => a - b);
      slot.count = len;

      const sum = slot.durations.reduce((acc, val) => acc + val, 0);
      slot.avgDuration = parseFloat((sum / len).toFixed(2));

      const p95Index = Math.floor(0.95 * len);
      slot.p95 = slot.durations[p95Index];
    }
  });

  return groupedData;
}

export const formattCountGraphData = <T extends readonly string[]>(data: CacheContent[], period: string, keys: T): Array<Record<T[number], number> & {label: string}> => {
  const totalDuration = PERIODS[period].duration;
  const intervalDuration = totalDuration / 120;
  const now = new Date().getTime();
  const startDate = now - totalDuration * 60 * 1000;

  const initializeKeys = (): Record<string, number> => {
    let obj: Record<string, number> = {};
    keys.forEach(key => obj[key] = 0);
    
    return obj;
  }

  const groupedData: Array<Record<T[number], number> & {label: string}> = Array.from({ length: 120 }, (_, index) => ({
    ...initializeKeys(),
    label: getLabel(index, period),
  }) as Record<T[number], number> & {label: string});

  data.forEach((row: any) => {
    const createdAt = new Date(row.created_at).getTime();
    const intervalIndex = Math.floor((createdAt - startDate) / (intervalDuration * 60 * 1000));

    if (intervalIndex >= 0 && intervalIndex < 120) {
      keys.forEach((key: T[number]) => {
        const value = row.content[key] ? 1 : 0;
        (groupedData[intervalIndex] as any)[(key)] += value;
      })
    }
  });

  return groupedData;
}


export const getLabel = (index: number, period: string) =>  {
  const totalDuration = PERIODS[period].duration;
  const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

  let timeAgo = 0;
  let config = {};

  switch (period) {
    case '1h':
      timeAgo = new Date().getTime() - 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit" }
      break;
    case '24h':
      timeAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit" }
      break
    case '7d':
      timeAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    case '14d':
      timeAgo = new Date().getTime() - 14 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    case '30d':
      timeAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    default:
      break
  }

  const interval = timeAgo + index * intervalDuration * 60 * 1000;
  const startTime = new Date(interval).toLocaleTimeString("en-US", config);
  const endTime = new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString("en-US", config);
  return `${startTime} - ${endTime}`
}