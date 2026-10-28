export class Player {
  constructor(x, y, imgs) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 28;
    this.vx = 0;
    this.vy = 0;
    this.speed = 210;
    this.jumpForce = -560;
    this.gravity = 1150;
    this.grounded = false;
    this.facing = 1;
    this.imgs = imgs;
    this.idleTime = 0;
    this.zParticles = [];
    this.blinkTimer = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.facing = 1;
    this.idleTime = 0;
    this.zParticles = [];
    this.blinkTimer = 0;
  }

  update(dt, input) {
    const moving =
      input.keys.left || input.keys.right || input.keys.jump || input.keys.jumpPressed;

    this.vx = 0;
    if (input.keys.left) {
      this.vx = -this.speed;
      this.facing = -1;
    }
    if (input.keys.right) {
      this.vx = this.speed;
      this.facing = 1;
    }

    if (input.keys.jumpPressed && this.grounded) {
      this.vy = this.jumpForce;
      this.grounded = false;
    }
    input.clearJumpPressed();

    this.vy += this.gravity * dt;
    if (this.vy > 800) this.vy = 800;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (moving || !this.grounded || Math.abs(this.vx) > 1) {
      this.idleTime = 0;
      this.zParticles = [];
    } else {
      this.idleTime += dt;
    }

    if (this.idleTime >= 5) {
      this.blinkTimer += dt;
      if (Math.random() < dt * 2.2) {
        this.zParticles.push({
          x: this.x + this.w * 0.55,
          y: this.y - 4,
          life: 1.4 + Math.random() * 0.6,
          maxLife: 1.4,
          vy: -18 - Math.random() * 12,
          vx: (Math.random() - 0.5) * 20
        });
      }
    }

    for (let i = this.zParticles.length - 1; i >= 0; i--) {
      const z = this.zParticles[i];
      z.life -= dt;
      z.y += z.vy * dt;
      z.x += z.vx * dt;
      if (z.life <= 0) this.zParticles.splice(i, 1);
    }
  }

  draw(ctx, camX) {
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y);

    let img = this.imgs.idle;
    if (!this.grounded) {
      img = this.imgs.jump;
    } else if (this.idleTime >= 5) {
      img = this.imgs.blink;
    }

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(px + this.w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, this.w, this.h);
    } else {
      ctx.drawImage(img, px, py, this.w, this.h);
    }
    ctx.restore();

    if (this.zParticles.length) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      for (const z of this.zParticles) {
        const alpha = Math.max(0, z.life / z.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#111';
        ctx.fillText('Z', Math.round(z.x - camX), Math.round(z.y));
      }
      ctx.globalAlpha = 1;
    }
  }
}
