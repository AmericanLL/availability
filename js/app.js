const params = new URLSearchParams(window.location.search);
const district = params.get("district") || "or-siuslaw-central-coast";
const DATA_URL = `data/districts/${district}.json`;

let activeDateIndex = null;

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function countClass(value) {
  const n = Number(value);
  if (n <= 0) return "full";
  if (n <= 3) return "limited";
  if (n <= 8) return "some";
  return "available";
}

function dateParts(label) {
  const parts = String(label).split(" ");
  return { month: parts[0] || "", day: parts[1] || "" };
}

function isWeekend(dow) {
  return dow === "Sat" || dow === "Sun";
}

function isNewMonth(data, i) {
  if (i === 0) return false;
  return dateParts(data.dates[i]).month !== dateParts(data.dates[i - 1]).month;
}

function thClasses(data, i) {
  const dow = data.days_of_week ? data.days_of_week[i] : "";
  return [
    isWeekend(dow) ? "weekend-col" : "",
    isNewMonth(data, i) ? "new-month" : "",
    activeDateIndex === i ? "active-date" : ""
  ].join(" ");
}

function tdClasses(data, i, baseClass = "") {
  const dow = data.days_of_week ? data.days_of_week[i] : "";
  return [
    baseClass,
    isWeekend(dow) ? "weekend-col" : "",
    isNewMonth(data, i) ? "new-month" : "",
    activeDateIndex === i ? "active-date" : ""
  ].join(" ");
}

function renderHeader(data) {
  return data.dates.map((date, i) => {
    const dow = data.days_of_week ? data.days_of_week[i] : "";
    const parts = dateParts(date);
    return `
      <th class="${thClasses(data, i)}" onclick="selectDate(${i})">
        <span class="dow">${dow}</span>
        <span class="date-month">${parts.month}</span>
        <span class="date-day">${parts.day}</span>
      </th>
    `;
  }).join("");
}

function siteStatusLabel(status) {
  if (status === "available") return "✓";
  if (status === "full") return "×";
  return status;
}

function renderMasterTable(data) {
  const header = renderHeader(data);
  const districtByFacility = new Map(data.district_calendar.map(row => [row.facility, row]));

  const rows = data.facilities.map(facility => {
    const id = slugify(facility.name);
    const districtRow = districtByFacility.get(facility.name);
    const counts = districtRow ? districtRow.available_counts : [];

    const facilityCells = counts.map((count, i) => `
      <td class="${tdClasses(data, i, `status ${countClass(count)}`)}" onclick="selectDate(${i}); event.stopPropagation();">${count}</td>
    `).join("");

    const siteRows = facility.sites.map(site => {
      const siteCells = site.days.map((status, i) => `
        <td class="${tdClasses(data, i, `status ${status}`)}">${siteStatusLabel(status)}</td>
      `).join("");

      return `
        <tr class="site-row site-for-${id}" data-parent="${id}" style="display: none;">
          <td class="site-name">
            <strong>${site.site}</strong>
            ${site.loop ? `<span class="site-meta">${site.loop}</span>` : ""}
            ${site.site_type ? `<span class="site-meta">${site.site_type}</span>` : ""}
          </td>
          ${siteCells}
        </tr>
      `;
    }).join("");

    return `
      <tr class="facility-row" id="${id}" data-facility="${id}" onclick="toggleFacility('${id}')">
        <td class="facility-name">
          <span class="toggle-icon" id="icon-${id}">▶</span>
          <span class="facility-title">${facility.name}</span>
          <span class="site-count">${facility.sites.length} sites</span>
        </td>
        ${facilityCells}
      </tr>
      ${siteRows}
    `;
  }).join("");

  return `
    <div class="facility-header-row">
      <div>
        <h2>District 60-Day Availability</h2>
        <p class="helper">Click a date or availability count to highlight that date. Expand facilities to see site-level availability.</p>
        <div class="legend">
          <span><b class="legend-box available"></b> 9+ sites</span>
          <span><b class="legend-box some"></b> 4–8 sites</span>
          <span><b class="legend-box limited"></b> 1–3 sites</span>
          <span><b class="legend-box full"></b> 0 sites</span>
        </div>
      </div>
      <div class="facility-actions">
        <button type="button" onclick="expandAllFacilities()">Expand All</button>
        <button type="button" onclick="collapseAllFacilities()">Collapse All</button>
        <button type="button" onclick="clearDateHighlight()">Clear Highlight</button>
      </div>
    </div>

    <div class="table-wrap master-table-wrap">
      <table class="master-table">
        <thead>
          <tr>
            <th>Facility / Site</th>
            ${header}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function toggleFacility(id) {
  const rows = document.querySelectorAll(`.site-for-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  const anyHidden = Array.from(rows).some(row => row.style.display === "none");

  rows.forEach(row => row.style.display = anyHidden ? "table-row" : "none");
  if (icon) icon.textContent = anyHidden ? "▼" : "▶";
}

function expandAllFacilities() {
  document.querySelectorAll(".site-row").forEach(row => row.style.display = "table-row");
  document.querySelectorAll(".toggle-icon").forEach(icon => icon.textContent = "▼");
}

function collapseAllFacilities() {
  document.querySelectorAll(".site-row").forEach(row => row.style.display = "none");
  document.querySelectorAll(".toggle-icon").forEach(icon => icon.textContent = "▶");
}

function selectDate(index) {
  activeDateIndex = index;
  document.querySelectorAll(".active-date").forEach(el => el.classList.remove("active-date"));

  document.querySelectorAll(".master-table tr").forEach(row => {
    const cell = row.children[index + 1];
    if (cell) cell.classList.add("active-date");
  });
}

function clearDateHighlight() {
  activeDateIndex = null;
  document.querySelectorAll(".active-date").forEach(el => el.classList.remove("active-date"));
}

fetch(DATA_URL)
  .then(response => {
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
    return response.json();
  })
  .then(data => {
    document.getElementById("availability-app").innerHTML = `
      <h1>${data.district_name}</h1>
      <p class="updated">Last updated: ${data.last_updated}</p>
      ${renderMasterTable(data)}
    `;
  })
  .catch(error => {
    document.getElementById("availability-app").innerHTML =
      `<p>Availability data could not be loaded for <strong>${district}</strong>.</p>`;
    console.error(error);
  });
