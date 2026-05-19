// --- Helpers ---
const fmt = (n) => new Intl.NumberFormat('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}).format(n);
const fmtK = (n) => {
  if(Math.abs(n) >= 1e6) return (n/1e6).toFixed(2).replace('.',',') + ' Mio. €';
  return fmt(n) + ' €';
};
const pct = (n) => (n*100).toFixed(2).replace('.',',') + ' %';

const charts = {};
function makeChart(id, cfg){
  if(charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if(!ctx) return;
  charts[id] = new Chart(ctx, cfg);
}

function resultHTML(main_label, main_val, main_sub, rows, chartId){
  let rowsHTML = rows.map(r =>
    `<div class="result-row">
      <span class="rrl">${r.label}</span>
      <span class="rrv ${r.cls||''}">${r.val}</span>
    </div>`
  ).join('');
  return `
    <div class="result-main fade-in">
      <div class="rl">${main_label}</div>
      <div class="rv">${main_val}</div>
      ${main_sub ? `<div class="rsv">${main_sub}</div>` : ''}
    </div>
    <div class="result-rows">${rowsHTML}</div>
    ${chartId ? `<div class="chart-wrap"><canvas id="${chartId}"></canvas></div>` : ''}
  `;
}

// ============================================================
// ZINSESZINS
// ============================================================
function calcZinseszins(){
  const P = parseFloat(document.getElementById('zz-kapital').value) || 0;
  const r = (parseFloat(document.getElementById('zz-rate').value) || 0) / 100;
  const t = parseInt(document.getElementById('zz-jahre').value) || 0;
  const n = parseInt(document.getElementById('zz-intervall').value) || 1;

  if(P <= 0 || r <= 0 || t <= 0){ clearResult('zz-result'); return; }

  const A = P * Math.pow(1 + r/n, n*t);
  const zinsen = A - P;
  const faktor = A / P;
  const verdoppl = Math.log(2) / (n * Math.log(1 + r/n));

  const el = document.getElementById('zz-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Endkapital nach ' + t + ' Jahren',
    fmtK(A),
    `Startkapital: ${fmtK(P)}`,
    [
      {label:'Startkapital', val: fmtK(P)},
      {label:'Zinserträge', val: fmtK(zinsen), cls:'pos'},
      {label:'Kapitalmultiplikator', val: faktor.toFixed(2) + 'x'},
      {label:'Verdopplungszeit', val: verdoppl.toFixed(1).replace('.',',') + ' Jahre'},
    ],
    'zz-chart'
  );

  // Build yearly data
  const labels = [], dataK = [], dataZ = [];
  const step = t <= 20 ? 1 : Math.ceil(t/20);
  for(let y = 0; y <= t; y += step){
    const val = P * Math.pow(1 + r/n, n*y);
    labels.push(y + ' J.');
    dataK.push(P);
    dataZ.push(+(val - P).toFixed(2));
  }

  makeChart('zz-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {label:'Startkapital', data: dataK, backgroundColor:'#2563eb', stack:'s'},
        {label:'Zinserträge', data: dataZ, backgroundColor:'#10b981', stack:'s'}
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{stacked:true, ticks:{font:{size:10}}}, y:{stacked:true, ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// SPARPLAN
// ============================================================
function calcSparplan(){
  const P = parseFloat(document.getElementById('sp-start').value) || 0;
  const pmt = parseFloat(document.getElementById('sp-rate').value) || 0;
  const rAnn = (parseFloat(document.getElementById('sp-zins').value) || 0) / 100;
  const t = parseInt(document.getElementById('sp-jahre').value) || 0;

  if((P <= 0 && pmt <= 0) || rAnn < 0 || t <= 0){ clearResult('sp-result'); return; }

  const r = Math.pow(1 + rAnn, 1/12) - 1; // monthly rate
  const months = t * 12;
  let FV;
  if(r === 0){
    FV = P + pmt * months;
  } else {
    FV = P * Math.pow(1+r, months) + pmt * (Math.pow(1+r, months) - 1) / r;
  }
  const totalPmt = P + pmt * months;
  const zinsen = FV - totalPmt;

  const el = document.getElementById('sp-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Endkapital nach ' + t + ' Jahren',
    fmtK(FV),
    `${pmt > 0 ? pmt.toFixed(0) + ' €/Monat × ' + months + ' Monate' : ''}`,
    [
      {label:'Eingezahltes Kapital', val: fmtK(totalPmt)},
      {label:'Zinserträge', val: fmtK(zinsen), cls:'pos'},
      {label:'Anteil Zinsen am Endwert', val: ((zinsen/FV)*100).toFixed(1).replace('.',',') + ' %', cls:'pos'},
      {label:'Effektiver Monatsbeitrag', val: fmtK(pmt)},
    ],
    'sp-chart'
  );

  // yearly data
  const labels = [], dataE = [], dataZ = [];
  const step = t <= 20 ? 1 : Math.ceil(t/20);
  for(let y = 0; y <= t; y += step){
    const m = y * 12;
    const v = r === 0 ? P + pmt*m : P*Math.pow(1+r,m) + pmt*(Math.pow(1+r,m)-1)/r;
    const einz = P + pmt * m;
    labels.push(y + ' J.');
    dataE.push(+einz.toFixed(2));
    dataZ.push(+(v - einz).toFixed(2));
  }

  makeChart('sp-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {label:'Einzahlungen', data: dataE, backgroundColor:'#2563eb', stack:'s'},
        {label:'Zinserträge', data: dataZ, backgroundColor:'#10b981', stack:'s'}
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{stacked:true, ticks:{font:{size:10}}}, y:{stacked:true, ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// INFLATION
// ============================================================
function calcInflation(){
  const B = parseFloat(document.getElementById('inf-betrag').value) || 0;
  const inf = (parseFloat(document.getElementById('inf-rate').value) || 0) / 100;
  const t = parseInt(document.getElementById('inf-jahre').value) || 0;

  if(B <= 0 || inf <= 0 || t <= 0){ clearResult('inf-result'); return; }

  const kaufkraft = B / Math.pow(1+inf, t);
  const verlust = B - kaufkraft;
  const benoetigt = B * Math.pow(1+inf, t);

  const el = document.getElementById('inf-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Reale Kaufkraft in ' + t + ' Jahren',
    fmtK(kaufkraft),
    `von heute ${fmtK(B)}`,
    [
      {label:'Kaufkraftverlust', val: fmtK(verlust), cls:'neg'},
      {label:'Kaufkraftverlust %', val: ((verlust/B)*100).toFixed(1).replace('.',',') + ' %', cls:'neg'},
      {label:'Benötigt für gleiche Kaufkraft', val: fmtK(benoetigt)},
      {label:'Inflationsrate p.a.', val: (inf*100).toFixed(1).replace('.',',') + ' %'},
    ],
    'inf-chart'
  );

  const labels = [], data = [];
  const step = t <= 20 ? 1 : Math.ceil(t/20);
  for(let y = 0; y <= t; y += step){
    labels.push(y + ' J.');
    data.push(+(B / Math.pow(1+inf, y)).toFixed(2));
  }

  makeChart('inf-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Kaufkraft (€)',
        data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// KREDIT
// ============================================================
function calcKredit(){
  const P = parseFloat(document.getElementById('kr-summe').value) || 0;
  const rAnn = (parseFloat(document.getElementById('kr-zins').value) || 0) / 100;
  const t = parseInt(document.getElementById('kr-jahre').value) || 0;

  if(P <= 0 || rAnn <= 0 || t <= 0){ clearResult('kr-result'); return; }

  const r = rAnn / 12;
  const n = t * 12;
  const M = P * (r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  const gesamt = M * n;
  const zinsen = gesamt - P;

  const el = document.getElementById('kr-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Monatliche Rate',
    fmtK(M),
    `über ${t} Jahre (${n} Monate)`,
    [
      {label:'Kreditsumme (Netto)', val: fmtK(P)},
      {label:'Gesamtzinsen', val: fmtK(zinsen), cls:'neg'},
      {label:'Gesamtbetrag', val: fmtK(gesamt)},
      {label:'Zinsanteil am Gesamtbetrag', val: ((zinsen/gesamt)*100).toFixed(1).replace('.',',') + ' %', cls:'neg'},
    ],
    'kr-chart'
  );

  makeChart('kr-chart', {
    type: 'doughnut',
    data: {
      labels: ['Tilgung', 'Zinsen'],
      datasets: [{data: [+P.toFixed(2), +zinsen.toFixed(2)], backgroundColor:['#2563eb','#ef4444'], borderWidth:0}]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      cutout: '65%',
      plugins:{
        legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}},
        tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}
      }
    }
  });
}

// ============================================================
// RENDITE
// ============================================================
function calcRendite(){
  const start = parseFloat(document.getElementById('rd-start').value) || 0;
  const end_ = parseFloat(document.getElementById('rd-end').value) || 0;
  const t = parseFloat(document.getElementById('rd-jahre').value) || 0;
  const div = parseFloat(document.getElementById('rd-divid').value) || 0;

  if(start <= 0 || end_ <= 0 || t <= 0){ clearResult('rd-result'); return; }

  const gesamtEnd = end_ + div;
  const absRendite = (gesamtEnd - start) / start;
  const cagr = Math.pow(gesamtEnd / start, 1/t) - 1;
  const absOhne = (end_ - start) / start;

  const el = document.getElementById('rd-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'CAGR (jährliche Rendite)',
    pct(cagr),
    `über ${t} Jahr${t !== 1 ? 'e' : ''}`,
    [
      {label:'Absolute Rendite (gesamt)', val: pct(absRendite), cls: absRendite >= 0 ? 'pos' : 'neg'},
      {label:'Kursentwicklung', val: pct(absOhne), cls: absOhne >= 0 ? 'pos' : 'neg'},
      {label:'Inkl. Ausschüttungen', val: fmtK(div)},
      {label:'Gewinn/Verlust', val: fmtK(gesamtEnd - start), cls: gesamtEnd >= start ? 'pos' : 'neg'},
    ],
    'rd-chart'
  );

  // Simulate growth curve with CAGR
  const labels = [], data = [];
  for(let y = 0; y <= t; y++){
    labels.push(y + ' J.');
    data.push(+(start * Math.pow(1+cagr, y)).toFixed(2));
  }

  makeChart('rd-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:'Portfoliowert',
        data,
        borderColor: cagr >= 0 ? '#10b981' : '#ef4444',
        backgroundColor: cagr >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// FIRE
// ============================================================
function calcFIRE(){
  const ausgaben = parseFloat(document.getElementById('fi-ausgaben').value) || 0;
  const vermoegen = parseFloat(document.getElementById('fi-vermoegen').value) || 0;
  const sparrate = parseFloat(document.getElementById('fi-sparrate').value) || 0;
  const rendite = (parseFloat(document.getElementById('fi-rendite').value) || 7) / 100;

  if(ausgaben <= 0 || sparrate <= 0){ clearResult('fi-result'); return; }

  const fireZahl = ausgaben * 12 * 25;
  const r = Math.pow(1+rendite, 1/12) - 1;
  let v = vermoegen;
  let monate = 0;
  const maxMonate = 600; // 50 Jahre max
  while(v < fireZahl && monate < maxMonate){
    v = v * (1+r) + sparrate;
    monate++;
  }
  const jahre = Math.ceil(monate/12);
  const enoughAlready = vermoegen >= fireZahl;

  const el = document.getElementById('fi-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Deine FIRE-Zahl',
    fmtK(fireZahl),
    `= ${fmtK(ausgaben * 12)} Jahresausgaben × 25`,
    [
      {label: enoughAlready ? '🎉 Bereits erreicht!' : 'Geschätzte Zeit bis FIRE',
       val: enoughAlready ? 'Glückwunsch!' : jahre + ' Jahre', cls: enoughAlready ? 'pos' : ''},
      {label:'Monatliche Ausgaben', val: fmtK(ausgaben)},
      {label:'Jährliche Ausgaben', val: fmtK(ausgaben*12)},
      {label:'Monatliche Sparrate', val: fmtK(sparrate)},
      {label:'Aktuelles Vermögen', val: fmtK(vermoegen)},
    ],
    'fi-chart'
  );

  // Show progress bar chart
  const dataYears = [0];
  const dataVerm = [vermoegen];
  const step = Math.max(1, Math.floor(monate/20/12));
  for(let y = step; y <= jahre; y += step){
    let vv = vermoegen;
    for(let m = 0; m < y*12; m++) vv = vv*(1+r) + sparrate;
    dataYears.push(y);
    dataVerm.push(+vv.toFixed(2));
  }
  if(!enoughAlready){
    dataYears.push(jahre);
    dataVerm.push(+fireZahl.toFixed(2));
  }

  makeChart('fi-chart', {
    type: 'line',
    data: {
      labels: dataYears.map(y => y + ' J.'),
      datasets: [
        {label:'Vermögen', data: dataVerm, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.3, pointRadius:2},
        {label:'FIRE-Ziel', data: dataYears.map(()=>fireZahl), borderColor:'#2563eb', borderDash:[6,4], pointRadius:0, fill:false}
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// DIVIDENDEN
// ============================================================
function calcDividenden(){
  const W = parseFloat(document.getElementById('dv-wert').value) || 0;
  const rendite = (parseFloat(document.getElementById('dv-rendite').value) || 0) / 100;
  const wachstum = (parseFloat(document.getElementById('dv-wachstum').value) || 0) / 100;
  const t = parseInt(document.getElementById('dv-jahre').value) || 0;

  if(W <= 0 || rendite <= 0 || t <= 0){ clearResult('dv-result'); return; }

  const divJetzt = W * rendite;
  const divMonat = divJetzt / 12;
  const divFuture = divJetzt * Math.pow(1 + wachstum, t);
  // Total dividends over period (growing annuity)
  let total = 0;
  for(let y = 0; y < t; y++) total += divJetzt * Math.pow(1 + wachstum, y);

  const el = document.getElementById('dv-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Aktuelle Jahresdividende',
    fmtK(divJetzt),
    `= ${fmtK(divMonat)} / Monat`,
    [
      {label:'Dividende / Monat (heute)', val: fmtK(divMonat), cls:'pos'},
      {label:'Dividende / Jahr (heute)', val: fmtK(divJetzt), cls:'pos'},
      {label:`Dividende / Jahr in ${t} Jahren`, val: fmtK(divFuture), cls:'pos'},
      {label:`Gesamtausschüttung über ${t} Jahre`, val: fmtK(total)},
      {label:'Dividendenwachstum p.a.', val: (wachstum*100).toFixed(1).replace('.',',')+' %'},
    ],
    'dv-chart'
  );

  const labels = [], data = [];
  const step = t <= 20 ? 1 : Math.ceil(t/20);
  for(let y = 0; y <= t; y += step){
    labels.push(y + ' J.');
    data.push(+(divJetzt * Math.pow(1 + wachstum, y)).toFixed(2));
  }
  makeChart('dv-chart', {
    type: 'line',
    data: { labels, datasets: [{label:'Jahresdividende (€)', data, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.12)', fill:true, tension:0.3, pointRadius:3}] },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx => ' '+fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback:v=>fmtK(v), font:{size:10}}}}
    }
  });
}

function clearResult(id){
  const icons = {
    'zz-result':'📊','sp-result':'💰','inf-result':'🔥',
    'kr-result':'🏦','rd-result':'📊','fi-result':'🎯'
  };
  const el = document.getElementById(id);
  if(el) el.innerHTML = `<h3>Ergebnis</h3><div class="result-empty"><span class="result-empty-icon">${icons[id]||'📊'}</span><p>Gib deine Werte links ein und starte die Berechnung.</p></div>`;
}
