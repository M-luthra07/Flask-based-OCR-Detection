# 🔍 Real-Time OCR Web App with Azure SQL
A Flask web application that extracts text (values + units) from live webcam/images using Tesseract OCR, stores data in Azure SQL, and provides analysis.

✨ Key Features
Real-Time OCR: Extract numeric values + units (e.g., 5 kg, 10 m/s) from live webcam or uploaded images using Tesseract.

Unit Correction: Handles common OCR misreads (e.g., "km/h" → "km/hr", "gm" → "g") via Levenshtein distance algorithm.

Azure SQL Integration: Stores extracted data in Microsoft Azure SQL Database with deduplication.

Interactive Dashboard:

📊 Table View: Displays all extracted values/units.

📈 Analysis Page: Unit-wise aggregation (e.g., average/sum of values per unit).

Deployed on Railway for public access.

🛠 Tech Stack
Category	Technologies
Backend:Python (Flask), pytesseract, OpenCV
Database:	Microsoft Azure SQL Server
Frontend:HTML/CSS/JS (Vanilla)
Deployment:Railway,render,repleit (with Azure SQL integration)
OCR Engine:Tesseract v5 (configured for numeric/unit patterns)

🚀 Setup Guide
Prerequisites
Tesseract OCR installed locally (Download).
Azure SQL Database (or local SQL Server for testing).

Installation 
Install dependencies:

bash
pip install -r requirements.txt  # Flask, pytesseract, pyodbc, OpenCV  
Configure environment variables (create .env):

ini
AZURE_SQL_SERVER=your-server.database.windows.net  
AZURE_SQL_DATABASE=your-db-name  
AZURE_SQL_USER=your-username  
AZURE_SQL_PASSWORD=your-password  

📸 Screenshots
Webcam Capture:


Extracted Data Table:


Unit-wise Analysis:



🌐 Live Demo: https://flask-based-ocr-detection-production.up.railway.app/
📂 GitHub: https://github.com/M-luthra07/Flask-based-OCR-Detection
