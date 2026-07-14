/* ---------- stats helpers ---------- */

// Critical z-values for common alpha levels (two-tailed uses alpha/2, one-tailed uses alpha)
const Z_ALPHA_TWO_TAILED = { "0.01": 2.5758, "0.05": 1.9600, "0.10": 1.6449 };
const Z_ALPHA_ONE_TAILED = { "0.01": 2.3263, "0.05": 1.6449, "0.10": 1.2816 };
const Z_POWER = { "0.80": 0.8416, "0.90": 1.2816, "0.95": 1.6449 };

function zAlphaFor(alpha, twoTailed) {
  return (twoTailed ? Z_ALPHA_TWO_TAILED : Z_ALPHA_ONE_TAILED)[alpha];
}

// Standard normal PDF
function normalPdf(x, mean, sd) {
  return Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
}

// Standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26)
function normalCdf(x, mean, sd) {
  const z = (x - mean) / (sd * Math.sqrt(2));
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  const erf = z >= 0 ? y : -y;
  return 0.5 * (1 + erf);
}

// Sample size per group for a two-proportion test
function sampleSizePerGroup(p1, p2, alpha, power, twoTailed) {
  const zA = zAlphaFor(alpha, twoTailed);
  const zB = Z_POWER[power];
  const numerator = Math.pow(zA + zB, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
  const denominator = Math.pow(p2 - p1, 2);
  return numerator / denominator;
}

/* ---------- canvas drawing: null vs. alternative distributions ---------- */

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawDistributions(canvas, { mean0, se0, mean1, se1, criticalValues }) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 16, right: 16, bottom: 26, left: 16 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xMin = Math.min(mean0 - 4 * se0, mean1 - 4 * se1);
  const xMax = Math.max(mean0 + 4 * se0, mean1 + 4 * se1);
  const yMax = Math.max(normalPdf(mean0, mean0, se0), normalPdf(mean1, mean1, se1)) * 1.15;

  const mapX = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const mapY = (y) => padding.top + plotH - (y / yMax) * plotH;

  const steps = 200;
  const stepX = (xMax - xMin) / steps;

  function curvePoints(mean, sd) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * stepX;
      pts.push([x, normalPdf(x, mean, sd)]);
    }
    return pts;
  }

  function fillUnderCurve(pts, fromX, toX, color) {
    ctx.beginPath();
    let started = false;
    for (const [x, y] of pts) {
      if (x < fromX || x > toX) continue;
      const px = mapX(x);
      const py = mapY(y);
      if (!started) {
        ctx.moveTo(px, mapY(0));
        started = true;
      }
      ctx.lineTo(px, py);
    }
    ctx.lineTo(mapX(toX), mapY(0));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeCurve(pts, color) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = mapX(x);
      const py = mapY(y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const nullPts = curvePoints(mean0, se0);
  const altPts = curvePoints(mean1, se1);

  // alpha region(s): tail(s) of the null distribution beyond the critical value(s)
  const rightCv = criticalValues[criticalValues.length - 1];
  fillUnderCurve(nullPts, rightCv, xMax, "rgba(229, 83, 75, 0.35)");
  if (criticalValues.length > 1) {
    fillUnderCurve(nullPts, xMin, criticalValues[0], "rgba(229, 83, 75, 0.35)");
  }

  // beta region: area of the alternative distribution below the (rightmost) critical value
  fillUnderCurve(altPts, xMin, rightCv, "rgba(210, 153, 34, 0.3)");

  strokeCurve(nullPts, "rgba(230, 237, 243, 0.55)");
  strokeCurve(altPts, "#1D9E75");

  // critical value marker(s)
  ctx.strokeStyle = "rgba(230, 237, 243, 0.5)";
  ctx.setLineDash([4, 3]);
  criticalValues.forEach((cv) => {
    const px = mapX(cv);
    ctx.beginPath();
    ctx.moveTo(px, padding.top);
    ctx.lineTo(px, padding.top + plotH);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // x-axis baseline
  ctx.strokeStyle = "rgba(230, 237, 243, 0.25)";
  ctx.beginPath();
  ctx.moveTo(padding.left, mapY(0));
  ctx.lineTo(padding.left + plotW, mapY(0));
  ctx.stroke();

  // axis labels
  ctx.fillStyle = "rgba(230, 237, 243, 0.6)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("0 (no effect)", mapX(mean0), height - 8);
  ctx.fillText(`+${(mean1 * 100).toFixed(2)}pp`, mapX(mean1), height - 8);
}

/* ---------- Sample Size Calculator ---------- */

function initSampleSizeCalculator() {
  const canvas = document.getElementById("sample-size-canvas");
  if (!canvas) return;

  const baselineRange = document.getElementById("baseline-rate-range");
  const baselineNumber = document.getElementById("baseline-rate-number");
  const mdeType = document.getElementById("mde-type");
  const mdeRange = document.getElementById("mde-range");
  const mdeNumber = document.getElementById("mde-number");
  const alphaSelect = document.getElementById("alpha-select");
  const powerSelect = document.getElementById("power-select");
  const oneTailed = document.getElementById("one-tailed");
  const dailyTraffic = document.getElementById("daily-traffic");

  const nPerGroupEl = document.getElementById("n-per-group");
  const nTotalEl = document.getElementById("n-total");
  const durationEl = document.getElementById("duration-estimate");
  const errorEl = document.getElementById("sample-size-error");

  function bindPair(range, number) {
    range.addEventListener("input", () => {
      number.value = range.value;
      recalc();
    });
    number.addEventListener("input", () => {
      range.value = number.value;
      recalc();
    });
  }

  function applyMdeRange() {
    if (mdeType.value === "relative") {
      mdeRange.min = "1";
      mdeRange.max = "100";
      mdeRange.step = "1";
      if (parseFloat(mdeNumber.value) > 100 || parseFloat(mdeNumber.value) < 1) {
        mdeNumber.value = "10";
      }
    } else {
      mdeRange.min = "0.1";
      mdeRange.max = "20";
      mdeRange.step = "0.1";
      if (parseFloat(mdeNumber.value) > 20 || parseFloat(mdeNumber.value) < 0.1) {
        mdeNumber.value = "1";
      }
    }
    mdeRange.value = mdeNumber.value;
  }

  function recalc() {
    const p1 = parseFloat(baselineNumber.value) / 100;
    const mde = parseFloat(mdeNumber.value);
    const p2 = mdeType.value === "relative" ? p1 * (1 + mde / 100) : p1 + mde / 100;

    if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || p2 === p1) {
      errorEl.textContent = "Adjust the inputs — baseline and MDE must produce a valid conversion rate between 0% and 100%.";
      nPerGroupEl.textContent = "—";
      nTotalEl.textContent = "—";
      durationEl.textContent = "—";
      return;
    }
    errorEl.textContent = "";

    const alpha = alphaSelect.value;
    const power = powerSelect.value;
    const twoTailed = !oneTailed.checked;

    const nRaw = sampleSizePerGroup(p1, p2, alpha, power, twoTailed);
    const n = Math.ceil(nRaw);
    const total = n * 2;

    nPerGroupEl.textContent = n.toLocaleString();
    nTotalEl.textContent = total.toLocaleString();

    const traffic = parseFloat(dailyTraffic.value);
    if (traffic > 0) {
      const days = Math.ceil(total / traffic);
      durationEl.textContent = `${days.toLocaleString()} day${days === 1 ? "" : "s"}`;
    } else {
      durationEl.textContent = "—";
    }

    const se0 = Math.sqrt((2 * p1 * (1 - p1)) / n);
    const se1 = Math.sqrt((p1 * (1 - p1)) / n + (p2 * (1 - p2)) / n);
    const mean0 = 0;
    const mean1 = p2 - p1;
    const zA = zAlphaFor(alpha, twoTailed);
    const cv = zA * se0;
    const criticalValues = twoTailed ? [-cv, cv] : [cv];

    drawDistributions(canvas, { mean0, se0, mean1, se1, criticalValues });
  }

  bindPair(baselineRange, baselineNumber);
  bindPair(mdeRange, mdeNumber);
  mdeType.addEventListener("change", () => {
    applyMdeRange();
    recalc();
  });
  alphaSelect.addEventListener("change", recalc);
  powerSelect.addEventListener("change", recalc);
  oneTailed.addEventListener("change", recalc);
  dailyTraffic.addEventListener("input", recalc);
  window.addEventListener("resize", recalc);

  applyMdeRange();
  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  initSampleSizeCalculator();
});
