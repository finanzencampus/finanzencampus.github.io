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

  const totalEinzahlung = totalPmt;
  const gesamtZinsen = zinsen;

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
  ) + `<div class="chart-wrap"><canvas id="sparplanDonut"></canvas></div>`;

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

  makeChart('sparplanDonut', {
    type: 'doughnut',
    data: {
      labels: ['Eingezahltes Kapital', 'Zinsertrag'],
      datasets: [{
        data: [+totalEinzahlung.toFixed(2), +gesamtZinsen.toFixed(2)],
        backgroundColor: ['#2563eb', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {position:'bottom', labels:{boxWidth:12, font:{size:11}}},
        tooltip: {callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}
      }
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
  ) + `<div class="chart-wrap"><canvas id="kreditVerlaufChart"></canvas></div>`;

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

  // Restschuld-Verlauf
  const krLabels = [], krData = [];
  const rMon = rAnn / 12;
  for(let y = 0; y <= t; y++){
    const mGone = y * 12;
    const restschuld = P * Math.pow(1 + rMon, mGone) - M * (Math.pow(1 + rMon, mGone) - 1) / rMon;
    krLabels.push(y + ' J.');
    krData.push(+Math.max(0, restschuld).toFixed(2));
  }

  makeChart('kreditVerlaufChart', {
    type: 'line',
    data: {
      labels: krLabels,
      datasets: [{
        label: 'Restschuld (€)',
        data: krData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
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

// ============================================================
// ETF-KOSTEN
// ============================================================
function calcETFKosten(){
  const betrag = parseFloat(document.getElementById('etf-betrag').value) || 0;
  const jahre = parseInt(document.getElementById('etf-jahre').value) || 0;
  const rendite = parseFloat(document.getElementById('etf-rendite').value) || 0;
  const terLow = parseFloat(document.getElementById('etf-ter-low').value) || 0;
  const terHigh = parseFloat(document.getElementById('etf-ter-high').value) || 0;

  if(betrag <= 0 || jahre <= 0 || rendite <= 0){ clearResult('etf-result'); return; }

  // Jährliches Wachstum: Kapital *= (1 + (rendite - ter) / 100)
  const rLow = (rendite - terLow) / 100;
  const rHigh = (rendite - terHigh) / 100;

  const endLow = betrag * Math.pow(1 + rLow, jahre);
  const endHigh = betrag * Math.pow(1 + rHigh, jahre);
  const differenz = endLow - endHigh;

  const el = document.getElementById('etf-result');
  el.innerHTML = `<h3>Ergebnis</h3>` + resultHTML(
    'Kostenvorteil nach ' + jahre + ' Jahren',
    fmtK(differenz),
    `durch TER-Unterschied von ${(terHigh - terLow).toFixed(2).replace('.',',')} %`,
    [
      {label:`Endkapital günstig (TER ${terLow.toFixed(2).replace('.',',')} %)`, val: fmtK(endLow), cls:'pos'},
      {label:`Endkapital teuer (TER ${terHigh.toFixed(2).replace('.',',')} %)`, val: fmtK(endHigh)},
      {label:'Kostendifferenz (Verlust durch hohe TER)', val: fmtK(differenz), cls:'neg'},
      {label:'Renditeminderung durch hohe TER', val: ((differenz/endLow)*100).toFixed(1).replace('.',',') + ' %', cls:'neg'},
    ],
    'etf-chart'
  );

  // Beide Verläufe berechnen
  const labels = [], dataLow = [], dataHigh = [];
  const step = jahre <= 20 ? 1 : Math.ceil(jahre/20);
  for(let y = 0; y <= jahre; y += step){
    labels.push(y + ' J.');
    dataLow.push(+(betrag * Math.pow(1 + rLow, y)).toFixed(2));
    dataHigh.push(+(betrag * Math.pow(1 + rHigh, y)).toFixed(2));
  }

  makeChart('etf-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Günstiger ETF (TER ${terLow.toFixed(2).replace('.',',')} %)`,
          data: dataLow,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 2
        },
        {
          label: `Teurer Fonds (TER ${terHigh.toFixed(2).replace('.',',')} %)`,
          data: dataHigh,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins:{legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

// ============================================================
// NOTGROSCHEN
// ============================================================
function calcNotgroschen(){
  const fix = parseFloat(document.getElementById('ng-fix').value) || 0;
  const leben = parseFloat(document.getElementById('ng-leben').value) || 0;
  const erspartes = parseFloat(document.getElementById('ng-erspartes').value) || 0;

  if(fix <= 0 && leben <= 0){ clearResult('ng-result'); return; }

  const monatsausgaben = fix + leben;
  const ziel3 = monatsausgaben * 3;
  const ziel4 = monatsausgaben * 4;
  const ziel5 = monatsausgaben * 5;
  const ziel6 = monatsausgaben * 6;

  let ampelText, ampelClass, ampelIcon;
  if(erspartes >= ziel6){
    ampelText = 'Sehr gut abgesichert – 6+ Monatsausgaben vorhanden.';
    ampelClass = 'info-green';
    ampelIcon = '🟢';
  } else if(erspartes >= ziel3){
    ampelText = 'Grundabsicherung vorhanden – Ziel 6 Monate anstreben.';
    ampelClass = 'info-yellow';
    ampelIcon = '🟡';
  } else {
    ampelText = 'Notgroschen unzureichend – zuerst aufbauen, dann investieren!';
    ampelClass = 'info-red';
    ampelIcon = '🔴';
  }

  const fehlend = Math.max(0, ziel3 - erspartes);

  const el = document.getElementById('ng-result');
  el.innerHTML = `
    <h3>Ergebnis</h3>
    <div class="result-main fade-in">
      <div class="rl">Empfohlener Notgroschen (3–6 Monate)</div>
      <div class="rv">${fmtK(ziel3)} – ${fmtK(ziel6)}</div>
      <div class="rsv">Monatliche Ausgaben: ${fmtK(monatsausgaben)}</div>
    </div>
    <div class="result-rows">
      <div class="result-row"><span class="rrl">3 Monatsausgaben (Minimum)</span><span class="rrv">${fmtK(ziel3)}</span></div>
      <div class="result-row"><span class="rrl">4 Monatsausgaben</span><span class="rrv">${fmtK(ziel4)}</span></div>
      <div class="result-row"><span class="rrl">5 Monatsausgaben</span><span class="rrv">${fmtK(ziel5)}</span></div>
      <div class="result-row"><span class="rrl">6 Monatsausgaben (Empfehlung)</span><span class="rrv">${fmtK(ziel6)}</span></div>
      <div class="result-row"><span class="rrl">Aktuelles Erspartes</span><span class="rrv ${erspartes >= ziel3 ? 'pos' : 'neg'}">${fmtK(erspartes)}</span></div>
      ${fehlend > 0 ? `<div class="result-row"><span class="rrl">Fehlend bis 3-Monats-Ziel</span><span class="rrv neg">${fmtK(fehlend)}</span></div>` : ''}
    </div>
    <div class="info-box ${ampelClass}" style="margin-top:12px">${ampelIcon} ${ampelText}</div>
    <div class="chart-wrap"><canvas id="ng-chart"></canvas></div>
  `;

  makeChart('ng-chart', {
    type: 'bar',
    data: {
      labels: ['Aktuelles Erspartes', '3-Monats-Ziel', '6-Monats-Ziel'],
      datasets: [{
        label: 'Betrag (€)',
        data: [+erspartes.toFixed(2), +ziel3.toFixed(2), +ziel6.toFixed(2)],
        backgroundColor: [
          erspartes >= ziel3 ? '#10b981' : erspartes >= ziel3 * 0.5 ? '#f59e0b' : '#ef4444',
          '#2563eb',
          '#6366f1'
        ],
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx => ' ' + fmtK(ctx.raw)}}},
      scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{callback: v => fmtK(v), font:{size:10}}}}
    }
  });
}

function clearResult(id){
  const icons = {
    'zz-result':'📊','sp-result':'💰','inf-result':'🔥',
    'kr-result':'🏦','rd-result':'📊','fi-result':'🎯',
    'etf-result':'💰','ng-result':'🛡️'
  };
  const el = document.getElementById(id);
  if(el) el.innerHTML = `<h3>Ergebnis</h3><div class="result-empty"><span class="result-empty-icon">${icons[id]||'📊'}</span><p>Gib deine Werte links ein und starte die Berechnung.</p></div>`;
}
