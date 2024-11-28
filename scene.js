// Create the scene
import * as THREE from "three";
import { loadArmParts } from "./armStlLoader.js";
import { solveIK } from "./ccdIK.js";
import { generateMaze } from "./maze.js";
import { findPath } from "./pathFinder.js";

const scene = new THREE.Scene();

// Import and setup base.stl, link1.stl, link2.stl, link3.stl, link4.stl, link5.stl, link6.stl
// Call the function to load the arm parts
const armParts = await loadArmParts(scene);

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

// Move to the next point every second
setInterval(moveArmAlongPath, 500);
