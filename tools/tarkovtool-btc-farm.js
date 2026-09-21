
    // Post-nerf 1.0 formula (timesaver / community 2026)
    const BASE_SEC = 300000;
    const SCALE = 0.041225;
    // Fuel: 1 unit lasts 12m 38s without solar
    const SEC_PER_FUEL_UNIT = 12 * 60 + 38; // 758s
    const UNITS_PER_CAN = 100;

    function clampGpus(n, maxSlots) {
      n = Math.round(Number(n) || 1);
      return Math.max(1, Math.min(maxSlots || 50, n));
    }
    function timePerBtcSec(gpus) {
      const g = Math.max(1, gpus);
      return BASE_SEC / (1 + (g - 1) * SCALE);
    }
    function btcPerDay(gpus) {
      return 86400 / timePerBtcSec(gpus);
    }
    function fuelMult(hm, solar) {
      // HM: -0.5% consumption per level, cap roughly at elite 25%
      const hmLevel = Math.max(0, Math.min(51, Number(hm) || 0));
      const hmFactor = Math.max(0.5, 1 - 0.005 * hmLevel);
      const solarFactor = solar ? 0.5 : 1;
      return hmFactor * solarFactor;
    }
    function hoursPerCan(hm, solar) {
      // duration of 100 units
      const mult = fuelMult(hm, solar); // lower consumption => longer
      // consumption rate multiplier: mult means we burn slower when mult < 1
      const baseHours = (UNITS_PER_CAN * SEC_PER_FUEL_UNIT) / 3600;
      return baseHours / mult;
    }
    function dailyFuelCost(fuelPrice, hm, solar) {
      const h = hoursPerCan(hm, solar);
      if (h <= 0) return 0;
      return (24 / h) * (Number(fuelPrice) || 0);
    }
    function formatNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    }
    function formatDur(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      if (h >= 48) return (h / 24).toFixed(1) + 'д';
      return h + 'ч ' + m + 'м';
    }

    function readInputs() {
      const maxSlots = Number(document.getElementById('farmLv').value) || 50;
      let gpus = clampGpus(document.getElementById('gpus').value, maxSlots);
      document.getElementById('gpus').value = gpus;
      return {
        gpus,
        maxSlots,
        hm: Number(document.getElementById('hm').value) || 0,
        craft: Number(document.getElementById('craft').value) || 0,
        btcPrice: Number(document.getElementById('btcPrice').value) || 0,
        gpuPrice: Number(document.getElementById('gpuPrice').value) || 0,
        fuelPrice: Number(document.getElementById('fuelPrice').value) || 0,
        solar: document.getElementById('solar').checked
      };
    }

    function calcRow(gpus, p) {
      const t = timePerBtcSec(gpus);
      const bpd = btcPerDay(gpus);
      const gross = bpd * p.btcPrice;
      const fuel = dailyFuelCost(p.fuelPrice, p.hm, p.solar);
      const net = gross - fuel;
      const invest = gpus * p.gpuPrice;
      const roi = net > 0 ? invest / net : Infinity;
      return { gpus, t, bpd, gross, fuel, net, invest, roi };
    }

    function render() {
      const p = readInputs();
      const cur = calcRow(p.gpus, p);
      const canH = hoursPerCan(p.hm, p.solar);

      document.getElementById('stats').innerHTML = `
        <div class="stat"><div class="v">${formatDur(cur.t)}</div><div class="l">Время на 1 BTC</div></div>
        <div class="stat"><div class="v">${cur.bpd.toFixed(3)}</div><div class="l">BTC / сутки</div></div>
        <div class="stat"><div class="v">${formatNum(cur.gross)}</div><div class="l">Валовая ₽/сут</div></div>
        <div class="stat"><div class="v ${cur.net >= 0 ? 'good' : 'bad'}">${formatNum(cur.net)}</div><div class="l">Нетто ₽/сут</div></div>
        <div class="stat"><div class="v">${formatNum(cur.fuel)}</div><div class="l">Топливо ₽/сут</div></div>
        <div class="stat"><div class="v">${canH.toFixed(1)} ч</div><div class="l">1 канистра хватает</div></div>
        <div class="stat"><div class="v">${cur.roi === Infinity ? '∞' : cur.roi.toFixed(1)}</div><div class="l">ROI GPU (дни)</div></div>
        <div class="stat"><div class="v">${formatNum(cur.invest)}</div><div class="l">Сумма GPU</div></div>
        <div class="stat"><div class="v" style="font-size:.95rem">Crafting ${p.craft}</div><div class="l">не влияет на BTC</div></div>
      `;

      const rows = [];
      for (let g = 1; g <= 50; g++) rows.push(calcRow(g, p));

      const tbody = document.getElementById('tbody');
      tbody.innerHTML = rows.map(r => {
        const hl = r.gpus === p.gpus ? ' style="background:rgba(201,162,39,.12)"' : '';
        return `<tr${hl}>
          <td><b>${r.gpus}</b></td>
          <td>${formatDur(r.t)}</td>
          <td>${r.bpd.toFixed(3)}</td>
          <td>${formatNum(r.gross)}</td>
          <td>${formatNum(r.fuel)}</td>
          <td>${formatNum(r.net)}</td>
          <td>${r.roi === Infinity ? '∞' : r.roi.toFixed(1)}</td>
        </tr>`;
      }).join('');

      drawChart('chartProfit', rows.map(r => r.net), p.gpus, '₽/сут');
      drawChart('chartRoi', rows.map(r => r.roi === Infinity ? null : Math.min(r.roi, 120)), p.gpus, 'дни', true);
      save();
    }

    function drawChart(id, values, markGpus, ylabel, invertGood) {
      const canvas = document.getElementById(id);
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pad = { l: 48, r: 12, t: 12, b: 28 };
      const plotW = W - pad.l - pad.r;
      const plotH = H - pad.t - pad.b;
      const nums = values.filter(v => v != null && !Number.isNaN(v));
      let min = Math.min(0, ...nums);
      let max = Math.max(...nums, 1);
      if (min === max) max = min + 1;

      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.fillStyle = '#8b919a';
      ctx.font = '11px sans-serif';
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + plotH * (i / 4);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        const val = max - (max - min) * (i / 4);
        ctx.fillText(Math.round(val).toLocaleString('ru-RU'), 4, y + 4);
      }

      // line
      ctx.beginPath();
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      values.forEach((v, i) => {
        if (v == null) return;
        const x = pad.l + (i / (values.length - 1)) * plotW;
        const y = pad.t + (1 - (v - min) / (max - min)) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // marker current gpus
      const mi = markGpus - 1;
      if (mi >= 0 && mi < values.length && values[mi] != null) {
        const x = pad.l + (mi / (values.length - 1)) * plotW;
        const y = pad.t + (1 - (values[mi] - min) / (max - min)) * plotH;
        ctx.fillStyle = '#3dd68c';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = '#8b919a';
      ctx.fillText('1', pad.l, H - 8);
      ctx.fillText('50 GPU', W - pad.r - 40, H - 8);
    }

    function save() {
      try {
        localStorage.setItem('tarkovBtcFarm', JSON.stringify({
          gpus: document.getElementById('gpus').value,
          farmLv: document.getElementById('farmLv').value,
          hm: document.getElementById('hm').value,
          craft: document.getElementById('craft').value,
          btcPrice: document.getElementById('btcPrice').value,
          gpuPrice: document.getElementById('gpuPrice').value,
          fuelPrice: document.getElementById('fuelPrice').value,
          solar: document.getElementById('solar').checked,
          jaegerFuel: document.getElementById('jaegerFuel').checked,
          mode: document.getElementById('gameMode').value
        }));
      } catch (e) {}
    }
    function load() {
      try {
        const s = JSON.parse(localStorage.getItem('tarkovBtcFarm') || '{}');
        ['gpus','farmLv','hm','craft','btcPrice','gpuPrice','fuelPrice'].forEach(k => {
          if (s[k] != null) document.getElementById(k).value = s[k];
        });
        if (s.solar != null) document.getElementById('solar').checked = !!s.solar;
        if (s.jaegerFuel != null) document.getElementById('jaegerFuel').checked = !!s.jaegerFuel;
        if (s.mode) document.getElementById('gameMode').value = s.mode;
      } catch (e) {}
    }

    document.getElementById('priceBtn').onclick = async () => {
      const st = document.getElementById('status');
      st.className = 'status'; st.textContent = 'Тяну prices…';
      try {
        const mode = document.getElementById('gameMode').value || 'pve';
        const res = await TarkovAPI.request('/' + mode + '/items', { httpCache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let raw = json?.data?.items;
        const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
        const byNorm = {};
        arr.forEach(it => { if (it.normalizedName) byNorm[it.normalizedName] = it; });
        // common ids/names
        const btc = byNorm['physical-bitcoin'] || arr.find(i => (i.normalizedName||'').includes('bitcoin'));
        const gpu = byNorm['graphics-card'] || arr.find(i => (i.normalizedName||'') === 'graphics-card');
        const fuel = byNorm['metal-fuel-tank'] || arr.find(i => (i.normalizedName||'').includes('metal-fuel'));
        function price(it) {
          if (!it) return 0;
          const avg = Number(it.avg24hPrice) || 0;
          if (avg) return avg;
          let best = 0;
          (it.sellToTrader || []).forEach(s => { best = Math.max(best, Number(s.price)||0); });
          return best;
        }
        function buyPrice(it) {
          if (!it) return 0;
          const avg = Number(it.avg24hPrice) || 0;
          if (avg) return avg;
          let min = Infinity;
          (it.buyFromTrader || []).forEach(b => {
            const p = Number(b.price)||0;
            if (p > 0 && p < min) min = p;
          });
          return min === Infinity ? 0 : min;
        }
        if (btc) document.getElementById('btcPrice').value = Math.round(price(btc) || buyPrice(btc));
        if (gpu) document.getElementById('gpuPrice').value = Math.round(buyPrice(gpu) || price(gpu));
        if (fuel) {
          // prefer trader buy if jaeger
          const fromTrader = buyPrice(fuel);
          const avg = price(fuel);
          document.getElementById('fuelPrice').value = Math.round(fromTrader || avg);
        }
        st.className = 'status ok';
        st.textContent = 'Цены обновлены' + (btc ? ' · BTC ' + document.getElementById('btcPrice').value : '');
        render();
      } catch (e) {
        st.className = 'status err';
        st.textContent = e.message;
      }
    };

    ['gpus','farmLv','hm','craft','btcPrice','gpuPrice','fuelPrice','solar','jaegerFuel'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('change', render);
      el.addEventListener('input', render);
    });
    document.getElementById('recalcBtn').onclick = render;
    document.getElementById('farmLv').addEventListener('change', () => {
      const max = Number(document.getElementById('farmLv').value);
      const g = Number(document.getElementById('gpus').value);
      if (g > max) document.getElementById('gpus').value = max;
      render();
    });

    (function () {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(window.itemName&&window.itemName!==itemName)return window.itemName(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s))s=(it.name&&!/^[a-f0-9]{20,}$/i.test(it.name)?it.name:it.normalizedName)||s;
    return s||it.id||'';
  }

      const KEY = 'tarkovPreferredGameMode';
      const def = localStorage.getItem(KEY) || 'pve';
      document.querySelectorAll('select#gameMode').forEach(sel => {
        if ([...sel.options].some(o => o.value === def)) sel.value = def;
        sel.addEventListener('change', () => { try { localStorage.setItem(KEY, sel.value); } catch (e) {} });
      });
    })();

    load();
    render();
  