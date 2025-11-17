// Time utilities for binning, formatting, and comparing dates

// exported functions:
// - formatDate(datetimeStr): parse "2024/1/10 17:25" to "1/10/24/17:25"
// - parseTime(str): parse "1/10/24/17:25" to { year: 2024, month: 1, day: 10, hour: 17, minute: 25 }
// - compareDates(aComp, bComp): compare two date component objects, return -1 if a<b (a earlier), 1 if a>b (a later), 0 if equal
// - computeDateDifference(aStr, bStr): compute the difference in days between two date strings, return diffDays
// - normalizeDate(dateStr, startDateStr, endDateStr): return a value between 0 and 1 representing the normalized position of dateStr between earliestDate and latestDate, return targetDiff / totalDiff;
// - floorToBin(ts, resolution): Given a timestamp and resolution, return the start of the corresponding bin as a Date object
// - nextBinStart(ts, resolution): Given a timestamp and resolution, return the start of the next bin as a Date object
// - formatBinRange(start, end, resolution): TODO: transfer ts for tooltip
// - binKey(ts, resolution): Generate a unique key for a bin at a given resolution
// - formatKeyFor(comp, resolution): Alias for binKey, generates resolution-based keys




// parse "2024/1/10 17:25" to { 2024/1/10/17/25 }
export function formatDate(datetimeStr) {

    if (!datetimeStr) return null;

    // Split on space → ["2024/1/10", "17:25"]
    let datePart = datetimeStr.split(" ")[0];
    let timePart = datetimeStr.split(" ")[1];

    // Split date part → ["2024", "1", "10"]
    let parts = datePart.split("/");
    let year = parts[0].slice(2); // get last two digits
    let month = parts[1];
    let day = parts[2];

    //Split time part → ["17", "25"]
    let hour = timePart.split(":")[0];
    let minute = timePart.split(":")[1];

    return `${month}/${day}/${year}/${hour}/${minute}`;
}



// parse -{ 2024/1/10/17/25 } to { year: 2024, month: 1, day: 10, hour: 17, minute: 25 }
export function parseTime(str) {
    const [mStr, dStr, yStr, hStr, minStr] = str.split('/');
    let m = parseInt(mStr);
    let d = parseInt(dStr);
    let y = parseInt(yStr);
    let h = parseInt(hStr);
    let min = parseInt(minStr);
    // Expand 2-digit year to 2000-2099 by default
    if (y < 100) y = 2000 + y;
    return { year: y, month: m, day: d, hour: h, minute: min };
}

// Comparator: takes two component objects { year, month, day, hour, minute }
// Returns -1 if a<b (a earlier), 1 if a>b (a later), 0 if equal
export function compareDates(a, b) {

    if (!a || !b) return 0; // cannot compare
    
    // 支持两种格式：{year, month, day, hour, minute} 或 {y, m, d, h, min}
    const ay = a.year || a.y;
    const am = a.month || a.m;
    const ad = a.day || a.d;
    const ah = a.hour || a.h || 0;
    const amin = a.minute || a.min || 0;
    
    const by = b.year || b.y;
    const bm = b.month || b.m;
    const bd = b.day || b.d;
    const bh = b.hour || b.h || 0;
    const bmin = b.minute || b.min || 0;
    
    if (ay !== by) return ay < by ? -1 : 1;
    if (am !== bm) return am < bm ? -1 : 1;
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (ah !== bh) return ah < bh ? -1 : 1;
    if (amin !== bmin) return amin < bmin ? -1 : 1;
    return 0;
}



export function computeDateDifference(aStr, bStr) {
    const a = parseTime(aStr);
    const b = parseTime(bStr);
    if (!a || !b) return 0; // cannot compute

    const dateA = new Date(a.year, a.month - 1, a.day);
    const dateB = new Date(b.year, b.month - 1, b.day);
    const diffTime = Math.abs(dateB - dateA);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}




//return a value between 0 and 1 representing the normalized position of dateStr between earliestDate and latestDate
// Accepts both strings ("2/13/24/11/30") and component objects ({ y, m, d, h, min } or { year, month, day, hour, minute })
export function normalizeDate(dateOrComp, startOrComp, endOrComp) {
    // Helper to convert abbreviated component keys { y, m, d, h, min } to full keys { year, month, day, hour, minute }
    function toFullComponent(comp) {
      if (!comp) return null;
      if (typeof comp === 'string') {
        return parseTime(comp);
      }
      // If already has 'year', it's already in full form
      if (comp.year !== undefined) return comp;
      // Convert abbreviated { y, m, d, h, min } to full form
      return {
        year: comp.y,
        month: comp.m,
        day: comp.d,
        hour: comp.h || 0,
        minute: comp.min || 0
      };
    }
    
    const targetDate = toFullComponent(dateOrComp);
    const startDate = toFullComponent(startOrComp);
    const endDate = toFullComponent(endOrComp);
    
    if (!targetDate || !startDate || !endDate) return 0; // cannot compute
    const target = new Date(targetDate.year, targetDate.month - 1, targetDate.day);
    const start = new Date(startDate.year, startDate.month - 1, startDate.day);
    const end = new Date(endDate.year, endDate.month - 1, endDate.day);
    const totalDiff = end - start;
    const targetDiff = target - start;
    if (totalDiff === 0) return 0;
    return targetDiff / totalDiff;
}


// Given a timestamp and resolution, return the start of the corresponding bin as a Date object
export function floorToBin(ts, resolution = 'day') {
    
if (!ts) return null;

  // 支持两种格式：{y,m,d,h,min} 或 {year,month,day,hour,minute}
  const y = ts.y || ts.year;
  const m = ts.m || ts.month;
  const d = ts.d || ts.day;
  const h = ts.h || ts.hour || 0;
  const min = ts.min || ts.minute || 0;

  if (resolution === 'day') return { y, m, d, h: 0, min: 0 };
  // if (resolution === 'hour') return { y, m, d, h, min: 0 };
  if (resolution === 'week') {
    // start on Monday
    const js = new Date(y, m - 1, d);
    const day = (js.getDay() + 6) % 7; // 0..6 (Mon..Sun)
    js.setDate(js.getDate() - day);
    return { y: js.getFullYear(), m: js.getMonth() + 1, d: js.getDate(), h: 0, min: 0 };
  }
}


// Given a timestamp and resolution, return the start of the next bin as a Date object
export function nextBinStart(ts, resolution = 'day') {

  // 支持两种格式：{y,m,d,h,min} 或 {year,month,day,hour,minute}
  const y = ts.y || ts.year;
  const m = ts.m || ts.month;
  const d = ts.d || ts.day;
  const h = ts.h || ts.hour || 0;
  const min = ts.min || ts.minute || 0;

  const js = new Date(y, m - 1, d, h, min);

  // if (resolution === 'hour') js.setHours(js.getHours() + 1, 0, 0, 0);
  if (resolution === 'week') js.setDate(js.getDate() + 7);
  else js.setDate(js.getDate() + 1); // day
  return { y: js.getFullYear(), m: js.getMonth() + 1, d: js.getDate(), h: js.getHours(), min: js.getMinutes() };

}



export function formatBinRange(start, end, resolution) {
    // TODO: 转字符串用于 tooltip
}



export function binKey(ts, resolution = 'day') {
  // ts is a component object: { y, m, d, h, min }
  // if (resolution === 'hour') {
  //   const formatted = `${String(ts.m).padStart(2, '0')}/${String(ts.d).padStart(2, '0')}/${String(ts.y).slice(-2).padStart(2, '0')}/${String(ts.h).padStart(2, '0')}:00`;
  //   return formatted;
  // }
  if (resolution === 'week') {
    const js = new Date(ts.y, ts.m - 1, ts.d);
    const firstJan = new Date(ts.y, 0, 1);
    const week = Math.ceil((((js - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    return `${ts.y}/W${String(week).padStart(2, '0')}`;
  }
  if (resolution === 'day') {
    // Return in format m/d/yy (2-digit year)
    return `${String(ts.m).padStart(2, '0')}/${String(ts.d).padStart(2, '0')}/${String(ts.y).slice(-2).padStart(2, '0')}`;
  }
}


export function formatKeyFor(comp, resolution='day') {
  const mm  = String(comp.m).padStart(2, '0');
  const dd  = String(comp.d).padStart(2, '0');
  const hh  = String(comp.h || 0).padStart(2, '0');

  if (resolution === 'hour') {
    return `${comp.y}/${mm}/${dd}/${hh}:00`;
  }
  if (resolution === 'week') {
    const js = new Date(comp.y, comp.m - 1, comp.d);
    const firstJan = new Date(comp.y, 0, 1);
    const week = Math.ceil((((js - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    return `${comp.y}/W${String(week).padStart(2,'0')}`;
  }
  // 默认每天：YYYY-MM-DD
  return `${comp.y}/${mm}/${dd}`;
}