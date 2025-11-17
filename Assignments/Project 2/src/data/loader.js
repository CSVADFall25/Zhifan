// load messages from p5.Table, keep sender as 'A'|'B'; identify [图片] / [语音或视频通话]


// funtion exported:
// - loadMessagesFromP5Table(table): Given a p5.Table, return an array of messages with 
// { timeStr, timeComp{}, sender, content, type }

import { formatDate, parseTime } from '../utils/time.js';

export function loadMessagesFromP5Table(table) {
  console.time('[Loader] Total processing time');
  const rows = table.getRowCount();
  console.log(`[Loader] Starting to load ${rows} rows...`);
  const out = [];
  let skipped = 0;

  console.time('[Loader] Parsing rows');
  for (let r = 0; r < rows; r++) {
    // Progress indicator every 5000 rows
    if (r % 5000 === 0) console.log(`[Loader] Processed ${r}/${rows} rows...`);

    const timeStr   = table.getString(r, 'Time');     // "2024/2/13 11:02"
    const sender    = table.getString(r, 'Sender');   // "A" | "B"
    const content   = table.getString(r, 'Content') || '';

    // Skip malformed rows
    if (!timeStr || !sender) {
      skipped++;
      continue;
    }

    const comp = parseTime(formatDate(timeStr)); // { year: 2024, month: 1, day: 10, hour: 17, minute: 25 }
    if (!comp) {
      skipped++;
      continue;
    }

    let type = 'text';
    const norm = content.normalize('NFKC').toLowerCase().trim();

    if (norm === '[图片]') {
      type = 'image';
    } else if (norm === '[语音或视频通话]') {
      type = 'call';
    }

    // Push the message object to the output array { timeStr, timeComp{}, sender, content, type }
    out.push({
      timeStr,           // "2024/2/13 11:02"
      timeComp: comp,    // {year:y; month:m; day:d; hour:h; minute:min}
      sender,            // 'A' | 'B'
      content,
      type               // 'text' | 'image' | 'call'
    });
  }
  console.timeEnd('[Loader] Parsing rows');
  console.log(`[Loader] Parsed ${out.length} valid messages (skipped ${skipped})`);

  // Sort messages by time (ascending) to ensure consistent binning
  // This is critical for aggregation to work correctly
  out.sort((a, b) => {
    const A = a.timeComp, B = b.timeComp;
    if (A.year !== B.year) return A.year - B.year;
    if (A.month !== B.month) return A.month - B.month;
    if (A.day !== B.day) return A.day - B.day;
    if (A.hour !== B.hour) return A.hour - B.hour;
    return A.minute - B.minute;
  });

  return out;
}


