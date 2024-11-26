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

function addAxesHelper(mesh, size = 50) {
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
    addAxesHelper(base); // Add helper
    scene.add(base);

    armParts.push(base);

    // Load link1
    const link1 = await loadSTL("./urdf/link1.stl", material);
    link1.position.set(0, 0.2, 0);
    link1.rotation.set(0, 1.5708, 0); // y is free
    addAxesHelper(link1); // Add helper
    base.add(link1);

    armParts.push(link1);

    // Load link2
    const link2 = await loadSTL("./urdf/link2.stl", material);
    link2.position.set(0, 0, 0.1);
    link2.rotation.set(1.5708, -1.5708, 0); // y is free
    addAxesHelper(link2); // Add helper
    link1.add(link2);

    armParts.push(link2);

    // Load link3
    const link3 = await loadSTL("./urdf/link3.stl", material);
    link3.position.set(-0.25, 0, 0);
    link3.rotation.set(0, 0, 0); // y is free
    addAxesHelper(link3); // Add helper
    link2.add(link3);

    armParts.push(link3);

    // Load link4
    const link4 = await loadSTL("./urdf/link4.stl", material);
    link4.position.set(-0.25, 0.03, 0);
    link4.rotation.set(0, -1.5708, 0); // y is free
    addAxesHelper(link4); // Add helper
    link3.add(link4);

    armParts.push(link4);

    // Load link5
    const link5 = await loadSTL("./urdf/link5.stl", material);
    link5.position.set(0, 0, 0.115);
    link5.rotation.set(1.5708, 0, 0); // y is free
    addAxesHelper(link5); // Add helper
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

function setYAxisRotation(joint, angle) {
  joint.rotation.y = angle;
}

function computeAngleToTarget(joint, endEffector, target) {
  // Get positions
  const jointPosition = getWorldPosition(joint);
  const endEffectorPosition = getWorldPosition(endEffector);

  // Vector to end-effector and target
  const toEndEffector = endEffectorPosition
    .clone()
    .sub(jointPosition)
    .normalize();
  const toTarget = target.clone().sub(jointPosition).normalize();

  // Angle between vectors in the xz-plane
  const angle =
    Math.atan2(toTarget.x, toTarget.z) -
    Math.atan2(toEndEffector.x, toEndEffector.z);

  // Clamp to -PI to PI
  return (
    THREE.MathUtils.euclideanModulo(angle + Math.PI, 2 * Math.PI) - Math.PI
  );
}

function solveIK(armParts, target, maxIterations = 10, threshold = 0.01) {
  const endEffector = armParts[armParts.length - 1];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Start from the end effector and work backward
    for (let i = armParts.length - 2; i >= 0; i--) {
      const joint = armParts[i];

      // Compute the angle to the target for this joint
      const angle = computeAngleToTarget(joint, endEffector, target);

      // Apply the rotation to the joint (y-axis only)
      joint.rotation.y += angle;

      // Clamp rotations if needed (e.g., for physical limits)
      // joint.rotation.y = THREE.MathUtils.clamp(joint.rotation.y, minAngle, maxAngle);

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

const target = new THREE.Vector3(0.3, 0.5, 0.2); // Example target position
const targetHelper = new THREE.Mesh(
  new THREE.SphereGeometry(0.02),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
targetHelper.position.copy(target);
scene.add(targetHelper);

solveIK(armParts, target);

// Add light to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Add an xyz helper to the scene
const xyzHelper = new THREE.AxesHelper(100);
scene.add(xyzHelper);

function animate() {
  renderer.render(scene, camera);
}
