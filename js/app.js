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
  return "available";
}

function renderSummary(data) {
  let rows = data.summary.map(row => `
    <tr>
      <td><a href="#${slugify(row.facility)}">${row.facility}</a></td>
      <td>${row.tonight}</td>
      <td>${row.next_7_available_nights}</td>
      <td>${row.next_14_available_nights}</td>
      <td>${row.next_30_available_nights}</td>
    </tr>
  `).join("");

  return `
    <h2>District Summary</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Facility</th>
            <th>Available Tonight</th>
            <th>Next 7 Days</th>
            <th>Next 14 Days</th>
            <th>Next 30 Days</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderDistrictCalendar(data) {
  let header = data.dates.map(date => `<th>${date}</th>`).join("");

  let body = data.district_calendar.map(row => {
    let cells = row.available_counts.map(count => `
      <td class="status ${countClass(count)}">${count}</td>
    `).join("");

    return `
      <tr>
        <td><a href="#${slugify(row.facility)}">${row.facility}</a></td>
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

function renderFacilityCalendar(facility, dates) {
  let header = dates.map(date => `<th>${date}</th>`).join("");

  let body = facility.sites.map(row => {
    let cells = row.days.map(status => `
      <td class="status ${status}">${siteStatusLabel(status)}</td>
    `).join("");

    return `
      <tr>
        <td>${row.site}</td>
        ${cells}
      </tr>
    `;
  }).join("");

  return `
    <section id="${slugify(facility.name)}">
      <h2>${facility.name}</h2>
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
    </section>
  `;
}

function renderFacilities(data) {
  return data.facilities
    .map(facility => renderFacilityCalendar(facility, data.dates))
    .join("");
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
      ${renderSummary(data)}
      ${renderDistrictCalendar(data)}
      ${renderFacilities(data)}
    `;
  })
  .catch(error => {
    document.getElementById("availability-app").innerHTML =
      `<p>Availability data could not be loaded for <strong>${district}</strong>.</p>`;
    console.error(error);
  });
