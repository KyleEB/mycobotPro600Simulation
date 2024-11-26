// Create the scene
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const scene = new THREE.Scene();

// Create a camera, which determines what we'll see when we render the scene
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

// Create a renderer and add it to the DOM
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Move the camera away from the origin, down the Z axis
camera.position.x = 1; // x red
camera.position.y = 1; // y green
camera.position.z = 1; // z blue
camera.lookAt(0, 0, 0);

// Import and setup base.stl, link1.stl, link2.stl, link3.stl, link4.stl, link5.stl, link6.stl
const loader = new STLLoader();

function loadSTL(path, material) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (geometry) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        resolve(mesh);
      },
      undefined, // Progress callback (optional)
      (error) => reject(error)
    );
  });
}

function addAxesHelper(mesh, size = 0.2) {
  const axesHelper = new THREE.AxesHelper(size);
  mesh.add(axesHelper);
}

const material = new THREE.MeshPhongMaterial({ color: 0x555555 });

async function loadArmParts() {
  let armParts = [];
  try {
    // Load base
    const base = await loadSTL("./urdf/base.stl", material);
    base.position.set(0, 0, 0); // No rotations are free
    //addAxesHelper(base); // Add helper
    scene.add(base);

    armParts.push(base);

    // Load link1
    const link1 = await loadSTL("./urdf/link1.stl", material);
    link1.position.set(0, 0.2, 0);
    link1.rotation.set(0, 1.5708, 0); // y is free
    //addAxesHelper(link1); // Add helper
    base.add(link1);

    armParts.push(link1);

    // Load link2
    const link2 = await loadSTL("./urdf/link2.stl", material);
    link2.position.set(0, 0, 0.1);
    link2.rotation.set(1.5708, -1.5708, 0); // y is free
    //addAxesHelper(link2); // Add helper
    link1.add(link2);

    armParts.push(link2);

    // Load link3
    const link3 = await loadSTL("./urdf/link3.stl", material);
    link3.position.set(-0.25, 0, 0);
    link3.rotation.set(0, 0, 0); // y is free
    //addAxesHelper(link3); // Add helper
    link2.add(link3);

    armParts.push(link3);

    // Load link4
    const link4 = await loadSTL("./urdf/link4.stl", material);
    link4.position.set(-0.25, 0.03, 0);
    link4.rotation.set(0, -1.5708, 0); // y is free
    //addAxesHelper(link4); // Add helper
    link3.add(link4);

    armParts.push(link4);

    // Load link5
    const link5 = await loadSTL("./urdf/link5.stl", material);
    link5.position.set(0, 0, 0.115);
    link5.rotation.set(1.5708, 0, 0); // y is free
    //addAxesHelper(link5); // Add helper
    link4.add(link5);

    armParts.push(link5);

    // Load link6
    const link6 = await loadSTL("./urdf/link6.stl", material);
    link6.position.set(0, 0, -0.085);
    link6.rotation.set(1.5708, 0, 0); // y is free
    addAxesHelper(link6); // Add helper
    link5.add(link6);

    armParts.push(link6);

    console.log("Arm parts loaded successfully with helpers!");
  } catch (error) {
    console.error("Error loading STL files:", error);
  }

  return armParts;
}

// Call the function to load the arm parts
const armParts = await loadArmParts();

function getWorldPosition(object) {
  const position = new THREE.Vector3();
  object.getWorldPosition(position);
  return position;
}

function clampRotation(jointIndex, rotation) {
  const jointLimits = [
    { min: THREE.MathUtils.degToRad(-180), max: THREE.MathUtils.degToRad(180) }, // Joint 1
    { min: THREE.MathUtils.degToRad(-270), max: THREE.MathUtils.degToRad(-90) }, // Joint 2
    { min: THREE.MathUtils.degToRad(-150), max: THREE.MathUtils.degToRad(150) }, // Joint 3
    { min: THREE.MathUtils.degToRad(-260), max: THREE.MathUtils.degToRad(-80) }, // Joint 4
    { min: THREE.MathUtils.degToRad(-168), max: THREE.MathUtils.degToRad(168) }, // Joint 5
    { min: THREE.MathUtils.degToRad(-174), max: THREE.MathUtils.degToRad(174) }, // Joint 6
  ];

  const limits = jointLimits[jointIndex];
  return THREE.MathUtils.clamp(rotation, limits.min, limits.max);
}

function computeAngleToTarget(joint, endEffector, target) {
  // Get world positions of joint, end effector, and target
  const jointPosition = getWorldPosition(joint);
  const endEffectorPosition = getWorldPosition(endEffector);
  const targetPosition = target.clone();

  // Vector from joint to end effector and joint to target in world space
  const toEndEffector = endEffectorPosition.clone().sub(jointPosition);
  const toTarget = targetPosition.clone().sub(jointPosition);

  // Normalize the vectors (this gives direction without scaling)
  toEndEffector.normalize();
  toTarget.normalize();

  // Transform the target and end effector vectors into the joint's local space
  // The inverse of the joint's world matrix transforms world coordinates to local coordinates
  const jointWorldMatrix = joint.matrixWorld;
  const localToEndEffector = toEndEffector
    .clone()
    .applyMatrix4(jointWorldMatrix.clone().invert());
  const localToTarget = toTarget
    .clone()
    .applyMatrix4(jointWorldMatrix.clone().invert());

  // Project both vectors onto the XZ plane by setting their Y component to 0
  localToEndEffector.y = 0;
  localToTarget.y = 0;

  // Normalize the projected vectors
  localToEndEffector.normalize();
  localToTarget.normalize();

  // Compute the angle between the two vectors in the XZ plane (in radians)
  const angleBetween =
    Math.atan2(localToTarget.x, localToTarget.z) -
    Math.atan2(localToEndEffector.x, localToEndEffector.z);

  // Clamp the result to the range of -PI to PI
  const angle =
    THREE.MathUtils.euclideanModulo(angleBetween + Math.PI, 2 * Math.PI) -
    Math.PI;

  // This angle is the adjustment needed for the joint's local y-axis
  return angle;
}

function solveIK(armParts, target, maxIterations = 100, threshold = 0.01) {
  const endEffector = armParts[armParts.length - 1];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Start from the end effector and work backward (exclude the root/base)
    for (let i = armParts.length - 2; i >= 1; i--) {
      const joint = armParts[i];

      // Compute the angle to the target for this joint
      const angle = computeAngleToTarget(joint, endEffector, target);

      // Apply the rotation to the joint, clamped to its limits
      const newRotation = joint.rotation.y + angle;

      if (i != armParts.length - 2) {
        joint.rotation.y = newRotation; //clampRotation(i - 1, newRotation); // i - 1 because joint limits start at Joint 1
      }

      // Update end effector position
      const currentEndEffectorPosition = getWorldPosition(endEffector);

      // Break early if within the threshold
      if (currentEndEffectorPosition.distanceTo(target) < threshold) {
        return true; // Success
      }
    }
  }
  return false; // Did not converge
}

let target = new THREE.Vector3(0.0, 0.0, 0.0); // Initial target position
const targetHelper = new THREE.Mesh(
  new THREE.SphereGeometry(0.02),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
targetHelper.position.copy(target);
scene.add(targetHelper);

// Add light to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Add an xyz helper to the scene
const xyzHelper = new THREE.AxesHelper(100);
scene.add(xyzHelper);

function animate() {
  // Move the target along a straight line

  requestAnimationFrame(animate);

  if (target != null) {
    targetHelper.position.copy(target);
    solveIK(armParts, target);
  }

  renderer.render(scene, camera);
}

function generateMaze(width, height) {
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

const mazePoints = generateMaze(10, 10);
console.log(mazePoints);

const mazeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const exitMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const cubeSize = 0.05;

mazePoints.forEach((point) => {
  const material = point.isExit ? exitMaterial : mazeMaterial;

  const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cube = new THREE.Mesh(cubeGeometry, material);
  cube.position.set(point.x * cubeSize, cubeSize / 2, point.y * cubeSize);
  scene.add(cube);
});

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(mazePoints, start, goal) {
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

const start = mazePoints[0];
const goal = mazePoints.find((point) => point.isExit);
const path = findPath(mazePoints, start, goal);

const pathMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
path.forEach((point) => {
  const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cube = new THREE.Mesh(cubeGeometry, pathMaterial);
  cube.position.set(point.x * cubeSize, cubeSize / 2, point.y * cubeSize);
  scene.add(cube);
});

let pathIndex = 0;

function moveArmAlongPath() {
  if (pathIndex < path.length) {
    target = new THREE.Vector3(
      path[pathIndex].x * cubeSize,
      cubeSize / 2,
      path[pathIndex].y * cubeSize
    );
    pathIndex++;
  } else {
    pathIndex = 0; // Reset to start the path again
  }
}

setInterval(moveArmAlongPath, 500); // Move to the next point every second

animate();
