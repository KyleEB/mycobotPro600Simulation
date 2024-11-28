import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function loadSTL(path, material, loader) {
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

export async function loadArmParts(scene) {
  const loader = new STLLoader();
  const material = new THREE.MeshPhongMaterial({ color: 0x555555 });

  let armParts = [];
  try {
    // Load base
    const base = await loadSTL("./urdf/base.stl", material, loader);
    base.position.set(0, 0, 0); // No rotations are free
    //addAxesHelper(base); // Add helper
    scene.add(base);

    armParts.push(base);

    // Load link1
    const link1 = await loadSTL("./urdf/link1.stl", material, loader);
    link1.position.set(0, 0.2, 0);
    link1.rotation.set(0, 1.5708, 0); // y is free
    //addAxesHelper(link1); // Add helper
    base.add(link1);

    armParts.push(link1);

    // Load link2
    const link2 = await loadSTL("./urdf/link2.stl", material, loader);
    link2.position.set(0, 0, 0.1);
    link2.rotation.set(1.5708, -1.5708, 0); // y is free
    //addAxesHelper(link2); // Add helper
    link1.add(link2);

    armParts.push(link2);

    // Load link3
    const link3 = await loadSTL("./urdf/link3.stl", material, loader);
    link3.position.set(-0.25, 0, 0);
    link3.rotation.set(0, 0, 0); // y is free
    //addAxesHelper(link3); // Add helper
    link2.add(link3);

    armParts.push(link3);

    // Load link4
    const link4 = await loadSTL("./urdf/link4.stl", material, loader);
    link4.position.set(-0.25, 0.03, 0);
    link4.rotation.set(0, -1.5708, 0); // y is free
    //addAxesHelper(link4); // Add helper
    link3.add(link4);

    armParts.push(link4);

    // Load link5
    const link5 = await loadSTL("./urdf/link5.stl", material, loader);
    link5.position.set(0, 0, 0.115);
    link5.rotation.set(1.5708, 0, 0); // y is free
    //addAxesHelper(link5); // Add helper
    link4.add(link5);

    armParts.push(link5);

    // Load link6
    const link6 = await loadSTL("./urdf/link6.stl", material, loader);
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
