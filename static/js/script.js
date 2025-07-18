const tablebutton=document.getElementById("tablebtn")
tablebutton.addEventListener("click",function(event){
    window.location.href = "/table";
})

const previewContainer = document.getElementById("preview-container");
const video = document.getElementById("video");
const alertBox = document.getElementById("alertBox");
const imagePreview = document.getElementById("imagePreview");
const captureBtn = document.getElementById("captureBtn");
const canvas = document.getElementById("canvas");
const realtime=document.getElementById("realtime");
realtime.addEventListener("click",function (){
    window.location.href="/analysis";
})
// Start webcam
navigator.mediaDevices.getUserMedia({ video: true })
.then(function(stream) {
    video.srcObject = stream;
    video.play();
})
.catch(function(error) {
    alertBox.innerText = "Camera Failed";
    alertBox.className = "error";
});

// Capture button logic
captureBtn.onclick = function () {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/png");
    imagePreview.src = imageData;

    // Delay OCR request slightly
    setTimeout(function () {
        fetch("http://localhost:5000/ocr", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ image: imageData })
        })
        .then((response) => response.json())
        .then((data) => {
            if (!data.success) {
                alertBox.innerHTML = "OCR Failed. Retrying...";
                alertBox.className = "error";
                setTimeout(function () {
                    captureBtn.click();
                }, 3000);
                return;
            }

            // Handle new multiple result format
            const inserted = data.inserted || [];
            const skipped = data.skipped || [];

            if (inserted.length === 0) {
                alertBox.innerHTML = "No valid value/unit found. Retrying...";
                alertBox.className = "error";
                setTimeout(function () {
                    captureBtn.click();
                }, 3000);
                return;
            }

            // Show results
            let msg = "Captured:<br>";
            inserted.forEach((item) => {
                msg += `✔️ ${item.value} ${item.unit}<br>`;
            });

            if (skipped.length > 0) {
                msg += `<br>⚠️ Skipped ${skipped.length} invalid/duplicate value(s).`;
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