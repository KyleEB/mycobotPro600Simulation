function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(mazePoints, start, goal) {
  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map(mazePoints.map((point) => [point, Infinity]));
  const fScore = new Map(mazePoints.map((point) => [point, Infinity]));

  gScore.set(start, 0);
  fScore.set(start, heuristic(start, goal));

  while (openSet.length > 0) {
    openSet.sort((a, b) => fScore.get(a) - fScore.get(b));
    const current = openSet.shift();

    if (current === goal) {
      const path = [];
      let temp = current;
      while (temp) {
        path.push(temp);
        temp = cameFrom.get(temp);
      }
      return path.reverse();
    }

    const neighbors = mazePoints.filter(
      (point) =>
        (Math.abs(point.x - current.x) === 1 && point.y === current.y) ||
        (Math.abs(point.y - current.y) === 1 && point.x === current.x)
    );

    for (const neighbor of neighbors) {
      const tentativeGScore = gScore.get(current) + 1;
      if (tentativeGScore < gScore.get(neighbor)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeGScore);
        fScore.set(neighbor, tentativeGScore + heuristic(neighbor, goal));
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return [];
}
