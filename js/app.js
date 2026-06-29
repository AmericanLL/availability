const params = new URLSearchParams(window.location.search);
const district = params.get("district") || "or-siuslaw-central-coast";
const DATA_URL = `data/districts/${district}.json`;

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function countClass(value) {
  const n = Number(value);
  if (n <= 0) return "full";
  if (n <= 3) return "limited";
  if (n <= 8) return "some";
  return "available";
}

function dateHeader(label) {
  const parts = String(label).split(" ");
  const month = parts[0] || "";
  const day = parts[1] || "";
  return `<span class="date-month">${month}</span><span class="date-day">${day}</span>`;
}

function renderDistrictCalendar(data) {
  const header = data.dates.map((date, i) => {
    const dow = data.days_of_week ? data.days_of_week[i] : "";
    return `<th><span class="dow">${dow}</span>${dateHeader(date)}</th>`;
  }).join("");

  const body = data.district_calendar.map(row => {
    const id = slugify(row.facility);

    const cells = row.available_counts.map(count => `
      <td class="status ${countClass(count)}">${count}</td>
    `).join("");

    return `
      <tr>
        <td><a href="#${id}" onclick="openFacility('${id}')">${row.facility}</a></td>
        ${cells}
      </tr>
    `;
  }).join("");

  return `
    <h2>District 60-Day Availability</h2>
    <p class="helper">Numbers show available sites by facility and date.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Facility</th>
            ${header}
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function siteStatusLabel(status) {
  if (status === "available") return "Open";
  if (status === "full") return "Full";
  return status;
}

function renderFacilityCalendar(facility, dates, daysOfWeek) {
  const id = slugify(facility.name);

  const header = dates.map((date, i) => {
    const dow = daysOfWeek ? daysOfWeek[i] : "";
    return `<th><span class="dow">${dow}</span>${dateHeader(date)}</th>`;
  }).join("");

  const body = facility.sites.map(row => {
    const cells = row.days.map(status => `
      <td class="status ${status}">${siteStatusLabel(status)}</td>
    `).join("");

    return `
      <tr>
        <td>
          <strong>${row.site}</strong>
          ${row.loop ? `<span class="site-meta">${row.loop}</span>` : ""}
          ${row.site_type ? `<span class="site-meta">${row.site_type}</span>` : ""}
        </td>
        ${cells}
      </tr>
    `;
  }).join("");

  return `
    <details id="${id}" class="facility-detail">
      <summary>${facility.name} <span class="site-count">(${facility.sites.length} sites)</span></summary>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Site</th>
              ${header}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </details>
  `;
}

function renderFacilities(data) {
  return `
    <div class="facility-header-row">
      <div>
        <h2>Facility Detail</h2>
        <p class="helper">Open one or more facilities to compare site-by-site availability.</p>
      </div>
      <div class="facility-actions">
        <button type="button" onclick="expandAllFacilities()">Expand All</button>
        <button type="button" onclick="collapseAllFacilities()">Collapse All</button>
      </div>
    </div>

    ${data.facilities
      .map(facility => renderFacilityCalendar(facility, data.dates, data.days_of_week))
      .join("")}
  `;
}

function expandAllFacilities() {
  document.querySelectorAll(".facility-detail").forEach(el => {
    el.open = true;
  });
}

function collapseAllFacilities() {
  document.querySelectorAll(".facility-detail").forEach(el => {
    el.open = false;
  });
}

function openFacility(id) {
  const el = document.getElementById(id);
  if (el) {
    el.open = true;
  }
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
      ${renderDistrictCalendar(data)}
      ${renderFacilities(data)}
    `;
  })
  .catch(error => {
    document.getElementById("availability-app").innerHTML =
      `<p>Availability data could not be loaded for <strong>${district}</strong>.</p>`;
    console.error(error);
  });
