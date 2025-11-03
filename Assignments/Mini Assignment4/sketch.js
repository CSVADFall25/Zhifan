
//modified from basic_bar_distributed
//replace original data with my chat data with a person in WeChat (sensitive info has been removed from dataset)
//chatGPT is used for debugging

let table;
let msgCounts = {}; 
let labels = [];
let sender = [];
let dates = [];
let tooltipGraphics;
let earliestDate;
let latestDate;
let totalDays;

function preload() {
  // Make sure your CSV is in the same folder as the sketch
  table = loadTable('chatdata.csv', 'csv', 'header');
}

function setup() {
  createCanvas(2000, 600);
  tooltipGraphics = createGraphics(2000, 600);
  // draw() will run continuously to support hover interaction

  // Extract first 200 values data from CSV
  for (let r = 0; r < 800; r++) { 
    if(earliestDate === undefined || compareDates(formatDate(table.getString(r, 'StrTime')), earliestDate) === -1) {
      earliestDate = formatDate(table.getString(r, 'StrTime'));
    }
    if(latestDate === undefined || compareDates(formatDate(table.getString(r, 'StrTime')), latestDate) === 1) {
      latestDate = formatDate(table.getString(r, 'StrTime'));
    }
    labels.push(formatDate(table.getString(r, 'StrTime')));
    sender.push(float(table.getString(r, 'IsSender')));
  }

  console.log("Earliest date: " + earliestDate);
  console.log("Latest date: " + latestDate);
  totalDays = computeDateDifference(earliestDate, latestDate);
  console.log("Total days between: " + totalDays);

  for (let i = 0; i < labels.length; i++) {
  let date = labels[i];     
  let s = sender[i];         

   if (!(date in msgCounts)) {
    msgCounts[date] = { sender0: 0, sender1: 0 };
  }

  if (s === 1) {
    msgCounts[date].sender1++;
  } else {
    msgCounts[date].sender0++;
  }
}

dates = Object.keys(msgCounts).sort((a, b) => compareDates(a, b));

  // initial frame will be drawn in draw()
}

function draw() {
   background(240);  
  drawBarChart(msgCounts, labels);
  drawAxes();


}

function drawAxes() {
  stroke(0);
  strokeWeight(1);
  line(0, height-10, width, height - 10); // x-axis
 const days = max(totalDays, 1); 

  let spacing = width/days;
  for (let d = 0; d <= days; d += 30) {
    let x = d * spacing;
    line(x, height - 15, x, height - 5);
  }
  for (let d = 0; d <= days; d += 7) {
    let x = d * spacing;
    line(x, height - 15, x, height - 10);
  }

}

function drawBarChart(valuesByDate, labels) {//msgCounts, labels
  textAlign(CENTER, BOTTOM);
  fill(50);
  noStroke();
  tooltipGraphics.clear();
  
  const days = max(totalDays, 1);
  const barWidth = width / days;

 const maxValue1 = max(dates.map(d => valuesByDate[d].sender1));
  const maxValue0 = max(dates.map(d => valuesByDate[d].sender0));

  let preNorm = -1;
    for (let i = 0; i < dates.length; i++) {
    const dStr = dates[i];
    const v = valuesByDate[dStr];

    const h1 = map(v.sender1, 0, maxValue1 || 1, 0, height/2 - 80);
    const h0 = map(v.sender0, 0, maxValue0 || 1, 0, height/2- 80);

    const norm = normalizeDate(dStr, earliestDate, latestDate);
    let x = width * norm;

    if (norm === preNorm) x += 10; // tiny offset if same normalized position
    preNorm = norm;

    const bw = max(barWidth - 15, 2);
    const bx = x + 5;
    const y = height - 20 - (h1 + h0);

    // sender1 (top)
    fill(0, 140, 200);
    rect(bx, y, bw, h1);

    // sender0 (bottom)
    fill(140, 0, 0);
    rect(bx, y + h1, bw, h0);

    // Only show tooltip when the mouse is over this bar
    const over1 = mouseX >= bx && mouseX <= bx + bw && mouseY >= y && mouseY <= y + h1;
    const over0 = mouseX >= bx && mouseX <= bx + bw && mouseY >= y + h1 && mouseY <= y + h1 + h0;
    if (over1 || over0) {
      // Prepare tooltip content: date, msgCount
      const count = over1 ? v.sender1 : v.sender0;
      const lines = [dStr, `Number of Messages: ${count}`];

      push();
      // Draw a floating tooltip near the mouse
      tooltipGraphics.colorMode(RGB);
      tooltipGraphics.textAlign(LEFT, TOP);
      tooltipGraphics.textSize(12);
      const padding = 8;
      // Compute tooltip width by longest line
      let tw = 0;
      for (let t of lines) { tw = max(tw, textWidth(t)); }
      let boxW = tw + padding * 2;
      let lineH = 16;
      let boxH = lines.length * lineH + padding * 2;
      let tipX = constrain(mouseX + 12, 0, width - boxW - 1);
      let tipY = constrain(mouseY - (boxH + 12), 0, height - boxH - 1);
      // Background and border
      tooltipGraphics.noStroke();
      tooltipGraphics.fill(0, 0, 0, 200);
      tooltipGraphics.rect(tipX, tipY, boxW, boxH, 6);
      // Text
      tooltipGraphics.fill(255);
      for (let li = 0; li < lines.length; li++) {
        tooltipGraphics.text(lines[li], tipX + padding, tipY + padding + li * lineH);
      }
      pop();
    }
  }
  image(tooltipGraphics, 0, 0);
}

function formatDate(datetimeStr) {
  // Split on space → ["2024/1/10", "17:25"]
  let datePart = datetimeStr.split(" ")[0];
  
  // Split date part → ["2024", "1", "10"]
  let parts = datePart.split("/");
  let year = parts[0].slice(2); // get last two digits
  let month = parts[1];
  let day = parts[2];

  return `${month}/${day}/${year}`;
}

// --- Date comparison helpers ---
function parseDate(str) {
    const [mStr, dStr, yStr] = str.split('/');
    let m = int(mStr);
    let d = int(dStr);
    let y = int(yStr);
    // Expand 2-digit year to 2000-2099 by default
    if (y < 100) y = 2000 + y;
    return { year: y, month: m, day: d };
}

// Comparator: returns -1 if a<b (a earlier), 1 if a>b (a later), 0 if equal
function compareDates(aStr, bStr) {
  const a = parseDate(aStr);
  const b = parseDate(bStr);
  if (!a || !b) return 0; // cannot compare
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

function computeDateDifference(aStr, bStr) {
  const a = parseDate(aStr);
  const b = parseDate(bStr);
  if (!a || !b) return 0; // cannot compute

  const dateA = new Date(a.year, a.month - 1, a.day);
  const dateB = new Date(b.year, b.month - 1, b.day);
  const diffTime = Math.abs(dateB - dateA);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}
//return a value between 0 and 1 representing the normalized position of dateStr between earliestDate and latestDate
function normalizeDate(dateStr,startDateStr,endDateStr) {
  const targetDate = parseDate(dateStr);
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  if (!targetDate || !startDate || !endDate) return 0; // cannot compute
  const target = new Date(targetDate.year, targetDate.month - 1, targetDate.day);
  const start = new Date(startDate.year, startDate.month - 1, startDate.day);
  const end = new Date(endDate.year, endDate.month - 1, endDate.day);
  const totalDiff = end - start;
  const targetDiff = target - start;
  if (totalDiff === 0) return 0;
  return targetDiff / totalDiff;
}