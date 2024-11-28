import * as THREE from "three";

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

export function solveIK(
  armParts,
  target,
  maxIterations = 100,
  threshold = 0.01
) {
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
