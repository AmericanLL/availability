
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
      html += `
        <tr class="site-row ${facilityKey}" style="display: none;">
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

  const isHidden = rows[0].style.display === "none";

  rows.forEach((row) => {
    row.style.display = isHidden ? "table-row" : "none";
  });

  if (icon) {
    icon.textContent = isHidden ? "▼" : "▶";
  }

  applyDateHighlight();
}

function expandAllFacilities() {
  document.querySelectorAll(".site-row").forEach((row) => {
    row.style.display = "table-row";
  });

  document.querySelectorAll(".toggle-icon").forEach((icon) => {
    icon.textContent = "▼";
  });

  applyDateHighlight();
}

function collapseAllFacilities() {
  document.querySelectorAll(".site-row").forEach((row) => {
    row.style.display = "none";
  });

  document.querySelectorAll(".toggle-icon").forEach((icon) => {
    icon.textContent = "▶";
  });

  applyDateHighlight();
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
