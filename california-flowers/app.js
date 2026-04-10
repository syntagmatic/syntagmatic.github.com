// App — filtering, search, cards
(async function() {
  const data = await d3.json("data/flowers.json");

  // State
  const filters = {
    search: "",
    color: null,
    plantType: null,
    sun: null,
    water: null,
    droughtTolerant: null,
    calendar: null // { month, field?, value? }
  };

  // Calendar
  const calendar = initCalendar(data, (calFilter) => {
    filters.calendar = calFilter;
    applyFilters();
  });

  // --- Facet setup ---
  const facetConfig = {
    color: { el: "#facet-color", values: [...new Set(data.flatMap(f => f.colors))].sort(), isDot: true },
    plantType: { el: "#facet-plantType", values: [...new Set(data.map(f => f.plantType))].sort() },
    sun: { el: "#facet-sun", values: ["full", "partial", "shade"] },
    water: { el: "#facet-water", values: ["low", "moderate", "high"] },
    droughtTolerant: { el: "#facet-droughtTolerant", values: ["true", "false"],
      labels: { "true": "Tolerant", "false": "Needs water" } }
  };

  const COLOR_MAP = {
    orange: "#e8842c", yellow: "#e8c72c", purple: "#8b5ab5", blue: "#4a7cb5",
    red: "#c0392b", pink: "#d1729b", white: "#c8c3bb", green: "#5a8a5c"
  };

  Object.entries(facetConfig).forEach(([key, cfg]) => {
    const container = document.querySelector(`${cfg.el} .facet-options`);
    cfg.values.forEach(val => {
      const btn = document.createElement("button");
      btn.className = "facet-btn";
      btn.dataset.facet = key;
      btn.dataset.value = val;
      if (cfg.isDot) {
        const dot = document.createElement("span");
        dot.className = "color-dot";
        dot.style.backgroundColor = COLOR_MAP[val] || "#999";
        btn.appendChild(dot);
      }
      btn.appendChild(document.createTextNode(cfg.labels?.[val] || val));
      btn.addEventListener("click", () => {
        if (filters[key] === val) {
          filters[key] = null;
        } else {
          filters[key] = val;
        }
        applyFilters();
      });
      container.appendChild(btn);
    });
  });

  // Search
  document.getElementById("search-input").addEventListener("input", (e) => {
    filters.search = e.target.value.toLowerCase().trim();
    applyFilters();
  });

  // Clear all
  document.getElementById("clear-all").addEventListener("click", () => {
    filters.search = "";
    filters.color = null;
    filters.plantType = null;
    filters.sun = null;
    filters.water = null;
    filters.droughtTolerant = null;
    filters.calendar = null;
    document.getElementById("search-input").value = "";
    calendar.clearCalendarFilter();
    applyFilters();
  });

  // --- Filtering ---
  function getFiltered() {
    return data.filter(f => {
      if (filters.search) {
        const q = filters.search;
        if (!f.commonName.toLowerCase().includes(q) &&
            !f.scientificName.toLowerCase().includes(q) &&
            !f.family.toLowerCase().includes(q)) return false;
      }
      if (filters.color && !f.colors.includes(filters.color)) return false;
      if (filters.plantType && f.plantType !== filters.plantType) return false;
      if (filters.sun && f.sun !== filters.sun) return false;
      if (filters.water && f.water !== filters.water) return false;
      if (filters.droughtTolerant !== null) {
        if (String(f.droughtTolerant) !== filters.droughtTolerant) return false;
      }
      if (filters.calendar) {
        const cal = filters.calendar;
        if (cal.month && !f.bloomMonths.includes(cal.month)) return false;
        if (cal.field && cal.value) {
          if (cal.field === "color" && !f.colors.includes(cal.value)) return false;
          else if (cal.field === "droughtTolerant" && String(f[cal.field]) !== cal.value) return false;
          else if (cal.field !== "color" && cal.field !== "droughtTolerant" && f[cal.field] !== cal.value) return false;
        }
      }
      return true;
    });
  }

  function applyFilters() {
    const filtered = getFiltered();
    updateFacetHighlights();
    updateChips();
    renderCards(filtered);
    updateResultCount(filtered.length);
  }

  // --- Facet highlights ---
  function updateFacetHighlights() {
    document.querySelectorAll(".facet-btn").forEach(btn => {
      const key = btn.dataset.facet;
      const val = btn.dataset.value;
      btn.classList.toggle("active", filters[key] === val);
    });
  }

  // --- Chips ---
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function updateChips() {
    const container = document.getElementById("active-chips");
    container.innerHTML = "";
    const clearBtn = document.getElementById("clear-all");
    let hasFilters = false;

    function addChip(label, onRemove) {
      hasFilters = true;
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = label;
      const x = document.createElement("span");
      x.className = "chip-remove";
      x.textContent = "×";
      x.addEventListener("click", (e) => { e.stopPropagation(); onRemove(); applyFilters(); });
      chip.appendChild(x);
      container.appendChild(chip);
    }

    if (filters.search) {
      addChip(`"${filters.search}"`, () => { filters.search = ""; document.getElementById("search-input").value = ""; });
    }
    if (filters.color) addChip(filters.color, () => { filters.color = null; });
    if (filters.plantType) addChip(filters.plantType, () => { filters.plantType = null; });
    if (filters.sun) addChip(`sun: ${filters.sun}`, () => { filters.sun = null; });
    if (filters.water) addChip(`water: ${filters.water}`, () => { filters.water = null; });
    if (filters.droughtTolerant !== null) {
      const label = filters.droughtTolerant === "true" ? "drought-tolerant" : "needs water";
      addChip(label, () => { filters.droughtTolerant = null; });
    }
    if (filters.calendar) {
      const cal = filters.calendar;
      let label = MONTHS[cal.month - 1];
      if (cal.value) {
        const v = cal.field === "droughtTolerant"
          ? (cal.value === "true" ? "drought-tolerant" : "needs water")
          : cal.value;
        label += ` · ${v}`;
      }
      addChip(label, () => { filters.calendar = null; calendar.clearCalendarFilter(); });
    }

    clearBtn.classList.toggle("hidden", !hasFilters);
  }

  function updateResultCount(count) {
    document.getElementById("result-count").textContent = `${count} flower${count !== 1 ? "s" : ""}`;
  }

  // --- Cards ---
  const SUN_ICONS = { full: "☀️", partial: "⛅", shade: "☁️" };
  const WATER_ICONS = { low: "💧", moderate: "💧💧", high: "💧💧💧" };

  function renderCards(flowers) {
    const grid = document.getElementById("card-grid");
    grid.innerHTML = "";

    flowers.forEach(f => {
      const card = document.createElement("div");
      card.className = "flower-card";

      const heightFt = f.heightIn[1] >= 36
        ? `${Math.round(f.heightIn[0]/12)}–${Math.round(f.heightIn[1]/12)} ft`
        : `${f.heightIn[0]}–${f.heightIn[1]} in`;

      const bloomBar = Array.from({length: 12}, (_, i) =>
        `<div class="bloom-cell${f.bloomMonths.includes(i+1) ? " active" : ""}" title="${MONTHS[i]}"></div>`
      ).join("");

      const colorDots = f.colors.map(c =>
        `<span class="color-dot" style="background:${COLOR_MAP[c] || '#999'}" title="${c}"></span>`
      ).join("");

      card.innerHTML = `
        <div class="card-top">
          <div class="card-names">
            <div class="card-common">${f.commonName}</div>
            <div class="card-scientific">${f.scientificName}</div>
          </div>
          <div class="card-colors">${colorDots}</div>
        </div>
        <div class="card-bloom-bar">${bloomBar}</div>
        <div class="card-tags">
          <span class="card-tag">${f.plantType}</span>
          <span class="card-tag">${SUN_ICONS[f.sun] || ""} ${f.sun}</span>
          <span class="card-tag">${WATER_ICONS[f.water] || ""}</span>
          ${f.droughtTolerant ? '<span class="card-tag">🌵 drought ok</span>' : ""}
        </div>
        <div class="card-details">
          <div class="detail-row"><span class="detail-label">Family</span><span>${f.family}</span></div>
          <div class="detail-row"><span class="detail-label">Height</span><span>${heightFt}</span></div>
          <div class="detail-row"><span class="detail-label">Bloom</span><span>${f.bloomMonths.map(m => MONTHS[m-1]).join(", ")}</span></div>
          <div class="card-description">${f.description}</div>
        </div>
      `;

      card.addEventListener("click", () => card.classList.toggle("expanded"));
      grid.appendChild(card);
    });
  }

  // Initial render
  applyFilters();
})();
