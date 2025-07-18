const resultsTable = document.querySelector("#resultsTable tbody");
const backBtn = document.getElementById("backBtn");
const  clearbtn=document.getElementById("cleardata");
// Load results
fetch("/data")
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById("resultsTable");
    table.innerHTML = "<tr><th>Value</th><th>Unit</th></tr>";

    data.forEach(row => {
      if (row.value !== undefined && row.unit) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.value}</td><td>${row.unit}</td>`;
        table.appendChild(tr);
      }
    });
  })
  .catch(function(error) {
    const table = document.getElementById("resultsTable");
    table.innerHTML = "<tr><td colspan='2'>⚠️ Failed to load data</td></tr>";
    console.error("Fetch error:", error);
  });

clearbtn.addEventListener("click",function clearDatabase() {
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
  })
backBtn.addEventListener("click", function() {
  window.location.href = "/";
});
