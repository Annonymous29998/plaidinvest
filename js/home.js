(function () {
  var menuBtn = document.getElementById("mobile-menu-btn");
  var drawer = document.getElementById("mobile-drawer");

  function setDrawer(open) {
    if (!drawer || !menuBtn) return;
    drawer.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("drawer-open", open);
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", function () {
      setDrawer(!drawer.classList.contains("open"));
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setDrawer(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setDrawer(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) setDrawer(false);
    });
  }

  var canvas = document.getElementById("btc-chart");
  if (!canvas || !window.BtcPrice) return;

  var ctx = canvas.getContext("2d");
  var periodDays = { "1D": 1, "1W": 7, "1M": 30, "1Y": 365 };
  var period = "1D";
  var resizeTimer;
  var chartData = [];
  var animFrame = null;

  function formatAxis(n) {
    if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + Math.round(n);
  }

  function drawChart(data) {
    if (!data || data.length < 2) return;
    chartData = data.slice();
    var parent = canvas.parentElement;
    if (!parent) return;

    var cw = parent.clientWidth;
    var ch = parent.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    var padL = 52;
    var padR = 16;
    var padT = 12;
    var padB = 24;

    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var range = max - min || 1;
    min -= range * 0.02;
    max += range * 0.02;

    var isUp = data[data.length - 1] >= data[0];
    var lineColor = isUp ? "#22c55e" : "#ef4444";
    var fillTop = isUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)";

    ctx.clearRect(0, 0, cw, ch);

    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 1;
    for (var g = 0; g < 4; g++) {
      var gy = padT + ((ch - padT - padB) * g) / 3;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(cw - padR, gy);
      ctx.stroke();
      var labelVal = max - ((max - min) * g) / 3;
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatAxis(labelVal), padL - 6, gy + 3);
    }

    var points = data.map(function (v, i) {
      return {
        x: padL + ((cw - padL - padR) * i) / (data.length - 1),
        y: ch - padB - ((v - min) / (max - min)) * (ch - padT - padB),
        v: v
      };
    });

    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    var last = points[points.length - 1];
    var grad = ctx.createLinearGradient(0, padT, 0, ch - padB);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.lineTo(last.x, ch - padB);
    ctx.lineTo(points[0].x, ch - padB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    var liveLabel = BtcPrice.formatUsd(last.v);
    ctx.fillText(liveLabel, Math.min(last.x + 10, cw - padR - 60), last.y - 10);

    var priceEl = document.getElementById("chart-live-tag");
    if (priceEl) priceEl.textContent = liveLabel;
  }

  function loadPeriod(p, force) {
    period = p;
    var days = periodDays[p];
    BtcPrice.fetchChart(days, !!force).then(function (data) {
      if (!data.length) return;
      if (BtcPrice.price && p === "1D") {
        data = data.slice();
        data[data.length - 1] = BtcPrice.price;
      }
      var step = Math.max(1, Math.floor(data.length / 120));
      var sampled = data.filter(function (_, i) { return i % step === 0 || i === data.length - 1; });
      drawChart(sampled);
    });
  }

  BtcPrice.onLivePrice = function (price) {
    if (period !== "1D" || chartData.length < 2) return;
    chartData[chartData.length - 1] = price;
    drawChart(chartData);
    var panel = document.querySelector(".market-panel");
    if (panel) panel.classList.add("chart-live");
    var ph = document.getElementById("mkt-price-hero");
    if (ph && price) BtcPrice.setStat("mkt-price-hero", price, BtcPrice.formatUsd);
  };

  loadPeriod("1D");
  document.querySelectorAll(".period-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".period-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      loadPeriod(btn.dataset.period, true);
    });
  });

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (chartData.length) drawChart(chartData);
      else loadPeriod(period);
    }, 150);
  });

  setInterval(function () {
    if (period === "1D") loadPeriod("1D", true);
  }, 60000);

  if (window.SatVaultAuth) SatVaultAuth.applyPublicNav();
})();
