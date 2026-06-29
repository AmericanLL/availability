const DATA_URL = "data/districts/or-siuslaw-central-coast.json";

function statusLabel(status) {
  if (status === "available") return "Open";
  if (status === "limited") return "Limited";
  if (status === "full") return "Full";
  return status;
}

function renderSummary(data) {
  let rows = data.summary.map(row => `
    <tr>
      <td>${row.facility}</td>
      <td>${row.tonight}</td>
      <td>${row.next_7_days}</td>
      <td>${row.next_14_days}</td>
      <td>${row.best_window}</td>
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
            <th>Best Window</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderCalendar(title, firstCol, rows, dates) {
  let header = dates.map(date => `<th>${date}</th>`).join("");

  let body = rows.map(row => {
    let cells = row.days.map(status => `
      <td class="status ${status}">${statusLabel(status)}</td>
    `).join("");

    return `
      <tr>
        <td>${row[firstCol]}</td>
        ${cells}
      </tr>
    `;
  }).join("");

  return `
    <h2>${title}</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${firstCol === "facility" ? "Facility" : "Site"}</th>
            ${header}
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderFacilities(data) {
  return data.facilities.map(facility => {
    return renderCalendar(facility.name, "site", facility.sites, data.dates);
  }).join("");
}

fetch(DATA_URL)
  .then(response => response.json())
  .then(data => {
    document.getElementById("availability-app").innerHTML = `
      <h1>${data.district_name}</h1>
      <p class="updated">Last updated: ${data.last_updated}</p>
      ${renderSummary(data)}
      ${renderCalendar("District 60-Day Calendar", "facility", data.district_calendar, data.dates)}
      ${renderFacilities(data)}
    `;
  })
  .catch(error => {
    document.getElementById("availability-app").innerHTML =
      "<p>Availability data could not be loaded.</p>";
    console.error(error);
  });
