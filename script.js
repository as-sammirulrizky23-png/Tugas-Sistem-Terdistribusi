/* =========================================================
   SIMULASI KONSENSUS PROOF-OF-STAKE (PoS)
   =========================================================
   Konsep yang disimulasikan:
   1. Setiap validator mengunci sejumlah "stake" (coin).
   2. Peluang seorang validator terpilih sebagai pembuat blok
      (block proposer) berbanding lurus dengan porsi stake-nya
      terhadap total stake seluruh jaringan (weighted random
      selection) -- inti dari algoritma PoS.
   3. Setelah terpilih, validator "memvalidasi" transaksi dan
      blok baru ditambahkan ke chain, lalu validator menerima
      reward.
   4. Opsional: simulasi slashing (validator jahat/lalai
      kehilangan sebagian stake) dan validator gagal/offline.
   ========================================================= */

let validators = [];
let chain = [];
let idCounter = 1;

const COLORS = ["#6c5ce7", "#00d2a0", "#ffb84d", "#ff5b6e", "#4da3ff", "#e17bd6", "#ffd166"];

// ---------- Util ----------
function simpleHash(str) {
  // Hash sederhana (bukan kriptografis) hanya untuk keperluan visual simulasi
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function colorFor(index) {
  return COLORS[index % COLORS.length];
}

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

function logEvent(msg, type = "") {
  const el = document.getElementById("eventLog");
  const line = document.createElement("div");
  line.className = "log-line" + (type ? " " + type : "");
  const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
  line.textContent = `[${time}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ---------- Validator management ----------
function addValidator(name, stake) {
  validators.push({
    id: idCounter++,
    name,
    stake,
    blocksForged: 0,
    slashedAmount: 0,
    color: colorFor(validators.length),
  });
  logEvent(`Validator "${name}" bergabung dengan stake ${stake} koin.`);
  renderAll();
}

function removeValidator(id) {
  const v = validators.find((x) => x.id === id);
  validators = validators.filter((x) => x.id !== id);
  if (v) logEvent(`Validator "${v.name}" keluar dari jaringan.`, "warn");
  renderAll();
}

function totalStake() {
  return validators.reduce((sum, v) => sum + v.stake, 0);
}

// ---------- Inti algoritma PoS: weighted random selection ----------
function selectValidator() {
  const total = totalStake();
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const v of validators) {
    r -= v.stake;
    if (r <= 0) return v;
  }
  return validators[validators.length - 1];
}

// ---------- Forge block ----------
function forgeBlock() {
  if (validators.length === 0) {
    logEvent("Tidak ada validator. Tambahkan validator terlebih dahulu.", "danger");
    return;
  }

  const proposer = selectValidator();
  const failEnabled = document.getElementById("chkFail").checked;
  const slashEnabled = document.getElementById("chkSlash").checked;

  // Simulasi validator gagal / offline (10%)
  if (failEnabled && Math.random() < 0.1) {
    logEvent(`Validator "${proposer.name}" terpilih namun GAGAL / OFFLINE saat validasi. Giliran dilempar ke validator lain.`, "warn");
    // pilih ulang dari sisa validator (sederhana: pilih ulang dari semua)
    const backup = selectValidator();
    if (!backup) return;
    createBlockFor(backup);
    return;
  }

  createBlockFor(proposer);

  // Simulasi slashing (5%) - validator kehilangan sebagian stake karena
  // dianggap melakukan pelanggaran protokol (mis. double-signing)
  if (slashEnabled && Math.random() < 0.05) {
    const penalty = Math.max(1, Math.round(proposer.stake * 0.1));
    proposer.stake = Math.max(0, proposer.stake - penalty);
    proposer.slashedAmount += penalty;
    logEvent(`⚠ SLASHING: Validator "${proposer.name}" terdeteksi melanggar aturan protokol dan kehilangan ${penalty} koin stake.`, "danger");
  }

  renderAll();
}

function createBlockFor(proposer) {
  const prevBlock = chain[chain.length - 1];
  const prevHash = prevBlock ? prevBlock.hash : "0".repeat(8);
  const index = chain.length;
  const timestamp = new Date().toLocaleString("id-ID");
  const data = `Block ${index} oleh ${proposer.name} stake=${proposer.stake}`;
  const hash = simpleHash(prevHash + data + Date.now());
  const reward = 2;

  chain.push({
    index,
    proposer: proposer.name,
    color: proposer.color,
    stake: proposer.stake,
    prevHash,
    hash,
    timestamp,
    reward,
  });

  proposer.blocksForged += 1;
  proposer.stake += reward;

  logEvent(`✅ Blok #${index} berhasil dibuat oleh "${proposer.name}" (reward +${reward} koin).`, "success");
}

// ---------- Reset ----------
function resetSimulation() {
  validators = [];
  chain = [];
  idCounter = 1;
  document.getElementById("eventLog").innerHTML = "";
  logEvent("Simulasi direset.");
  renderAll();
}

// ---------- Rendering ----------
function renderValidatorList() {
  const container = document.getElementById("validatorList");
  container.innerHTML = "";
  const total = totalStake();

  if (validators.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:12.5px;">Belum ada validator. Tambahkan minimal 2 validator untuk memulai simulasi.</p>`;
    return;
  }

  validators
    .slice()
    .sort((a, b) => b.stake - a.stake)
    .forEach((v) => {
      const pct = total > 0 ? ((v.stake / total) * 100).toFixed(1) : "0.0";
      const card = document.createElement("div");
      card.className = "validator-card";
      card.innerHTML = `
        <div class="avatar" style="background:${v.color}">${initials(v.name)}</div>
        <div>
          <div class="name">${v.name}</div>
          <div class="stake">Stake: ${v.stake} • Blok dibuat: ${v.blocksForged}${v.slashedAmount ? ` • Slashed: ${v.slashedAmount}` : ""}</div>
        </div>
        <div class="pct">${pct}%</div>
        <button class="removeBtn" title="Hapus validator" data-id="${v.id}">✕</button>
      `;
      container.appendChild(card);
    });

  container.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", () => removeValidator(Number(btn.dataset.id)));
  });
}

function renderChain() {
  const container = document.getElementById("chain");
  container.innerHTML = "";

  const genesis = document.createElement("div");
  genesis.className = "block genesis";
  genesis.innerHTML = `
    <div class="b-index">GENESIS</div>
    <div class="b-row"><b>Hash:</b> ${"0".repeat(8)}</div>
    <div class="b-row">Blok awal chain</div>
  `;
  container.appendChild(genesis);

  chain.forEach((b) => {
    const arrow = document.createElement("div");
    arrow.className = "chain-arrow";
    arrow.textContent = "→";
    container.appendChild(arrow);

    const block = document.createElement("div");
    block.className = "block";
    block.style.borderColor = b.color;
    block.innerHTML = `
      <div class="b-index" style="color:${b.color}">Block #${b.index}</div>
      <div class="b-row"><b>Proposer:</b> ${b.proposer}</div>
      <div class="b-row"><b>Hash:</b> ${b.hash}</div>
      <div class="b-row"><b>Prev:</b> ${b.prevHash}</div>
      <div class="b-row"><b>Waktu:</b> ${b.timestamp}</div>
      <div class="b-row"><b>Reward:</b> +${b.reward} koin</div>
    `;
    container.appendChild(block);
  });

  container.scrollLeft = container.scrollWidth;
}

function renderStats() {
  const container = document.getElementById("statsGrid");
  const total = totalStake();
  const topValidator = validators.slice().sort((a, b) => b.blocksForged - a.blocksForged)[0];

  const stats = [
    { val: validators.length, lbl: "Total Validator" },
    { val: total, lbl: "Total Stake Jaringan" },
    { val: chain.length, lbl: "Total Blok" },
    { val: topValidator ? topValidator.name : "-", lbl: "Validator Teraktif" },
  ];

  container.innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`)
    .join("");
}

function renderChart() {
  const canvas = document.getElementById("probChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
  const cssHeight = 150;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (validators.length === 0) {
    ctx.fillStyle = "#9aa0b4";
    ctx.font = "12px sans-serif";
    ctx.fillText("Tambahkan validator untuk melihat grafik peluang.", 10, 30);
    return;
  }

  const total = totalStake();
  const padding = 10;
  const barGap = 14;
  const barWidth = (cssWidth - padding * 2 - barGap * (validators.length - 1)) / validators.length;
  const maxBarHeight = cssHeight - 34;

  validators.forEach((v, i) => {
    const pct = total > 0 ? v.stake / total : 0;
    const barHeight = pct * maxBarHeight;
    const x = padding + i * (barWidth + barGap);
    const y = cssHeight - 20 - barHeight;

    ctx.fillStyle = v.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#e8eaf0";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, x + barWidth / 2, y - 6);
    ctx.fillStyle = "#9aa0b4";
    ctx.fillText(v.name.slice(0, 8), x + barWidth / 2, cssHeight - 6);
  });
  ctx.textAlign = "left";
}

function renderAll() {
  renderValidatorList();
  renderChain();
  renderStats();
  renderChart();
}

// ---------- Event bindings ----------
document.getElementById("btnAddValidator").addEventListener("click", () => {
  const nameInput = document.getElementById("valName");
  const stakeInput = document.getElementById("valStake");
  const name = nameInput.value.trim();
  const stake = parseInt(stakeInput.value, 10);

  if (!name || !stake || stake <= 0) {
    logEvent("Nama validator dan jumlah stake harus valid.", "danger");
    return;
  }
  addValidator(name, stake);
  nameInput.value = "";
  stakeInput.value = "";
});

document.getElementById("btnForgeBlock").addEventListener("click", forgeBlock);
document.getElementById("btnReset").addEventListener("click", resetSimulation);
window.addEventListener("resize", renderChart);

// ---------- Data awal (contoh) ----------
addValidator("Node-A", 50);
addValidator("Node-B", 30);
addValidator("Node-C", 20);
logEvent("Simulasi Proof-of-Stake siap. Klik 'Forge Block' untuk memulai.");
