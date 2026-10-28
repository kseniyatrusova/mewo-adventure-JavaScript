import { Game } from './Game.js';

const ASSETS = {
  bg: 'assets/background.png',
  catIdle: 'assets/cat_idle.png',
  catBlink: 'assets/cat_blink.png',
  catJump: 'assets/cat_jump.png',
  flower: 'assets/flower.png',
  platform: 'assets/platform.png',
  floor: 'assets/floor.png',
  spikes: 'assets/spikes.png',
  house: 'assets/house.png',
  win: 'assets/win.png'
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load ' + src));
    img.src = src;
  });
}

async function main() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d2a5c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8a0ff';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ЗАГРУЗКА...', canvas.width / 2, canvas.height / 2);

  try {
    const images = {};
    await Promise.all(
      Object.entries(ASSETS).map(async ([key, src]) => {
        images[key] = await loadImage(src);
      })
    );
    window.game = new Game(canvas, images);
  } catch (err) {
    console.error(err);
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6b8a';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('ОШИБКА ЗАГРУЗКИ', canvas.width / 2, canvas.height / 2);
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#c4f0c4';
    ctx.fillText('Открой через локальный сервер', canvas.width / 2, canvas.height / 2 + 28);
  }
}

main();
