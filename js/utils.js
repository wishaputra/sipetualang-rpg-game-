export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function circleRectCollision(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

export function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = a.radius + b.radius;
  return dx * dx + dy * dy < distance * distance;
}
