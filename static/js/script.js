const tablebutton = document.getElementById("tablebtn");
tablebutton.addEventListener("click", () => {
  window.location.href = "/table";
});

const previewContainer = document.getElementById("preview-container");
const video = document.getElementById("video");
const alertBox = document.getElementById("alertBox");
const imagePreview = document.getElementById("imagePreview");
const captureBtn = document.getElementById("captureBtn");
const canvas = document.getElementById("canvas");
const realtime = document.getElementById("realtime");
const switchCameraBtn = document.getElementById("switchCameraBtn"); // Must add this button in HTML!

let useBackCamera = true;
let currentStream = null;

realtime.addEventListener("click", () => {
  window.location.href = "/analysis";
});

// ⏯ Start the camera with selected direction
async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  const constraints = {
    video: {
      facingMode: useBackCamera ? { exact: "environment" } : "user"
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentStream = stream;
    video.play();
  } catch (error) {
    console.warn("Preferred camera not available, falling back...", error);
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = fallbackStream;
      currentStream = fallbackStream;
      video.play();
    } catch (fallbackError) {
      console.error("Camera access failed:", fallbackError);
      alertBox.innerText = "Camera Failed";
      alertBox.className = "error";
    }
  }
}

// 🔁 Toggle camera
switchCameraBtn.addEventListener("click", () => {
  useBackCamera = !useBackCamera;
  startCamera();
});

// ▶ Start camera on page load
startCamera();

// 📸 Capture and send for OCR
captureBtn.onclick = function () {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL("image/png");
  imagePreview.src = imageData;

  // Delay OCR request slightly
  setTimeout(function () {
    fetch("/ocr", {  // ✅ Automatically works on both local and deployed Railway
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    })
      .then((response) => response.json())
      .then((data) => {
        const inserted = data.inserted || [];
        const skipped = data.skipped || [];

        if (inserted.length === 0) {
          alertBox.innerHTML = "No valid value/unit found. Retrying...";
          alertBox.className = "error";
          setTimeout(() => captureBtn.click(), 5000);
          return;
        }

        let msg = "";
        if (inserted.length > 0) {
          msg += "✅ <b>Captured:</b><br>";
          inserted.forEach((item) => {
            msg += `✔️ ${item.value} ${item.unit}<br>`;
          });
        }

        if (skipped.length > 0) {
          msg += `<br>⚠️ <b>Skipped:</b><br>`;
          skipped.forEach((item) => {
            msg += `❌ ${item.value} ${item.unit} — ${item.reason}<br>`;
          });
        }

        alertBox.innerHTML = msg;
        alertBox.className = "success";
      })
      .catch(function () {
        alertBox.innerHTML = "Server error.";
        alertBox.className = "error";
      });
  }, 1000);
};

