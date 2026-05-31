/* =============================================
   LOVE SPA - Main Application Logic
   ============================================= */

'use strict';

// -----------------------------------------------
// STATE MACHINE
// -----------------------------------------------
let currentPhase = 1;

function goToPhase(next) {
  const current = document.getElementById(`phase-${currentPhase}`);
  const target  = document.getElementById(`phase-${next}`);
  if (!target || !current) return;

  // Exit current
  current.classList.add('exit');
  current.classList.remove('active');

  setTimeout(() => {
    current.classList.remove('exit');

    // Enter next
    target.classList.add('active');
    currentPhase = next;

    // Phase-specific hooks
    onPhaseEnter(next);
  }, 400);
}

function onPhaseEnter(phase) {
  if (phase === 2) initRunawayBtn('btn-p2-no');
  if (phase === 4) initRunawayBtn('btn-p4-think');
  if (phase === 5) spawnExtraPetals(20);
  if (phase === 9) initCanvasPhase();
}

// -----------------------------------------------
// PETAL BACKGROUND
// -----------------------------------------------
const PETAL_EMOJIS = ['🌸','💗','✨','🌷','💕','🌺','💖'];

function createPetal() {
  const el = document.createElement('span');
  el.className = 'petal';
  el.textContent = PETAL_EMOJIS[Math.floor(Math.random() * PETAL_EMOJIS.length)];
  el.style.left = `${Math.random() * 100}%`;
  el.style.fontSize = `${12 + Math.random() * 16}px`;
  const dur = 6 + Math.random() * 8;
  el.style.animationDuration = `${dur}s`;
  el.style.animationDelay = `${Math.random() * -8}s`;
  document.getElementById('petals-bg').appendChild(el);
}

function spawnExtraPetals(count) {
  for (let i = 0; i < count; i++) {
    setTimeout(createPetal, i * 80);
  }
}

// Seed initial petals
(function initPetals() {
  for (let i = 0; i < 12; i++) createPetal();
})();

// -----------------------------------------------
// RUNAWAY BUTTON LOGIC
// -----------------------------------------------
const runawayState = {}; // track initialized buttons

function getViewportBounds(btn) {
  const margin = 16;
  const w = btn.offsetWidth  || 120;
  const h = btn.offsetHeight || 44;
  return {
    minX: margin,
    minY: margin,
    maxX: window.innerWidth  - w - margin,
    maxY: window.innerHeight - h - margin,
  };
}

function randomPos(btn) {
  const b = getViewportBounds(btn);
  return {
    x: b.minX + Math.random() * (b.maxX - b.minX),
    y: b.minY + Math.random() * (b.maxY - b.minY),
  };
}

function moveRunaway(btn) {
  const pos = randomPos(btn);
  btn.style.left = pos.x + 'px';
  btn.style.top  = pos.y + 'px';
}

function initRunawayBtn(id) {
  const btn = document.getElementById(id);
  if (!btn || runawayState[id]) return;
  runawayState[id] = true;

  // Place it initially in the normal flow position
  const rect = btn.getBoundingClientRect();
  btn.style.left = rect.left + 'px';
  btn.style.top  = rect.top  + 'px';
  btn.classList.add('runaway');

  btn.addEventListener('mouseenter', () => moveRunaway(btn));
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveRunaway(btn);
  }, { passive: false });
}

// -----------------------------------------------
// MODAL LOGIC
// -----------------------------------------------
const modal = document.getElementById('modal-overlay');

function openModal() {
  modal.classList.add('active');
  // Init runaway on modal's think button
  setTimeout(() => initRunawayBtn('btn-modal-think'), 50);
}

function closeModal() {
  modal.classList.remove('active');
}

// -----------------------------------------------
// BUTTON WIRING
// -----------------------------------------------

// Phase 1
document.getElementById('btn-p1-start').addEventListener('click', () => goToPhase(2));

// Phase 2
document.getElementById('btn-p2-yes').addEventListener('click', () => goToPhase(3));

// Phase 3
document.getElementById('btn-p3-yes').addEventListener('click', () => goToPhase(4));
document.getElementById('btn-p3-no').addEventListener('click',  () => openModal());

// Modal
document.getElementById('btn-modal-yes').addEventListener('click', () => {
  closeModal();
  goToPhase(5);
});
// btn-modal-think is runaway — does nothing on actual click

// Phase 4
document.getElementById('btn-p4-yes').addEventListener('click', () => goToPhase(5));

// Phase 5
document.getElementById('btn-p5-next').addEventListener('click', () => goToPhase(6));

// Phase 6
document.getElementById('btn-p6-next').addEventListener('click', () => goToPhase(7));

// Phase 7
document.getElementById('btn-p7-next').addEventListener('click', () => goToPhase(8));

// Phase 8
document.getElementById('btn-p8-next').addEventListener('click', () => goToPhase(9));

// Phase 9 restart
document.getElementById('btn-restart').addEventListener('click', () => {
  restartCanvas();
});

// -----------------------------------------------
// CANVAS PHASE: HEART PARTICLE ENGINE
// -----------------------------------------------
let animFrameId    = null;
let particles      = [];
let heartPoints    = [];
let speedMultiplier = 5;

const canvas  = document.getElementById('heart-canvas');
const ctx     = canvas.getContext('2d');
const slider  = document.getElementById('speed-slider');

slider.addEventListener('input', () => {
  speedMultiplier = parseInt(slider.value, 10);
});

// Build the heart shape points
function buildHeartPoints(cx, cy, scale, density) {
  const pts = [];
  for (let t = 0; t < Math.PI * 2; t += 0.04) {
    const x = cx + scale * 16 * Math.pow(Math.sin(t), 3);
    const y = cy - scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    pts.push({ x, y });
  }
  // Fill interior with random points
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));

  for (let i = 0; i < density; i++) {
    const rx = minX + Math.random() * (maxX - minX);
    const ry = minY + Math.random() * (maxY - minY);
    if (isInsideHeart(rx, ry, cx, cy, scale)) {
      pts.push({ x: rx, y: ry });
    }
  }
  return pts;
}

function isInsideHeart(px, py, cx, cy, scale) {
  const x = (px - cx) / (scale * 16);
  const y = -(py - cy) / (scale * 13);
  const val = (x*x + y*y - 1);
  return val * val * val - x*x * y*y*y <= 0;
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const maxW = Math.min(container.clientWidth * 0.92, 480);
  const maxH = Math.min(window.innerHeight * 0.52, 420);
  const size  = Math.min(maxW, maxH);
  canvas.width  = size;
  canvas.height = size;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
}

function createParticle(targetPt) {
  const edge = Math.floor(Math.random() * 4);
  let startX, startY;
  const W = canvas.width, H = canvas.height;

  if      (edge === 0) { startX = Math.random() * W; startY = -20; }
  else if (edge === 1) { startX = W + 20;             startY = Math.random() * H; }
  else if (edge === 2) { startX = Math.random() * W; startY = H + 20; }
  else                 { startX = -20;                startY = Math.random() * H; }

  const emojis = ['💗','❤️','💖','💝','🩷','💓','🌸','✨'];
  return {
    x:     startX,
    y:     startY,
    tx:    targetPt.x,
    ty:    targetPt.y,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    size:  10 + Math.random() * 10,
    speed: 0.03 + Math.random() * 0.04,
    arrived: false,
    opacity: 0,
  };
}

let spawnIndex    = 0;
let spawnInterval = null;

function spawnNextBatch() {
  const batchSize = Math.ceil(speedMultiplier * 0.8);
  for (let i = 0; i < batchSize && spawnIndex < heartPoints.length; i++, spawnIndex++) {
    particles.push(createParticle(heartPoints[spawnIndex]));
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let allArrived = true;

  for (const p of particles) {
    if (!p.arrived) {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const step = Math.max(speedMultiplier * 1.5, 1);

      if (dist < step) {
        p.x = p.tx;
        p.y = p.ty;
        p.arrived = true;
      } else {
        const angle = Math.atan2(dy, dx);
        p.x += Math.cos(angle) * step;
        p.y += Math.sin(angle) * step;
      }
      p.opacity = Math.min(1, p.opacity + 0.06);
      allArrived = false;
    }

    ctx.globalAlpha = p.opacity;
    ctx.font = `${p.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, p.x, p.y);
  }

  ctx.globalAlpha = 1;

  if (spawnIndex < heartPoints.length || !allArrived) {
    animFrameId = requestAnimationFrame(drawFrame);
  } else {
    // Final glow animation
    pulseHeart();
  }
}

function pulseHeart() {
  let scale    = 1;
  let growing  = false;
  let pulseCount = 0;

  function pulse() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    for (const p of particles) {
      ctx.globalAlpha = p.opacity;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x, p.y);
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    if (!growing) { scale -= 0.003; if (scale <= 0.97) growing = true; }
    else          { scale += 0.003; if (scale >= 1.01) { growing = false; pulseCount++; } }

    if (pulseCount < 4) {
      animFrameId = requestAnimationFrame(pulse);
    }
  }

  animFrameId = requestAnimationFrame(pulse);
}

function initCanvasPhase() {
  resizeCanvas();

  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.52;
  const scale = W / 90;

  heartPoints = buildHeartPoints(cx, cy, scale, 300);
  // Shuffle for organic feel
  for (let i = heartPoints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [heartPoints[i], heartPoints[j]] = [heartPoints[j], heartPoints[i]];
  }

  particles    = [];
  spawnIndex   = 0;

  // Spawn continuously
  spawnInterval = setInterval(() => {
    if (spawnIndex < heartPoints.length) {
      spawnNextBatch();
    } else {
      clearInterval(spawnInterval);
    }
  }, 60);

  animFrameId = requestAnimationFrame(drawFrame);
}

function restartCanvas() {
  if (animFrameId)    cancelAnimationFrame(animFrameId);
  if (spawnInterval)  clearInterval(spawnInterval);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  initCanvasPhase();
}

// Resize canvas when window changes
window.addEventListener('resize', () => {
  if (currentPhase === 9) {
    restartCanvas();
  }
});

// -----------------------------------------------
// MOBILE: Block page scroll when touching runaway btns
// -----------------------------------------------
document.addEventListener('touchmove', (e) => {
  if (e.target.classList.contains('runaway')) {
    e.preventDefault();
  }
}, { passive: false });
