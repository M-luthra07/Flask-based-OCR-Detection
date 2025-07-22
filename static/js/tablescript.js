const resultsTable = document.querySelector("#resultsTable tbody");
const backBtn = document.getElementById("backBtn");
const clearbtn = document.getElementById("cleardata");

// Load results
fetch("/data")
  .then(res => res.json())
  .then(data => {
    // Clear existing rows in tbody
    resultsTable.innerHTML = "";

    if (data.length === 0) {
      // Show fallback message if no data
      const fallbackRow = document.createElement("tr");
      fallbackRow.innerHTML = "<td colspan='2'>Upload an image from the capture page to see OCR results here.</td>";
      resultsTable.appendChild(fallbackRow);
    } else {
      // Populate real data rows
      data.forEach(row => {
        if (row.value !== undefined && row.unit) {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${row.value}</td><td>${row.unit}</td>`;
          resultsTable.appendChild(tr);
        }
      });
    }
  })
  .catch(function(error) {
    // On fetch error
    resultsTable.innerHTML = "<tr><td colspan='2'>⚠️ Failed to load data</td></tr>";
    console.error("Fetch error:", error);
  });

// Clear data logic
clearbtn.addEventListener("click", function clearDatabase() {
  if (confirm("Are you sure you want to delete all data?")) {
    fetch("/clear-data", {
      method: "POST"
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Data cleared successfully.");
        location.reload(); // refresh to reflect cleared data
      } else {
        alert("Error: " + result.error);
      }
    })
    .catch(err => alert("Request failed: " + err));
  }
});

// Back to capture page
backBtn.addEventListener("click", function() {
  window.location.href = "/";
});
