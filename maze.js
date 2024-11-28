export function generateMaze(width, height) {
  const maze = Array.from({ length: height }, () => Array(width).fill(0));
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 }, // Right
    { x: 0, y: 1 }, // Down
    { x: -1, y: 0 }, // Left
  ];

  function isInBounds(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function carvePassagesFrom(x, y) {
    maze[y][x] = 1;
    shuffle(directions);

    for (const { x: dx, y: dy } of directions) {
      const nx = x + dx * 2;
      const ny = y + dy * 2;

      if (isInBounds(nx, ny) && maze[ny][nx] === 0) {
        maze[y + dy][x + dx] = 1;
        carvePassagesFrom(nx, ny);
      }
    }
  }

  carvePassagesFrom(0, 0);

  const points = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x] === 1) {
        points.push({ x, y, isExit: false });
      }
    }
  }

  points[points.length - 1].isExit = true;

  return points;
}
