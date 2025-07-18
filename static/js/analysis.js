function fetchAnalysisData() {
  fetch("/analysis-data")
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      const chartsDiv = document.getElementById("charts");
      chartsDiv.innerHTML = ''; // Clear previous content

      if (!result.success) {
        chartsDiv.innerHTML = '<p style="color:red;">Error: ' + result.error + '</p>';
        return;
      }

      // Create canvas element for a unified chart
      var canvas = document.createElement("canvas");
      canvas.id = "unitChart";
      chartsDiv.appendChild(canvas);

      const colors = [
        "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
        "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff"
      ];

      var datasets = [];
      var colorIndex = 0;

      for (var unit in result.data) {
        var values = result.data[unit];
        var points = values.map(function (v, i) {
          return { x: i + 1, y: v };
        });

        datasets.push({
          label: unit,
          data: points,
          borderColor: colors[colorIndex % colors.length],
          backgroundColor: colors[colorIndex % colors.length],
          fill: false,
          tension: 0.3
        });

        colorIndex++;
      }

      new Chart(canvas, {
        type: 'line',
        data: {
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Allow full use of height/width
          plugins: {
            legend: {
              position: 'top'
            },
            title: {
              display: true,
              text: 'Unified Unit-wise Value Analysis'
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          scales: {
            x: {
              type: 'linear',
              title: {
                display: true,
                text: 'Index (Appearance Order)'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Value'
              },
              ticks: {
                callback: function (value) {
                  return value.toLocaleString(); // Format large numbers
                }
              }
            }
          }
        }
      });
    })
    .catch(function (error) {
      document.getElementById("charts").innerHTML =
        '<p style="color:red;">Error: ' + error + '</p>';
    });
}

// Run once + every 5 seconds
fetchAnalysisData();
setInterval(fetchAnalysisData, 5000);

// Back button functionality
document.getElementById("backBtn").addEventListener("click", function () {
  window.location.href = "/";
});
