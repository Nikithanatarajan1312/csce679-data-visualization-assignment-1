// ==========================
// Config
// ==========================
const CSV_PATH = "data/temperature_daily.csv";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const margin = { top: 30, right: 90, bottom: 30, left: 90 };
const cellW = 70;
const cellH = 48;
const sparkPad = 6;

// Mode toggles between monthly max and monthly min
let mode = "max"; // "max" or "min"
let rawAll = null; // store all parsed rows

// ==========================
// Helpers
// ==========================
function parseRow(d){
  const dt = d3.timeParse("%Y-%m-%d")(d.date);
  return {
    date: dt,
    year: dt.getFullYear(),
    month: dt.getMonth(), // 0..11
    day: dt.getDate(),    // 1..31
    max: +d.max_temperature,
    min: +d.min_temperature
  };
}

function currentValue(cell){
  if (cell.missing) return null;
  return mode === "max" ? cell.monthMax : cell.monthMin;
}

function formatTooltip(cell){
  const ym = `${cell.year}-${String(cell.month+1).padStart(2,"0")}`;

  if (cell.missing){
    return `<div><b>${ym}</b></div><div>No data</div>`;
  }

  const maxV = cell.monthMax;
  const minV = cell.monthMin;

  const maxLine = mode === "max"
    ? `<b>Monthly Max:</b> <b>${maxV.toFixed(1)} °C</b>`
    : `<b>Monthly Max:</b> ${maxV.toFixed(1)} °C`;

  const minLine = mode === "min"
    ? `<b>Monthly Min:</b> <b>${minV.toFixed(1)} °C</b>`
    : `<b>Monthly Min:</b> ${minV.toFixed(1)} °C`;

  return `
    <div><b>${ym}</b></div>
    <div style="margin-top:2px;">${maxLine}</div>
    <div>${minLine}</div>
    <div style="opacity:.85;margin-top:4px;">(Sparkline shows daily max & min)</div>
  `;
}

// Build month cells but ALSO fill placeholders for all (year,month)
function buildMonthCellsFilled(data, years){
  const byYM = d3.group(data, d => `${d.year}-${d.month}`);

  const cells = [];
  for (const y of years){
    for (let m = 0; m < 12; m++){
      const key = `${y}-${m}`;
      const rows = byYM.get(key);

      if (!rows || rows.length === 0){
        cells.push({
          key,
          year: y,
          month: m,
          missing: true,
          monthMax: null,
          monthMin: null,
          daily: []
        });
        continue;
      }

      rows.sort((a,b) => a.day - b.day);

      cells.push({
        key,
        year: y,
        month: m,
        missing: false,
        monthMax: d3.max(rows, r => r.max),
        monthMin: d3.min(rows, r => r.min),
        daily: rows.map(r => ({ day: r.day, max: r.max, min: r.min }))
      });
    }
  }
  return cells;
}

// ==========================
// Main
// ==========================
d3.csv(CSV_PATH, parseRow).then(raw => {
  rawAll = raw;

  // UI refs
  const startSel = d3.select("#startYear");
  const endSel   = d3.select("#endYear");
  const titleEl  = d3.select("#title");

  d3.select(".controls").on("click", (event) => event.stopPropagation());

  // Populate year dropdowns based on full dataset extent
  const yearExtent = d3.extent(rawAll, d => d.year);
  const allYears = d3.range(yearExtent[0], yearExtent[1] + 1);

  startSel.selectAll("option").data(allYears).join("option")
    .attr("value", d => d)
    .text(d => d);

  endSel.selectAll("option").data(allYears).join("option")
    .attr("value", d => d)
    .text(d => d);

  // Default selection: last 10 years (or fewer)
  const maxY = yearExtent[1];
  const minY = Math.max(yearExtent[0], maxY - 9);

  startSel.property("value", minY);
  endSel.property("value", maxY);

  function setTitle(startYear, endYear){
    titleEl.text(`Hong Kong Monthly Temperature (${startYear}–${endYear})`);
  }

  function onYearChange(){
    let s = +startSel.property("value");
    let e = +endSel.property("value");
    if (s > e) [s, e] = [e, s];
    startSel.property("value", s);
    endSel.property("value", e);
    render(s, e);
  }

  startSel.on("change", onYearChange);
  endSel.on("change", onYearChange);

  // Reset button
  d3.select("#resetBtn").on("click", (event) => {
    event.stopPropagation();
    startSel.property("value", minY);
    endSel.property("value", maxY);
    render(minY, maxY);
  });

  const globalVals = rawAll.flatMap(d => [d.max, d.min]);
  const globalDomain = [d3.min(globalVals), d3.max(globalVals)];

  // Initial render
  render(minY, maxY);

  // ==========================
  // Render
  // ==========================
  function render(startYear, endYear){
    setTitle(startYear, endYear);

    // Clear previous chart
    d3.select("#chart").selectAll("*").remove();

    const years  = d3.range(startYear, endYear + 1);
    const months = d3.range(0, 12);

    const data = rawAll.filter(d => d.year >= startYear && d.year <= endYear);
    const cells = buildMonthCellsFilled(data, years);

    const extraRight = 120;
    const width = margin.left + years.length * cellW + margin.right + extraRight;
    const height = margin.top + months.length * cellH + margin.bottom;

    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Toggle mode on click anywhere inside chart
    svg.on("click", () => {
      mode = (mode === "max") ? "min" : "max";
      d3.select("#modeLabel").text(mode.toUpperCase());
      updateColors();
      updateLegendTitle();
    });

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(years)
      .range([0, years.length * cellW])
      .paddingInner(0.15);

    const y = d3.scaleBand()
      .domain(months)
      .range([0, months.length * cellH])
      .paddingInner(0.15);

    // Stable color scale (global)
    const color = d3.scaleSequential()
      .domain(globalDomain)
      .interpolator(t => d3.interpolateRdYlBu(1 - t))

    // Dynamic tick skipping when many years
    let step = 1;
    if (years.length > 20) step = 4;
    else if (years.length > 12) step = 2;

    const tickYears = years.filter((_, i) => i % step === 0);

    // Axes
    g.append("g")
      .attr("class","axis")
      .call(d3.axisTop(x).tickSize(0).tickValues(tickYears))
      .call(g => g.selectAll("text").attr("dy","-0.5em"));

    g.append("g")
      .attr("class","axis")
      .call(d3.axisLeft(y).tickFormat(m => MONTH_NAMES[m]).tickSize(0))
      .call(g => g.selectAll("text").attr("dx","-0.4em"));

    const tooltip = d3.select("#tooltip");

    const cellG = g.selectAll(".cellG")
      .data(cells, d => d.key)
      .join("g")
      .attr("class","cellG")
      .attr("transform", d => `translate(${x(d.year)},${y(d.month)})`);

    const rect = cellG.append("rect")
      .attr("class","cell")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("stroke", "rgba(0,0,0,0.12)")
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(formatTooltip(d))
          .style("left", (event.pageX + 12) + "px")
          .style("top",  (event.pageY + 12) + "px");
        event.stopPropagation();
      })
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .on("click", (event) => {
        // prevent double toggle
        event.stopPropagation();
        mode = (mode === "max") ? "min" : "max";
        d3.select("#modeLabel").text(mode.toUpperCase());
        updateColors();
        updateLegendTitle();
      });

    cellG.filter(d => !d.missing)
      .append("g")
      .attr("class","sparkline")
      .each(function(d){
        const w = x.bandwidth();
        const h = y.bandwidth();
        const innerW = w - 2 * sparkPad;
        const innerH = h - 2 * sparkPad;

        const days = d.daily.map(p => p.day);

        const sx = d3.scaleLinear()
          .domain([d3.min(days), d3.max(days)])
          .range([sparkPad, sparkPad + innerW]);

        const tempExtent = d3.extent(d.daily.flatMap(p => [p.min, p.max]));
        const sy = d3.scaleLinear()
          .domain(tempExtent)
          .range([sparkPad + innerH, sparkPad]);

        const lineMax = d3.line()
          .x(p => sx(p.day))
          .y(p => sy(p.max));

        const lineMin = d3.line()
          .x(p => sx(p.day))
          .y(p => sy(p.min));

        const gg = d3.select(this);

        gg.append("path").datum(d.daily).attr("class","maxLine").attr("d", lineMax);
        gg.append("path").datum(d.daily).attr("class","minLine").attr("d", lineMin);
      });

    // Legend
    const legendW = 12;
    const legendH = 220;

    const legendG = svg.append("g")
      .attr("class","legend")
      .attr("transform", `translate(${width - margin.right - 80},${margin.top})`);

    const defs = svg.append("defs");
    const gradId = "tempGrad";
    const linearGrad = defs.append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%").attr("x2", "0%")
      .attr("y1", "100%").attr("y2", "0%");

    (function updateGradient(){
      linearGrad.selectAll("stop").remove();
      const [v0, v1] = color.domain();
      const stops = d3.range(0, 1.0001, 0.1);
      stops.forEach(t => {
        const v = v0 + t * (v1 - v0);
        linearGrad.append("stop")
          .attr("offset", `${t * 100}%`)
          .attr("stop-color", color(v));
      });
    })();

    legendG.append("rect")
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("rx", 6)
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "rgba(0,0,0,0.15)");

    const legendScale = d3.scaleLinear()
      .domain(color.domain())
      .range([legendH, 0]);

    const legendAxis = legendG.append("g")
      .attr("transform", `translate(${legendW + 10},0)`)
      .call(d3.axisRight(legendScale).ticks(6));

    const legendTitle = legendG.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-weight", 600);

    function updateLegendTitle(){
      legendTitle.text(`${mode === "max" ? "Monthly Max" : "Monthly Min"} (°C)`);
    }

    function updateColors(){
      rect.attr("fill", d => {
        if (d.missing) return "#f3f3f3";
        return color(currentValue(d));
      });
    }

    updateColors();
    updateLegendTitle();
  }
});

const downloadBtn = document.getElementById("downloadBtn");

if (downloadBtn) {
  downloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const svgNode = document.querySelector("#chart svg");
    if (!svgNode) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgNode);

    const cssText = Array.from(document.styleSheets)
      .map((ss) => {
        try {
          return Array.from(ss.cssRules).map((r) => r.cssText).join("\n");
        } catch {
          return ""; 
        }
      })
      .join("\n");

    svgString = svgString.replace(
      /<svg([^>]*)>/,
      `<svg$1><style>${cssText}</style>`
    );

    // Convert SVG -> Image -> Canvas -> PNG
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const bbox = svgNode.getBBox();

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(bbox.width + 200);  
      canvas.height = Math.ceil(bbox.height + 100);

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = "hong_kong_temperature_matrix.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = url;
  });
}


window.addEventListener("load", () => {
  const themeBtn = document.getElementById("themeToggle");
  if (!themeBtn) return;

  themeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    document.body.classList.toggle("dark-mode");

    themeBtn.textContent = document.body.classList.contains("dark-mode")
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";

    console.log("dark mode now:", document.body.classList.contains("dark-mode"));
  });
});
