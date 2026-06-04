// ===============================
// VUNA Calculator — DOM wiring
// ===============================

var currentExpression = "";

// ------------------------------
// Theme Toggle Logic
// ------------------------------
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("theme-toggle");

  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    btn.innerHTML = "☀️";
    btn.title = "Switch to light mode";
    localStorage.setItem("theme", "dark");
  } else {
    btn.innerHTML = "🌙";
    btn.title = "Switch to dark mode";
    localStorage.setItem("theme", "light");
  }
}

// Set theme on page load and wire the toggle button
window.addEventListener("DOMContentLoaded", function () {
  const theme = localStorage.getItem("theme");
  const body = document.body;
  const btn = document.getElementById("theme-toggle");

  if (btn) {
    btn.addEventListener("click", toggleTheme);
    if (theme === "dark") {
      body.classList.add("dark-mode");
      btn.innerHTML = "☀️";
      btn.title = "Switch to light mode";
    } else {
      btn.innerHTML = "🌙";
      btn.title = "Switch to dark mode";
    }
  }
});

// ------------------------------
// Input handlers
// ------------------------------
function appendToResult(value) {
  currentExpression += value.toString();
  updateResult();
}

// Operators, incl. 'C' (nCr) and 'P' (nPr)
function operatorToResult(value) {
  currentExpression += value;
  updateResult();
}

// Delete one character (keyboard Backspace)
function backspace() {
  currentExpression = currentExpression.slice(0, -1);
  updateResult();
}

// AC — clear everything
function clearResult() {
  currentExpression = "";
  updateResult();
}

// CE — clear the current entry: drop the trailing number, else the trailing operator
function clearEntry() {
  if (!currentExpression) return;
  const stripped = currentExpression.replace(/[0-9.]+$/, "");
  if (stripped !== currentExpression) {
    currentExpression = stripped;
  } else {
    currentExpression = currentExpression.slice(0, -1);
  }
  updateResult();
}

// ------------------------------
// Evaluate
// ------------------------------
function calculateResult() {
  if (!currentExpression) return;
  try {
    const display = document.getElementById("result");
    const result = evaluateExpression(currentExpression);
    display.value = result;
    currentExpression = result.toString();
    updateResult();
  } catch {
    currentExpression = "Error";
    updateResult();
  }
}

function updateResult() {
  document.getElementById("result").value = currentExpression || "0";
}

// ------------------------------
// Keyboard Input
// ------------------------------
window.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // don't hijack browser shortcuts

  const k = e.key;
  if (k >= "0" && k <= "9") appendToResult(k);
  else if (k === ".") appendToResult(".");
  else if (k === "+" || k === "-" || k === "*" || k === "/") operatorToResult(k);
  else if (k === "Enter" || k === "=") { e.preventDefault(); calculateResult(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearResult();    // AC
  else if (k === "Delete") clearEntry();     // CE
});
