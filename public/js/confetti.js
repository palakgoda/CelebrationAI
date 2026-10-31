/**
 * CelebrationAI Canvas Confetti System
 * Lightweight, high-performance festive particle physics engine (no external CDN dependencies).
 * Festive Indian Celebration Palette: Royal Gold, Deep Terracotta, Marigold Saffron, Emerald, Rose Ruby.
 */

const PALETTE = [
  "#C04A26", // Deep Terracotta
  "#F59E0B", // Marigold Saffron
  "#EAB308", // Royal Gold
  "#10B981", // Festive Emerald
  "#EC4899", // Gulabi Rose
  "#8B5CF6", // Royal Jamun Purple
];

let canvas = null;
let ctx = null;
let particles = [];
let animationId = null;

function getOrCreateCanvas() {
  if (canvas && document.body.contains(canvas)) {
    return canvas;
  }
  canvas = document.createElement("canvas");
  canvas.id = "celebration-confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");

  function resize() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }
  window.addEventListener("resize", resize);
  resize();
  return canvas;
}

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 5;
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 6; // upward burst
    this.gravity = 0.28;
    this.drag = 0.96;
    this.rotation = Math.random() * 360;
    this.vRotation = (Math.random() - 0.5) * 12;
    this.opacity = 1;
    this.decay = Math.random() * 0.012 + 0.008;
    this.shape = Math.random() > 0.3 ? "rect" : "circle";
  }

  update() {
    this.vx *= this.drag;
    this.vy = (this.vy + this.gravity) * this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vRotation;
    this.opacity -= this.decay;
  }

  draw(context) {
    if (this.opacity <= 0) return;
    context.save();
    context.translate(this.x, this.y);
    context.rotate((this.rotation * Math.PI) / 180);
    context.globalAlpha = Math.max(0, this.opacity);
    context.fillStyle = this.color;

    if (this.shape === "rect") {
      context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.4);
    } else {
      context.beginPath();
      context.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

function loop() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.opacity <= 0 || p.y > canvas.height + 20) {
      particles.splice(i, 1);
    }
  }

  if (particles.length > 0) {
    animationId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(animationId);
    animationId = null;
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
      canvas = null;
      ctx = null;
    }
  }
}

export function triggerCelebrationConfetti(originX, originY, count = 90) {
  // Check user preference for reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  getOrCreateCanvas();
  const ox = originX !== undefined ? originX : window.innerWidth / 2;
  const oy = originY !== undefined ? originY : window.innerHeight * 0.4;

  for (let i = 0; i < count; i++) {
    particles.push(new ConfettiParticle(ox, oy));
  }

  if (!animationId) {
    loop();
  }
}
