/**
 * original data：
 * {
 *   Time: "2024/2/13 11:02",
 *   Sender: "A" | "B",
 *   Content: "hello world" 
 * }
 */

/**
 * aggregated bins：
// {
//   start: {y,m,d,h,min},
//   end:   {y,m,d,h,min},
//   counts: { A, B, total },
//   types:  { text, image, call },
//   call:   { exists: boolean, count: number },  // call 次数统计
//   keywordHits: { [kw: string]: number },
//   normT: number  // 0..1
// }
 */


import { floorToBin, nextBinStart, binKey, formatDate, compareDates, normalizeDate, formatKeyFor } from '../utils/time.js';

// Given an array of messages and a resolution, return an object containing:
// - earliestStr: the earliest date string in the messages
// - latestStr: the latest date string in the messages
// - countsByResolution: an object mapping resolution-based keys to { A: n, B: n, total: n }
// - bins: an array of bins, each with { key, start, end, counts: { A, B, total }, types: { text, image, call }, call: boolean, normT }
// Supported resolutions: /* 'hour', */ 'day' (default), 'week'


export function aggregateMessages(messages, resolution = 'day') {
  if (!messages || messages.length === 0) {
    return { earliestStr: '', latestStr: '', countsByResolution: {}, bins: [] };
  }

  //earlist and latest date strings and components
  //messages are from loadMessagesFromP5Table(table), expected to be { timeStr, timeComp{}, sender, content, type }
  //TimeStr: "2024/2/13 11:02"
  //timeComp {year:y; month:m; day:d; hour:h; minute:min}
  //Earlist/LatestStr {month}/{day}/{year}/{hour}:{minute}

  const earliestComp = messages[0].timeComp; // The first item; 
  const latestComp   = messages[messages.length - 1].timeComp; // The last item;
  const earliestStr  = formatDate(messages[0].timeStr); //
  const latestStr    = formatDate(messages[messages.length - 1].timeStr);


  // Message counts by day
  const countsByResolution = {}; // { key -> { A, B, total } }

// aggregate messages into bins based on the resolution (hour/day/week)
  const binsByKey = new Map(); // key -> bin
  const keysOrder = [];        // to maintain the order of bins

  function ensureBinFor(comp) {
    const startComp = floorToBin(comp, resolution);
    const key = binKey(startComp, resolution);
    if (!binsByKey.has(key)) {
      const endComp = nextBinStart(startComp, resolution);
      const bin = {
        key,
        start: startComp, 
        end: endComp,     
        counts: { A: 0, B: 0, total: 0 },
        types: { text: 0, image: 0, call: 0 },
        call: { exists: false, count: 0 }, 
        normT: 0,
        keywordHits: {}   
      };
      binsByKey.set(key, bin);
      keysOrder.push(key);
   
      if (keysOrder.length <= 5) {
        console.log('[Aggregate] Created bin', keysOrder.length, '- key:', key, 'start:', startComp);
      }
    }
    return binsByKey.get(key);
  }




  console.log('[Aggregate] First message timeComp:', messages[0].timeComp);
  console.log('[Aggregate] Last message timeComp:', messages[messages.length - 1].timeComp);
  console.log('[Aggregate] Resolution:', resolution);

  for (const m of messages) {
    const bin = ensureBinFor(m.timeComp);
    if (m.sender === 'A') bin.counts.A++;
    else if (m.sender === 'B') bin.counts.B++;
    bin.counts.total++;
    if (bin.types[m.type] != null) bin.types[m.type]++;
    if (m.type === 'call') {
      bin.call.exists = true;
      bin.call.count++;
    }

    const resKey = formatKeyFor(floorToBin(m.timeComp, resolution), resolution);
    if (!countsByResolution[resKey]) countsByResolution[resKey] = { A: 0, B: 0, total: 0 };
    if (m.sender === 'A') countsByResolution[resKey].A++;
    else if (m.sender === 'B') countsByResolution[resKey].B++;
    countsByResolution[resKey].total++;

  }


  // sort bins by time
  keysOrder.sort(( ka, kb) => {
    const a = binsByKey.get(ka).start;
    const b = binsByKey.get(kb).start;
    return compareDates(a, b);
  });


  // Normalize time for each bin to a value between 0 and 1 based on the earliest and latest times
  const firstStart = binsByKey.get(keysOrder[0]).start;
  const lastEnd    = binsByKey.get(keysOrder[keysOrder.length - 1]).end;
  for (const k of keysOrder) {
    const b = binsByKey.get(k);
    const mid = approxMid(b.start, b.end);
    b.normT = normalizeDate(mid, firstStart, lastEnd);
  }

  // 填充缺失的时间段（无消息的 bin）
  const originalBins = keysOrder.map(k => binsByKey.get(k));
  console.log('[Aggregate] Before fill:', originalBins.length, 'bins');
  
  // 检查是否有消息数为0的bin
  const zeroBins = originalBins.filter(b => b.counts.total === 0);
  console.log('[Aggregate] Bins with zero messages:', zeroBins.length);
  
  const filledBins = fillMissingBins(originalBins, resolution);
  console.log('[Aggregate] After fill:', filledBins.length, 'bins');
  
  return { earliestStr, latestStr, countsByResolution, bins: filledBins };
}

/**
 * 填充缺失的时间段，为无消息的时间段创建空 bin
 * @param {Array} bins - 已有的 bin 数组
 * @param {string} resolution - 时间分辨率
 * @returns {Array} 填充后的 bin 数组
 */
function fillMissingBins(bins, resolution) {
  console.log('[fillMissingBins] Called with', bins.length, 'bins, resolution:', resolution);
  if (bins.length === 0) return bins;
  
  const filledBins = [];
  let gapCount = 0;
  
  // 从第一个 bin 的开始到最后一个 bin 的结束，生成所有时间段
  const firstStart = bins[0].start;
  const lastBin = bins[bins.length - 1];
  const lastEnd = lastBin.end;
  
  console.log('[fillMissingBins] Time range:', firstStart, 'to', lastEnd);
  console.log('[fillMissingBins] Last bin:', lastBin.key, 'start:', lastBin.start, 'end:', lastBin.end);
  
  // 创建已有 bin 的查找表（用 key 查找）
  const existingBinsMap = new Map();
  bins.forEach(bin => {
    existingBinsMap.set(bin.key, bin);
  });
  
  // 从第一个时间段开始，逐个生成所有时间段
  let currentStart = { y: firstStart.y, m: firstStart.m, d: firstStart.d, h: firstStart.h || 0, min: firstStart.min || 0 };
  
  let iterationCount = 0;
  const maxIterations = 10000; // 防止无限循环
  
  // 检查初始条件
  const initialCmp = compareDates(currentStart, lastEnd);
  console.log('[fillMissingBins] Initial compare:', currentStart, 'vs', lastEnd, '=', initialCmp);
  
  while (compareDates(currentStart, lastEnd) < 0 && iterationCount < maxIterations) {
    iterationCount++;
    const currentEnd = nextBinStart(currentStart, resolution);
    const key = binKey(currentStart, resolution);
    
    if (iterationCount <= 3) {
      console.log(`[fillMissingBins] Iteration ${iterationCount}: key=${key}, exists=${existingBinsMap.has(key)}`);
    }
    
    // 检查这个时间段是否已有 bin
    if (existingBinsMap.has(key)) {
      // 已有数据的 bin
      filledBins.push(existingBinsMap.get(key));
    } else {
      // 缺失的 bin，创建空 bin
      const emptyBin = {
        key: key,
        start: { ...currentStart },
        end: { ...currentEnd },
        counts: { A: 0, B: 0, total: 0 },
        types: { text: 0, image: 0, call: 0 },
        call: { exists: false, count: 0 },
        normT: 0,
        keywordHits: {}
      };
      
      // 计算 normT
      const mid = approxMid(emptyBin.start, emptyBin.end);
      emptyBin.normT = normalizeDate(mid, firstStart, lastEnd);
      
      filledBins.push(emptyBin);
      gapCount++;
      
      if (gapCount <= 5) {
        console.log('[fillMissingBins] Created empty bin:', key, emptyBin.start);
      }
    }
    
    // 移动到下一个时间段
    currentStart = { y: currentEnd.y, m: currentEnd.m, d: currentEnd.d, h: currentEnd.h || 0, min: currentEnd.min || 0 };
  }
  
  if (iterationCount >= maxIterations) {
    console.error('[fillMissingBins] Hit max iterations! Returning original bins.');
    return bins;
  }
  
  console.log('[fillMissingBins] Result: original', bins.length, '-> filled', filledBins.length, '(added', gapCount, 'empty bins)');
  return filledBins;
}

// 取 start 与 end 的“中点”（组件）
function approxMid(a, b) {
  const A = new Date(a.y, a.m - 1, a.d, a.h || 0, a.min || 0);
  const B = new Date(b.y, b.m - 1, b.d, b.h || 0, b.min || 0);
  const mid = new Date((A.getTime() + B.getTime()) / 2);
  return { y: mid.getFullYear(), m: mid.getMonth() + 1, d: mid.getDate(), h: mid.getHours(), min: mid.getMinutes() };
}

//get the max counts for A, B, and total across all bins and all resolutions
export function getMaxCounts(agg) {
  let maxA = 0, maxB = 0, maxTotal = 0; 
    for (const bin of agg.bins) {
        if (bin.counts) {
            if (bin.counts.A > maxA) maxA = bin.counts.A;
            if (bin.counts.B > maxB) maxB = bin.counts.B;
            if (bin.counts.total > maxTotal) maxTotal = bin.counts.total;
        }
    }
  return { maxA, maxB, maxTotal };
}
