
window.addEventListener("error", function(event) {
  const app = document.getElementById("availability-app");
  if (app) {
    app.innerHTML = `
      <h1>JavaScript error</h1>
      <p>${event.message}</p>
      <p class="updated">${event.filename}:${event.lineno}:${event.colno}</p>
    `;
  }
});

const app = document.getElementById("availability-app");

const params = new URLSearchParams(window.location.search);
const district = params.get("district") || "or-siuslaw-central-coast";
const DATA_URL = `data/districts/${district}.json`;

let activeDateIndex = null;
let showAvailableOnly = false;
let filterElectric = false;
let filterTentOnly = false;
let filterRvTrailer = false;
let filterAccessible = false;
let filterPartySize = 0;
let filterMinLength = 0;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateParts(label) {
  const parts = String(label).split(" ");
  return {
    month: parts[0] || "",
    day: parts[1] || "",
  };
}

function isWeekend(day) {
  return day === "Sat" || day === "Sun";
}

function isNewMonth(dates, index) {
  if (index === 0) return false;
  const current = dateParts(dates[index]).month;
  const previous = dateParts(dates[index - 1]).month;
  return current !== previous;
}

function thClasses(data, index) {
  const classes = [];

  if (isWeekend(data.days_of_week[index])) {
    classes.push("weekend-col");
  }

  if (isNewMonth(data.dates, index)) {
    classes.push("new-month");
  }

  if (activeDateIndex === index) {
    classes.push("active-date");
  }

  return classes.join(" ");
}

function tdClasses(data, index, extraClass = "") {
  const classes = [];

  if (extraClass) {
    classes.push(extraClass);
  }

  if (isWeekend(data.days_of_week[index])) {
    classes.push("weekend-col");
  }

  if (isNewMonth(data.dates, index)) {
    classes.push("new-month");
  }

  if (activeDateIndex === index) {
    classes.push("active-date");
  }

  return classes.join(" ");
}

function countClass(counts) {
  if (counts.available > 8) return "available";
  if (counts.available > 3) return "some";
  if (counts.available > 0) return "limited";
  return "reserved";
}

function countLabel(counts) {
  return String(counts.available || 0);
}

function statusClass(status) {
  const group = status?.group || "missing";

  if (group === "available") return "available";
  if (group === "reserved") return "reserved";
  if (group === "first_come") return "first-come";
  if (group === "not_reservable") return "not-reservable";
  if (group === "closed") return "closed";

  return "unavailable";
}

function statusLabel(status) {
  if (!status) return "";
  return status.code || "";
}

function siteHasOnlineAvailability(site) {
  return site.days.some((status) => status && status.group === "available");
}

function siteMatchesMetadataFilters(site) {
  const metadata = site.metadata || {};

  if (filterElectric && metadata.is_electric !== true) {
    return false;
  }

  if (filterTentOnly && metadata.is_tent_only !== true) {
    return false;
  }

  if (filterRvTrailer) {
    const allowsRv = metadata.allows_rv === true;
    const allowsTrailer = metadata.allows_trailer === true;

    if (!allowsRv && !allowsTrailer) {
      return false;
    }
  }

  if (filterAccessible && metadata.accessible !== true) {
    return false;
  }

  if (filterPartySize > 0) {
    const people = Number(metadata.max_people || 0);

    if (!people || people < filterPartySize) {
      return false;
    }
  }

  if (filterMinLength > 0) {
    const length = Number(metadata.max_vehicle_length || metadata.max_equipment_length || 0);

    if (!length || length < filterMinLength) {
      return false;
    }
  }

  return true;
}

function renderHeader(data) {
  return data.dates
    .map((date, index) => {
      const parts = dateParts(date);
      const classes = thClasses(data, index);

      return `
        <th class="${classes}" onclick="selectDate(${index})" title="Highlight ${date}">
          <div class="dow">${data.days_of_week[index]}</div>
          <div class="date-month">${parts.month}</div>
          <div class="date-day">${parts.day}</div>
        </th>
      `;
    })
    .join("");
}

function renderLegend() {
  return `
    <div class="legend">
      <span><strong>Collapsed facility rows show online-reservable available site counts only.</strong></span>
      <span><span class="legend-box available"></span>9+ available</span>
      <span><span class="legend-box some"></span>4-8 available</span>
      <span><span class="legend-box limited"></span>1-3 available</span>
      <span><span class="legend-box reserved"></span>0 available</span>
      <span><span class="legend-box first-come"></span>FF appears on expanded site rows</span>
      <span>Weekends shaded</span>
    </div>
  `;
}

function renderMasterTable(data) {
  let html = `
    <section>
      <div class="facility-header-row">
        <h2>District 60-Day Availability</h2>
        <div class="facility-actions">
          <label class="filter-toggle">
            <input type="checkbox" onchange="setAvailableOnlyFilter(this.checked)">
            Online availability
          </label>

          <label class="filter-toggle">
            <input type="checkbox" onchange="setElectricFilter(this.checked)">
            Electric
          </label>

          <select class="filter-select" onchange="setPartySizeFilter(this.value)">
            <option value="0">Any party size</option>
            <option value="2">2+ people</option>
            <option value="4">4+ people</option>
            <option value="6">6+ people</option>
            <option value="8">8+ people</option>
            <option value="10">10+ people</option>
            <option value="20">20+ people</option>
            <option value="30">30+ people</option>
          </select>

          <label class="filter-toggle">
            <input type="checkbox" onchange="setTentOnlyFilter(this.checked)">
            Tent only
          </label>

          <label class="filter-toggle">
            <input type="checkbox" onchange="setRvTrailerFilter(this.checked)">
            RV / Trailer
          </label>

          <label class="filter-toggle">
            <input type="checkbox" onchange="setAccessibleFilter(this.checked)">
            Accessible
          </label>

          <select class="filter-select" onchange="setLengthFilter(this.value)">
            <option value="0">Any vehicle length</option>
            <option value="20">20+ ft</option>
            <option value="25">25+ ft</option>
            <option value="30">30+ ft</option>
            <option value="35">35+ ft</option>
            <option value="40">40+ ft</option>
            <option value="45">45+ ft</option>
            <option value="50">50+ ft</option>
          </select>

          <button onclick="expandAllFacilities()">Expand All</button>
          <button onclick="collapseAllFacilities()">Collapse All</button>
          <button onclick="clearDateHighlight()">Clear Highlight</button>
        </div>
      </div>

      ${renderLegend()}

      <div class="table-wrap master-table-wrap">
        <table class="availability-table master-table">
          <thead>
            <tr>
              <th>Facility / Site</th>
              ${renderHeader(data)}
            </tr>
          </thead>
          <tbody>
  `;

  data.facilities.forEach((facility, facilityIndex) => {
    const facilityKey = `facility-${facilityIndex}`;

    html += `
      <tr class="facility-row" onclick="toggleFacility('${facilityKey}')">
        <td class="facility-name">
          <span class="toggle-icon" id="${facilityKey}-icon">▶</span>
          <span class="facility-title">${facility.name}</span>
          <span class="site-count">${facility.sites.length} sites</span>
          <a
            class="booking-link"
            href="${facility.booking_url || `https://www.recreation.gov/camping/campgrounds/${facility.facility_id}`}"
            target="_blank"
            rel="noopener noreferrer"
            onclick="event.stopPropagation();"
          >
            Open on Recreation.gov
          </a>
        </td>
    `;

    facility.calendar.forEach((counts, dateIndex) => {
      const label = countLabel(counts);
      const klass = countClass(counts);
      const title = [
        `${facility.name}`,
        `${data.dates[dateIndex]}`,
        `${counts.available} available`,
        `${counts.first_come} FF`,
        `${counts.reserved} reserved`,
        `${counts.not_reservable} not reservable`,
        `${counts.closed} closed`,
      ].join(" · ");

      html += `<td class="${tdClasses(data, dateIndex, klass)}" title="${title}">${label}</td>`;
    });

    html += `</tr>`;

    facility.sites.forEach((site) => {
      const hasAvailability = siteHasOnlineAvailability(site);

      html += `
        <tr
          class="site-row ${facilityKey}"
          data-facility-key="${facilityKey}"
          data-facility-index="${facilityIndex}"
          data-site-index="${facility.sites.indexOf(site)}"
          data-expanded="false"
          data-has-availability="${hasAvailability}"
          style="display: none;"
        >
          <td class="site-name">
            <div><strong>Site ${site.site}</strong></div>
            <div class="site-meta">
              ${site.metadata_summary || site.site_type || ""}
            </div>
          </td>
      `;

      site.days.forEach((status, dateIndex) => {
        const klass = statusClass(status);
        const label = statusLabel(status);
        const title = `${data.dates[dateIndex]} · Site ${site.site} · ${status.label || ""}`;

        html += `<td class="${tdClasses(data, dateIndex, klass)} status" title="${title}">${label}</td>`;
      });

      html += `</tr>`;
    });
  });

  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;

  return html;
}

function toggleFacility(facilityKey) {
  const rows = document.querySelectorAll(`.${facilityKey}`);
  const icon = document.getElementById(`${facilityKey}-icon`);

  if (!rows.length) return;

  const isExpanded = rows[0].dataset.expanded === "true";
  const nextExpanded = !isExpanded;

  rows.forEach((row) => {
    row.dataset.expanded = nextExpanded ? "true" : "false";
  });

  if (icon) {
    icon.textContent = nextExpanded ? "▼" : "▶";
  }

  applySiteFilters();
  applyDateHighlight();
}

function expandAllFacilities() {
  document.querySelectorAll(".site-row").forEach((row) => {
    row.dataset.expanded = "true";
  });

  document.querySelectorAll(".toggle-icon").forEach((icon) => {
    icon.textContent = "▼";
  });

  applySiteFilters();
  applyDateHighlight();
}

function collapseAllFacilities() {
  document.querySelectorAll(".site-row").forEach((row) => {
    row.dataset.expanded = "false";
    row.style.display = "none";
  });

  document.querySelectorAll(".toggle-icon").forEach((icon) => {
    icon.textContent = "▶";
  });

  applyDateHighlight();
}

function setAvailableOnlyFilter(value) {
  showAvailableOnly = value;
  applySiteFilters();
  applyDateHighlight();
}

function setElectricFilter(value) {
  filterElectric = value;
  applySiteFilters();
  applyDateHighlight();
}

function setPartySizeFilter(value) {
  filterPartySize = Number(value || 0);
  applySiteFilters();
  applyDateHighlight();
}

function setTentOnlyFilter(value) {
  filterTentOnly = value;
  applySiteFilters();
  applyDateHighlight();
}

function setRvTrailerFilter(value) {
  filterRvTrailer = value;
  applySiteFilters();
  applyDateHighlight();
}

function setAccessibleFilter(value) {
  filterAccessible = value;
  applySiteFilters();
  applyDateHighlight();
}

function setLengthFilter(value) {
  filterMinLength = Number(value || 0);
  applySiteFilters();
  applyDateHighlight();
}

function applySiteFilters() {
  document.querySelectorAll(".site-row").forEach((row) => {
    const isExpanded = row.dataset.expanded === "true";
    const hasAvailability = row.dataset.hasAvailability === "true";
    const siteIndex = Number(row.dataset.siteIndex);
    const facilityIndex = Number(row.dataset.facilityIndex);

    if (!isExpanded) {
      row.style.display = "none";
      return;
    }

    if (showAvailableOnly && !hasAvailability) {
      row.style.display = "none";
      return;
    }

    const site = window.availabilityData.facilities[facilityIndex].sites[siteIndex];

    if (!siteMatchesMetadataFilters(site)) {
      row.style.display = "none";
      return;
    }

    row.style.display = "table-row";
  });
}

function clearDateHighlight() {
  activeDateIndex = null;
  document.querySelectorAll(".active-date").forEach((cell) => {
    cell.classList.remove("active-date");
  });
}

function selectDate(index) {
  activeDateIndex = index;
  applyDateHighlight();
}

function applyDateHighlight() {
  document.querySelectorAll(".active-date").forEach((cell) => {
    cell.classList.remove("active-date");
  });

  if (activeDateIndex === null) return;

  document.querySelectorAll("tr").forEach((row) => {
    const cell = row.children[activeDateIndex + 1];
    if (cell) {
      cell.classList.add("active-date");
    }
  });
}

fetch(DATA_URL)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }
    return response.json();
  })
  .then((data) => {
    window.availabilityData = data;
    app.innerHTML = `
      <h1>${data.district_name}</h1>
      <p class="updated">Last updated: ${data.last_updated}</p>
      ${renderMasterTable(data)}
    `;
  })
  .catch((error) => {
    app.innerHTML = `
      <h1>Availability data could not be loaded</h1>
      <p>We could not load availability data for <strong>${district}</strong>.</p>
      <p class="updated">${error.message}</p>
    `;
  });
