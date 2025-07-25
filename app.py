from __future__ import annotations

## Standard library
import base64
import re

#Type hints

from typing import List, Tuple, Optional

# Libraries for OCR and Image Processing

import cv2
import numpy as np
import pytesseract

#Flask for web server

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

#Library for SQL Server Integration

import pyodbc

#Initialize Flask app
app=Flask(__name__)

CORS(app)

#List of valid units that it will accept

VALID_UNITS: List[str] = [
    "kg", "g", "mg", "µg", "ug", "gm",
    "l", "ml",
    "m", "cm", "mm", "km",
    "inch", "km/hr", "m/s",
    "s", "sec"
]
#common OCR misreads mapped to correct units
COMMON_MISREADS: dict[str, str] = {
    "ug":  "µg",
    "gm":  "g",
    "mgm": "mg",
    "kc":  "kg", "kg.": "kg", "kgm": "kg",
    "lg":  "kg",
    "nms": "m/s", "mps": "m/s", "ms": "m/s",
    "kmh": "km/hr", "km/h": "km/hr", "kmph": "km/hr",
    "s":   "sec",  "sec.": "sec", "secs": "sec"
}
# Valid range thresholds per unit (min, max)
UNIT_THRESHOLDS: dict[str, Tuple[float, float]] = {
    "kg": (0,100),
    "g": (1, 500),
    "mg": (1, 1000),
    "µg": (1, 100),
    "l": (0.01, 100),
    "ml": (0.1, 100),
    "m": (0.1, 100),
    "cm": (1, 100),
    "mm": (1, 100),
    "km": (0.01, 100),
    "inch": (0.01, 10),
    "km/hr": (1, 300),
    "m/s": (0.1, 100),
    "sec": (0.01, 500)
}

## Local path to Tesseract OCR binary
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ──────────────────────────  DB helpers  ────────────────────────────
#sql server integeration credentials
import os


def get_conn() -> pyodbc.Connection:
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={os.environ['AZURE_SQL_SERVER']};"
        f"DATABASE={os.environ['AZURE_SQL_DATABASE']};"
        f"UID={os.environ['AZURE_SQL_USER']};"
        f"PWD={os.environ['AZURE_SQL_PASSWORD']};"
        f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
    )

with get_conn() as _c:
    _c.execute(
        """
        IF OBJECT_ID('dbo.Results','U') IS NULL
        CREATE TABLE dbo.Results(
            [value]   FLOAT       NOT NULL,
            unit      VARCHAR(20) NOT NULL,
            CONSTRAINT uq_value_unit UNIQUE ([value], unit)
        );
        """
    )
    _c.commit()
# Unit Correction Function By capturing
#Compute Levenshtein edit distance between two strings

def levenshtein(a: str, b: str) -> int:
    a, b = a.lower(), b.lower()
    if a == b:
        return 0
    if not a: return len(b)
    if not b: return len(a)
    prev = list(range(len(b) + 1))
    for i  in range(1,len(a)+1):
        ca=a[i-1];
        curr = [i]
        for j in range(1,len(b)+1):
            cb=b[j-1];
            insert_cost= prev[j] + 1;
            delete_cost = curr[j - 1] + 1
            replace_cost = prev[j - 1] + (0 if ca == cb else 1)

            curr.append(min(insert_cost, delete_cost, replace_cost))

        prev = curr
    return prev[-1]
# analysis levenshtein distances and mapped unit character with new unit character
def correct_unit(unit: str) -> str:
    unit = unit.strip().lower().replace("µ", "u")
    unit = COMMON_MISREADS.get(unit, unit)
    best, best_d = None, 3       # ≤2 edits allowed
    for v in VALID_UNITS:
        d = levenshtein(unit, v)
        if d < best_d:
            best, best_d = v, d
    return COMMON_MISREADS.get(best, best) if best else None
# OCR webpage Accepts a base64 image, extracts value-unit pairs using OCR,
#     validates/corrects the units, and inserts into database.
@app.route("/ocr", methods=["POST"])
def ocr() -> Tuple[dict, int]:
    try:
        payload = request.get_json(force=True)
        b64 = payload.get("image", "")
        if not b64:
            return jsonify(success=False, error="missing image"), 400
        if b64.startswith("data:image"):
            b64 = b64.split(",", 1)[1]

        b64 = b64.replace(" ", "+").strip()
        if pad := len(b64) % 4:
            b64 += "=" * (4 - pad)

        # decode base64 to OpenCV
        try:
            img = cv2.imdecode(np.frombuffer(base64.b64decode(b64, validate=True),
                                             np.uint8), cv2.IMREAD_COLOR)
        except Exception as e:
            return jsonify(success=False, error=f"bad base64: {e}"), 400
        if img is None:
            return jsonify(success=False, error="decode failed"), 400

        img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY_INV, 31, 9)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        proc  = cv2.morphologyEx(thr, cv2.MORPH_CLOSE, kernel)
        txt = pytesseract.image_to_string(
            proc,
            config="--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789abcdefghijklmnopqrstuvwxyz.,/µ"
        ).lower().replace("µ", "u")
        pairs = re.findall(r"(\d+(?:[.,]\d+)?)\s*([a-z/]{1,5})", txt)

        if not pairs:
            return jsonify(success=False, error="no pairs found"), 200

        inserted, skipped = [], []
        with get_conn() as conn:
            cur = conn.cursor()
            for raw_val, raw_u in pairs:
                try:
                    val  = float(raw_val.replace(",", "."))
                    unit = correct_unit(raw_u)
                    if not unit:
                        skipped.append({"value": val, "unit": raw_u, "reason": "unknown unit"})
                        continue

                        # Threshold check
                    if unit in UNIT_THRESHOLDS:
                        min_val, max_val = UNIT_THRESHOLDS[unit]
                        if not (min_val <= val <= max_val):
                            skipped.append({
                                "value": val,
                                "unit": unit,
                                "reason": f"value out of range ({min_val} - {max_val})"
                            })
                            continue  # Skip insert

                    try:
                        cur.execute(
                            """INSERT INTO dbo.Results ([value], unit) VALUES (?, ?)""",
                            (val, unit)
                        )
                        inserted.append({"value": val, "unit": unit})
                    except pyodbc.IntegrityError:
                        skipped.append({
                            "value": val,
                            "unit": unit,
                            "reason": "duplicate value"
                        })
                except ValueError:
                        skipped.append({"value": raw_val, "unit": raw_u, "reason": "invalid number"})

            conn.commit()

        return jsonify(success=True,inserted=inserted,skipped=skipped), 200

    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

#Returns all stored value-unit pairs in ascending order of value.
@app.route("/data")
def data_table() -> Tuple[list, int]:
    try:
        with get_conn() as c:
            cur=c.cursor();
            result=cur.execute("SELECT [value], unit FROM dbo.Results ORDER BY [VALUE]")
            rows=[]
            for row in result:
                val, unit = row.value, row.unit
                rows.append({"value":val,"unit":unit})
        return jsonify(rows), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
#Returns grouped data by unit, sorted by value.
@app.route("/analysis-data")
def analysis_data() -> Tuple[dict, int]:
    try:
        with get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT [value], unit FROM dbo.Results ORDER BY unit, value")
            data = cursor.fetchall()

            grouped = {}
            for row in data:
                val, unit = row.value, row.unit
                grouped.setdefault(unit, []).append(val)

        return jsonify(success=True, data=grouped), 200
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

#Deletes all entries from the Results table
@app.route("/clear-data", methods=["POST"])
def clear_data():
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM dbo.Results")
            conn.commit()
        return jsonify(success=True, message="All data cleared.")
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500
# Main Page or Landing page
@app.route("/")
def index():
    return render_template("index.html")
# Table View of stored data
@app.route("/table")
def table():
    return render_template("table.html")
# Analysis Page with charts and graphs
@app.route("/analysis")
def analysis():
    return render_template("analysis.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

