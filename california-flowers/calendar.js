// Bloom Calendar — D3 stacked bar histogram
// Exports: initCalendar(data, onFilter)

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COLOR_MAP = {
  orange: "#e8842c", yellow: "#e8c72c", purple: "#8b5ab5", blue: "#4a7cb5",
  red: "#c0392b", pink: "#d1729b", white: "#c8c3bb", green: "#5a8a5c"
};

const STACK_FIELDS = [
  { key: "color", label: "Color" },
  { key: "plantType", label: "Type" },
  { key: "sun", label: "Sun" },
  { key: "water", label: "Water" },
  { key: "droughtTolerant", label: "Drought" }
];

const TYPE_COLORS = d3.scaleOrdinal()
  .domain(["annual","perennial","shrub","tree","vine","grass"])
  .range(["#e8842c","#4a7c59","#8b5ab5","#5a8a5c","#c0392b","#b5944a"]);

const SUN_COLORS = { full: "#e8c72c", partial: "#b5944a", shade: "#6b6560" };
const WATER_COLORS = { low: "#e8c72c", moderate: "#4a7cb5", high: "#2980b9" };
const DROUGHT_COLORS = { true: "#c0392b", false: "#4a7cb5" };

let currentStackField = "color";
let activeMonth = null;
let activeSegment = null; // { month, value }

function getStackColor(field, value) {
  if (field === "color") return COLOR_MAP[value] || "#999";
  if (field === "plantType") return TYPE_COLORS(value);
  if (field === "sun") return SUN_COLORS[value] || "#999";
  if (field === "water") return WATER_COLORS[value] || "#999";
  if (field === "droughtTolerant") return DROUGHT_COLORS[value] || "#999";
  return "#999";
}

function buildStackData(data, field) {
  // For each month, count flowers by the stack field value
  const months = d3.range(1, 13).map(m => {
    const blooming = data.filter(f => f.bloomMonths.includes(m));
    const counts = {};
    blooming.forEach(f => {
      let values;
      if (field === "color") {
        values = f.colors;
      } else if (field === "droughtTolerant") {
        values = [String(f[field])];
      } else {
        values = [f[field]];
      }
      values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    });
    return { month: m, counts };
  });

  // Collect all unique values
  const allValues = [...new Set(months.flatMap(m => Object.keys(m.counts)))].sort();
  return { months, allValues };
}

function initCalendar(data, onFilter) {
  const container = d3.select("#calendar");
  const toggles = d3.select("#stack-toggles");

  // Create tooltip
  const tooltip = d3.select("body").append("div").attr("class", "calendar-tooltip");

  // Build toggle buttons
  STACK_FIELDS.forEach(sf => {
    toggles.append("button")
      .attr("class", `toggle-btn${sf.key === currentStackField ? " active" : ""}`)
      .attr("data-field", sf.key)
      .text(sf.label)
      .on("click", function() {
        currentStackField = sf.key;
        toggles.selectAll(".toggle-btn").classed("active", false);
        d3.select(this).classed("active", true);
        render(data);
      });
  });

  function render(filteredData) {
    container.selectAll("*").remove();
    const { months, allValues } = buildStackData(filteredData || data, currentStackField);

    const margin = { top: 8, right: 12, bottom: 28, left: 36 };
    const width = container.node().getBoundingClientRect().width;
    const height = 180;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(d3.range(1, 13)).range([0, innerW]).padding(0.2);
    const maxTotal = d3.max(months, m => d3.sum(Object.values(m.counts))) || 1;
    const y = d3.scaleLinear().domain([0, maxTotal]).nice().range([innerH, 0]);

    // Y axis
    g.append("g").attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke-dasharray", "2,3").attr("opacity", 0.4));

    // Bars
    months.forEach(({ month, counts }) => {
      let y0 = 0;
      allValues.forEach(val => {
        const count = counts[val] || 0;
        if (count === 0) return;
        const isActive = activeSegment && activeSegment.month === month && activeSegment.value === val;
        g.append("rect")
          .attr("class", "bar-segment")
          .attr("x", x(month))
          .attr("y", y(y0 + count))
          .attr("width", x.bandwidth())
          .attr("height", y(y0) - y(y0 + count))
          .attr("fill", getStackColor(currentStackField, val))
          .attr("opacity", isActive ? 1 : activeSegment ? 0.4 : 0.85)
          .on("mouseover", (event) => {
            const label = currentStackField === "droughtTolerant"
              ? (val === "true" ? "Drought-tolerant" : "Needs water")
              : val;
            tooltip.style("opacity", 1)
              .html(`${MONTHS[month - 1]} · ${label}: <b>${count}</b>`);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 12) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0))
          .on("click", () => {
            if (activeSegment && activeSegment.month === month && activeSegment.value === val) {
              activeSegment = null;
              activeMonth = null;
            } else {
              activeSegment = { month, value: val };
              activeMonth = month;
            }
            render(data);
            onFilter(getCalendarFilter());
          });
        y0 += count;
      });
    });

    // Month labels
    g.selectAll(".month-label")
      .data(d3.range(1, 13))
      .join("text")
      .attr("class", d => `month-label${activeMonth === d ? " active" : ""}`)
      .attr("x", d => x(d) + x.bandwidth() / 2)
      .attr("y", innerH + 20)
      .attr("text-anchor", "middle")
      .text(d => MONTHS[d - 1])
      .on("click", (event, d) => {
        activeSegment = null;
        if (activeMonth === d) {
          activeMonth = null;
        } else {
          activeMonth = d;
        }
        render(data);
        onFilter(getCalendarFilter());
      });
  }

  function getCalendarFilter() {
    if (activeSegment) {
      return { month: activeSegment.month, field: currentStackField, value: activeSegment.value };
    }
    if (activeMonth) {
      return { month: activeMonth };
    }
    return null;
  }

  function updateCalendar(filteredData) {
    render(filteredData || data);
  }

  // Resize handling
  window.addEventListener("resize", () => render(data));

  render(data);

  return { updateCalendar, getCalendarFilter, clearCalendarFilter() {
    activeMonth = null;
    activeSegment = null;
    render(data);
  }};
}
