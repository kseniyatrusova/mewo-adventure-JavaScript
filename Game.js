import { Player } from './Player.js';
import { Input } from './input.js';
import { aabb, resolvePlatforms } from './collision.js';

export const STATE = {
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost'
};

export class Game {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.images = images;
    this.input = new Input();

    this.worldW = 2400;
    this.camX = 0;

    this.player = new Player(60, 550, {
      idle: images.catIdle,
      blink: images.catBlink,
      jump: images.catJump
    });

    this.state = STATE.READY;
    this.flowersCollected = 0;
    this.time = 0;
    this.best = this.loadBest();
    this.lastTime = 0;
    this.running = false;

    // Longer varied level — bigger canvas 1280x640, floor at y=580
    this.platforms = [
      // ground segments
      { x: 0, y: 580, w: 300, h: 60, floor: true },
      { x: 380, y: 580, w: 260, h: 60, floor: true },
      { x: 720, y: 580, w: 220, h: 60, floor: true },
      { x: 1020, y: 580, w: 320, h: 60, floor: true },
      { x: 1440, y: 580, w: 240, h: 60, floor: true },
      { x: 1780, y: 580, w: 620, h: 60, floor: true },

      // floating platforms (varied sizes, spaced out)
      { x: 200, y: 490, w: 70, h: 20 },
      { x: 340, y: 420, w: 55, h: 20 },
      { x: 480, y: 480, w: 80, h: 20 },
      { x: 620, y: 400, w: 50, h: 20 },
      { x: 760, y: 460, w: 90, h: 20 },
      { x: 920, y: 380, w: 55, h: 20 },
      { x: 1080, y: 440, w: 70, h: 20 },
      { x: 1220, y: 360, w: 50, h: 20 },
      { x: 1360, y: 420, w: 85, h: 20 },
      { x: 1520, y: 360, w: 55, h: 20 },
      { x: 1680, y: 470, w: 75, h: 20 },
      { x: 1840, y: 400, w: 60, h: 20 },
      { x: 2000, y: 450, w: 90, h: 20 },
      { x: 2160, y: 380, w: 55, h: 20 },

      // platforms with spikes on top (hazard platforms)
      { x: 560, y: 340, w: 100, h: 20, spiked: true },
      { x: 1280, y: 300, w: 90, h: 20, spiked: true },
      { x: 1900, y: 320, w: 110, h: 20, spiked: true }
    ];

    this.flowers = [
      { x: 215, y: 455, w: 24, h: 24, collected: false },
      { x: 630, y: 365, w: 24, h: 24, collected: false },
      { x: 930, y: 345, w: 24, h: 24, collected: false },
      { x: 1530, y: 325, w: 24, h: 24, collected: false },
      { x: 2170, y: 345, w: 24, h: 24, collected: false }
    ];

    // pit spikes + spikes sitting on spiked platforms
    this.spikes = [
      { x: 300, y: 558, w: 80, h: 22 },
      { x: 640, y: 558, w: 80, h: 22 },
      { x: 940, y: 558, w: 80, h: 22 },
      { x: 1340, y: 558, w: 100, h: 22 },
      { x: 1680, y: 558, w: 100, h: 22 },
      // on top of spiked platforms
      { x: 570, y: 320, w: 80, h: 20 },
      { x: 1290, y: 280, w: 70, h: 20 },
      { x: 1915, y: 300, w: 80, h: 20 }
    ];

    this.finish = { x: 2280, y: 524, w: 80, h: 56 };

    // twinkling stars over background
    this.stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * this.worldW,
      y: Math.random() * 450,
      s: Math.random() < 0.7 ? 2 : 3,
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 2.5
    }));

    this._bindUI();
    this._updateHUD();
    this.render();
  }

  _bindUI() {
    this.btnStart = document.getElementById('btn-start');
    this.btnPause = document.getElementById('btn-pause');
    this.btnRestart = document.getElementById('btn-restart');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayMsg = document.getElementById('overlay-message');
    this.overlayRestart = document.getElementById('overlay-restart');
    this.winImg = document.getElementById('win-img');

    this.btnStart.addEventListener('click', () => this.start());
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.btnRestart.addEventListener('click', () => this.restart());
    this.overlayRestart.addEventListener('click', () => this.restart());

    const bindHold = (el, on, off) => {
      el.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false });
      el.addEventListener('touchend', e => { e.preventDefault(); off(); }, { passive: false });
      el.addEventListener('touchcancel', off);
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    };
    bindHold(document.getElementById('btn-left'), () => this.input.setLeft(true), () => this.input.setLeft(false));
    bindHold(document.getElementById('btn-right'), () => this.input.setRight(true), () => this.input.setRight(false));
    bindHold(document.getElementById('btn-jump'), () => this.input.setJump(true), () => this.input.setJump(false));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) this.pause();
    });
  }

  loadBest() {
    try {
      const v = localStorage.getItem('mewoBestTime');
      return v ? parseFloat(v) : null;
    } catch { return null; }
  }

  saveBest() {
    try {
      if (this.best != null) localStorage.setItem('mewoBestTime', String(this.best));
    } catch {}
  }

  start() {
    if (this.state === STATE.PLAYING) return;
    if (this.state === STATE.READY || this.state === STATE.WON || this.state === STATE.LOST) {
      this._resetLevel();
    }
    this.state = STATE.PLAYING;
    this.btnStart.disabled = true;
    this.btnPause.disabled = false;
    this.btnPause.textContent = 'ПАУЗА';
    this.overlay.classList.add('hidden');
    this.winImg.classList.add('hidden');
    this.input.clearAll();
    this.lastTime = 0;
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(t => this.loop(t));
    }
    this._updateHUD();
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.btnPause.textContent = 'ПРОДОЛЖИТЬ';
    this.btnStart.disabled = false;
    this.input.clearAll();
    this._updateHUD();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this.pause();
    else if (this.state === STATE.PAUSED) this.start();
  }

  restart() {
    this._resetLevel();
    this.state = STATE.READY;
    this.btnStart.disabled = false;
    this.btnPause.disabled = true;
    this.btnPause.textContent = 'ПАУЗА';
    this.overlay.classList.add('hidden');
    this.winImg.classList.add('hidden');
    this.input.clearAll();
    this.camX = 0;
    this._updateHUD();
    this.render();
  }

  _resetLevel() {
    this.player.reset();
    this.flowersCollected = 0;
    this.time = 0;
    this.camX = 0;
    for (const f of this.flowers) f.collected = false;
  }

  _updateHUD() {
    document.getElementById('flowers').textContent = 'ЦВЕТЫ: ' + this.flowersCollected + '/5';
    document.getElementById('timer').textContent = 'ВРЕМЯ: ' + this.time.toFixed(1);
    document.getElementById('best').textContent =
      this.best != null ? 'РЕКОРД: ' + this.best.toFixed(1) + 'с' : 'РЕКОРД: --';
    const map = {
      [STATE.READY]: 'ГОТОВ',
      [STATE.PLAYING]: 'ИГРА',
      [STATE.PAUSED]: 'ПАУЗА',
      [STATE.WON]: 'ПОБЕДА!',
      [STATE.LOST]: 'ПОРАЖЕНИЕ'
    };
    document.getElementById('status').textContent = map[this.state] || '';
  }

  loop(ts) {
    if (!this.running) return;
    if (this.state === STATE.PLAYING) {
      if (this.lastTime === 0) this.lastTime = ts;
      let dt = (ts - this.lastTime) / 1000;
      this.lastTime = ts;
      if (dt > 0.05) dt = 0.05;
      this.update(dt);
    } else {
      this.lastTime = ts;
    }
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.time += dt;
    const prevX = this.player.x;
    const prevY = this.player.y;

    this.player.update(dt, this.input);

    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x + this.player.w > this.worldW) {
      this.player.x = this.worldW - this.player.w;
    }

    this.player.grounded = resolvePlatforms(this.player, this.platforms, prevX, prevY);

    // camera follow
    const target = this.player.x - this.W * 0.35;
    this.camX += (target - this.camX) * Math.min(1, dt * 6);
    if (this.camX < 0) this.camX = 0;
    if (this.camX > this.worldW - this.W) this.camX = Math.max(0, this.worldW - this.W);

    if (this.player.y > this.H + 40) {
      this._lose('MEWO УПАЛ...');
      return;
    }

    for (const s of this.spikes) {
      if (aabb(this.player, s)) {
        this._lose('ОЙ, ШИПЫ!');
        return;
      }
    }

    for (const f of this.flowers) {
      if (!f.collected && aabb(this.player, f)) {
        f.collected = true;
        this.flowersCollected++;
        this._updateHUD();
      }
    }

    if (this.flowersCollected >= 5 && aabb(this.player, this.finish)) {
      this._win();
    }

    this._updateHUD();
  }

  _win() {
    this.state = STATE.WON;
    if (this.best == null || this.time < this.best) {
      this.best = this.time;
      this.saveBest();
    }
    this.btnStart.disabled = false;
    this.btnPause.disabled = true;
    this.overlayTitle.textContent = 'ПОБЕДА!';
    this.overlayMsg.textContent =
      'MEWO СОБРАЛ ВЕНОК!\nВРЕМЯ: ' + this.time.toFixed(1) + 'с\nРЕКОРД: ' + this.best.toFixed(1) + 'с';
    this.winImg.classList.remove('hidden');
    this.overlay.classList.remove('hidden');
    this._updateHUD();
  }

  _lose(reason) {
    this.state = STATE.LOST;
    this.btnStart.disabled = false;
    this.btnPause.disabled = true;
    this.overlayTitle.textContent = 'ПОРАЖЕНИЕ';
    this.overlayMsg.textContent = reason + '\nПОПРОБУЙ ЕЩЁ!';
    this.winImg.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this._updateHUD();
  }

  render() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const cam = this.camX;

    // Background (parallax-ish)
    const bg = this.images.bg;
    const bgScale = H / bg.height;
    const bgW = bg.width * bgScale;
    const bgX = -((cam * 0.35) % bgW);
    ctx.drawImage(bg, bgX, 0, bgW, H);
    if (bgX + bgW < W) {
      ctx.drawImage(bg, bgX + bgW, 0, bgW, H);
    }

    // Twinkling stars
    for (const st of this.stars) {
      const sx = st.x - cam * 0.55;
      if (sx < -10 || sx > W + 10) continue;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * st.speed + st.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx), Math.round(st.y), st.s, st.s);
    }
    ctx.globalAlpha = 1;

    // Platforms
    for (const p of this.platforms) {
      const dx = p.x - cam;
      if (dx + p.w < -20 || dx > W + 20) continue;
      if (p.floor) {
        this._drawTiled(ctx, this.images.floor, dx, p.y, p.w, p.h);
      } else {
        this._drawTiled(ctx, this.images.platform, dx, p.y, p.w, p.h);
      }
    }

    // Spikes
    for (const s of this.spikes) {
      const dx = s.x - cam;
      if (dx + s.w < -10 || dx > W + 10) continue;
      this._drawTiled(ctx, this.images.spikes, dx, s.y, s.w, s.h);
    }

    // Flowers
    for (const f of this.flowers) {
      if (f.collected) continue;
      const dx = f.x - cam;
      if (dx + f.w < -10 || dx > W + 10) continue;
      const bob = Math.sin(this.time * 3 + f.x * 0.05) * 3;
      ctx.drawImage(this.images.flower, Math.round(dx), Math.round(f.y + bob), f.w, f.h);
    }

    // Finish house
    {
      const dx = this.finish.x - cam;
      if (dx + this.finish.w > -20 && dx < W + 20) {
        ctx.drawImage(this.images.house, Math.round(dx), Math.round(this.finish.y), this.finish.w, this.finish.h);
      }
    }

    // Player
    this.player.draw(ctx, cam);

    // Overlay states on canvas
    if (this.state === STATE.PAUSED) {
      ctx.fillStyle = 'rgba(26, 10, 46, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8a0ff';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ПАУЗА', W / 2, H / 2);
    }

    if (this.state === STATE.READY) {
      ctx.fillStyle = 'rgba(26, 10, 46, 0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8a0ff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('НАЖМИ «СТАРТ»', W / 2, H / 2 - 16);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#c4f0c4';
      ctx.fillText('СОБЕРИ 5 ЦВЕТОВ И ДОЙДИ ДО ДОМА', W / 2, H / 2 + 16);
    }
  }

  _drawTiled(ctx, img, x, y, w, h) {
    const iw = img.width;
    const ih = img.height;
    let left = w;
    let cx = x;
    while (left > 0) {
      const tw = Math.min(iw, left);
      ctx.drawImage(img, 0, 0, tw, ih, Math.round(cx), Math.round(y), tw, h);
      cx += tw;
      left -= tw;
    }
  }
}

// ---------- Boot ----------
