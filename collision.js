/** AABB overlap test */
export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Resolve player vs solid platforms.
 * Uses previous position to pick collision side and avoid tunneling.
 * @returns {boolean} grounded
 */
export function resolvePlatforms(player, platforms, prevX, prevY) {
  let grounded = false;
  const px = player.x;
  const py = player.y;
  const pw = player.w;
  const ph = player.h;

  for (const p of platforms) {
    if (px + pw <= p.x || px >= p.x + p.w || py + ph <= p.y || py >= p.y + p.h) {
      continue;
    }

    const oL = px + pw - p.x;
    const oR = p.x + p.w - px;
    const oT = py + ph - p.y;
    const oB = p.y + p.h - py;
    const minX = Math.min(oL, oR);
    const minY = Math.min(oT, oB);

    const wasAbove = prevY + ph <= p.y + 2;
    const wasBelow = prevY >= p.y + p.h - 2;
    const wasLeft = prevX + pw <= p.x + 2;
    const wasRight = prevX >= p.x + p.w - 2;

    if (wasAbove && player.vy >= 0 && oT <= minX + 4) {
      player.y = p.y - ph;
      player.vy = 0;
      grounded = true;
    } else if (wasBelow && player.vy < 0 && oB <= minX + 4) {
      player.y = p.y + p.h;
      player.vy = 0;
    } else if (wasLeft && player.vx > 0) {
      player.x = p.x - pw;
      player.vx = 0;
    } else if (wasRight && player.vx < 0) {
      player.x = p.x + p.w;
      player.vx = 0;
    } else if (minY < minX) {
      if (oT < oB) {
        player.y = p.y - ph;
        player.vy = 0;
        grounded = true;
      } else {
        player.y = p.y + p.h;
        player.vy = 0;
      }
    } else if (oL < oR) {
      player.x = p.x - pw;
      player.vx = 0;
    } else {
      player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  return grounded;
}
