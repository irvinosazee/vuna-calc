// ===============================
// 🧠 SMART RESULT MEMORY FEATURE
// ===============================

let LAST_RESULT = 0;
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

// Set theme on page load from localStorage
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
// Basic Calculator Functions
// ------------------------------
function appendToResult(value) {
  currentExpression += value.toString();
  updateResult();
}

function bracketToResult(value) {
  currentExpression += value;
  updateResult();
}

function backspace() {
  currentExpression = currentExpression.slice(0, -1);
  updateResult();
}

function operatorToResult(value) {
  if (value === "^") {
    currentExpression += "**";
  } else {
    currentExpression += value;
  }
  updateResult();
}

function clearResult() {
  currentExpression = "";
  updateResult();
}

function percentToResult() {
  if (!currentExpression) return;
  currentExpression = computePercent(currentExpression);
  updateResult();
}

// ------------------------------
// Calculate Result
// ------------------------------
function calculateResult() {
  if (!currentExpression) return;
  try {
    const display = document.getElementById("result");
    const result = evaluateExpression(currentExpression, LAST_RESULT);
    LAST_RESULT = result;
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
  // Don't hijack browser/OS shortcuts (Ctrl+R, Cmd+L, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const k = e.key;
  if (k >= "0" && k <= "9") appendToResult(k);
  else if (k === ".") appendToResult(".");
  else if (k === "+" || k === "-" || k === "*" || k === "/") operatorToResult(k);
  else if (k === "^") operatorToResult("^");
  else if (k === "(" || k === ")") bracketToResult(k);
  else if (k === "%") percentToResult();
  // Letters build function names / constants: type "sin(30)", "sqrt(9)", "pi", "ans"
  else if (/^[a-zA-Z]$/.test(k)) appendToResult(k.toLowerCase());
  else if (k === "Enter" || k === "=") { e.preventDefault(); calculateResult(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearResult();
});
