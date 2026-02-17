# 📊 CSCE 679 – Data Visualization Assignment 1  
## Hong Kong Monthly Temperature Matrix

An interactive D3.js visualization that displays Hong Kong’s monthly temperature patterns using a matrix layout with embedded sparklines.

🔗 **Live Demo:**  
https://nikithanatarajan1312.github.io/csce679-data-visualization-assignment-1/

---

## 📌 Overview

This project visualizes daily temperature data aggregated into a **Year × Month matrix**.

Each cell represents one month in a specific year and contains:

- 🎨 Background color → Monthly extreme (Max or Min temperature)
- 📈 Two sparklines → Daily max & daily min trends
- 🖱 Interactive tooltip → Precise monthly values
- 🔄 Toggle mode → Switch between Monthly Max and Monthly Min

The goal is to combine:
- Heatmap-style encoding (for summary comparison)
- Sparkline micro-visualizations (for intra-month variation)

---

## 🎮 Features

### 🔄 Toggle Mode
Click anywhere on the matrix to switch between:
- **MAX mode** → Background shows monthly maximum temperature
- **MIN mode** → Background shows monthly minimum temperature

### 📅 Dynamic Year Selection
Users can:
- Select custom year ranges (From → To)
- Reset to “Last 10 years”
- Automatically adjust axis labeling for large ranges

### 🎨 Stable Global Color Scale
Color mapping is consistent across all year ranges to ensure accurate comparison.

### 📦 Missing Data Handling
If a month has no data:
- A placeholder cell is shown
- Tooltip displays “No data”

### 💾 Download Feature
Users can export the visualization as a PNG image using the **Download PNG** button.

---

## 🧠 Design Choices

### Why two sparklines?
Each cell includes:
- Green line → Daily max temperatures  
- Blue line → Daily min temperatures  

This preserves daily variation while the background color encodes the monthly extreme.

### Why global color scaling?
The color domain is computed from the entire dataset (not just selected years) to prevent misleading color shifts when filtering.

### Why a matrix layout?
The Year × Month grid:
- Makes seasonal patterns visually obvious  
- Highlights inter-annual comparisons  
- Enables compact multi-year analysis  

---

## 🛠 Technologies Used

- **D3.js v7**
- HTML5
- CSS3
- Vanilla JavaScript

---

## 📂 Project Structure

```
├── index.html
├── script.js
├── style.css
├── data/
│   └── temperature_daily.csv
└── README.md
```

---

## 🚀 How to Run Locally

Because D3 loads CSV files, you must use a local server:

```bash
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

---

## 📊 Dataset

The dataset contains daily temperature records including:

- Date
- Maximum temperature
- Minimum temperature

Data is aggregated per month within the visualization.

---
