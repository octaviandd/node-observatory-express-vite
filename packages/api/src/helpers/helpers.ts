/**
 * The format for values that indicate entries for each watcher.
 * @param value 
 * @param isCount 
 * @returns 
 */
export const formatValue = (value: string | number | null, isCount = false) => {
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
export const groupItemsByType = (items: any): { [key: string]: any[] } => {
  return items.reduce((acc: { [key: string]: any[] }, item: any) => {
    const type = item.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});
}

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

// const getDurationGraphValues = (totalDuration: number) => {
//   const slotsCount = 120; // how many time slots (bars) we want
//   const intervalDuration = totalDuration / slotsCount;

//   const now = Date.now();
//   const startDate = now - totalDuration * 60 * 1000;

//   const groupedData = Array.from({ length: slotsCount }, (_, index) => ({
//     durations: [] as number[],
//     avgDuration: 0,
//     p95: 0,
//     count: 0,
//     label: this.getLabel(index, period),
//   }));

//   data.forEach((request: any) => {
//     const requestTime = new Date(request.created_at).getTime();
//     const duration = parseFloat(request.content.duration); // assume it's in ms

//     // Figure out which interval slot this request belongs to
//     const intervalIndex = Math.floor(
//       (requestTime - startDate) / (intervalDuration * 60 * 1000),
//     );

//     if (intervalIndex >= 0 && intervalIndex < slotsCount) {
//       groupedData[intervalIndex].durations.push(duration);
//     }
//   });

//   groupedData.forEach((slot) => {
//     const len = slot.durations.length;
//     if (len > 0) {
//       slot.durations.sort((a, b) => a - b);
//       slot.count = len;

//       const sum = slot.durations.reduce((acc, val) => acc + val, 0);
//       slot.avgDuration = parseFloat((sum / len).toFixed(2));

//       const p95Index = Math.floor(0.95 * len);
//       slot.p95 = slot.durations[p95Index];
//     }
//   });

//   return groupedData;
// }