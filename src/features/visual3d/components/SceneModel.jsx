import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getStatusTheme, SELECTION_COLOR, DIMMED_COLOR } from '../utils/statusTheme';

export function SceneModel({
  modelUrl,
  entitiesMap,
  isMeshFilteredOut,
  onHoverMesh,
  onSelectMesh,
  hoveredMeshKey,
  selectedMeshKey
}) {
  const { scene } = useGLTF(modelUrl);
  const meshRefs = useRef(new Map());

  // Prepare meshes on load
  useEffect(() => {
    if (!scene) return;

    meshRefs.current.clear();
    scene.traverse((child) => {
      if (child.isMesh) {
        meshRefs.current.set(child.name, child);
        if (child.material) {
          // Clone material for individual emissive & opacity control
          child.material = child.material.clone();
        }
      }
    });

    return () => {
      meshRefs.current.clear();
    };
  }, [scene]);

  // Update mesh visual styling whenever status, filters, hover or selection changes
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const meshKey = child.name;
        const entity = entitiesMap.get(meshKey);
        const isMapped = !!entity;
        const unit = entity?.entity_type === 'UNIT' ? entity.unit : null;
        const isFiltered = isMeshFilteredOut ? isMeshFilteredOut(meshKey) : false;
        const isHovered = meshKey === hoveredMeshKey;
        const isSelected = meshKey === selectedMeshKey;

        const statusTheme = getStatusTheme(unit?.status);

        if (isFiltered) {
          // Dimmed out state
          child.material.transparent = true;
          child.material.opacity = 0.2;
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0.0;
        } else {
          // Active state
          child.material.transparent = false;
          child.material.opacity = 1.0;

          if (isSelected) {
            // Selected state
            child.material.emissive = SELECTION_COLOR;
            child.material.emissiveIntensity = 0.85;
          } else if (isHovered && isMapped) {
            // Hovered state
            child.material.emissive = new THREE.Color(statusTheme.hoverEmissive);
            child.material.emissiveIntensity = 0.7;
          } else if (isMapped && unit) {
            // Resting state with subtle CRM status tint
            child.material.emissive = new THREE.Color(statusTheme.colorHex);
            child.material.emissiveIntensity = 0.18;
          } else {
            // Unmapped background mesh
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0.0;
          }
        }
      }
    });
  }, [scene, hoveredMeshKey, selectedMeshKey, entitiesMap, isMeshFilteredOut]);

  // Handle pointer events
  const handlePointerOver = (e) => {
    e.stopPropagation();
    const mesh = e.object;
    if (!mesh || !mesh.name) return;

    const isMapped = entitiesMap.has(mesh.name);
    const isFiltered = isMeshFilteredOut ? isMeshFilteredOut(mesh.name) : false;

    if (isMapped && !isFiltered) {
      document.body.style.cursor = 'pointer';
    }

    onHoverMesh(mesh.name, {
      x: e.clientX,
      y: e.clientY
    }, isMapped && !isFiltered);
  };

  const handlePointerMove = (e) => {
    e.stopPropagation();
    const mesh = e.object;
    if (!mesh || !mesh.name) return;

    const isMapped = entitiesMap.has(mesh.name);
    const isFiltered = isMeshFilteredOut ? isMeshFilteredOut(mesh.name) : false;

    onHoverMesh(mesh.name, {
      x: e.clientX,
      y: e.clientY
    }, isMapped && !isFiltered);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    onHoverMesh(null, null, false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const mesh = e.object;
    if (!mesh || !mesh.name) return;

    const isMapped = entitiesMap.has(mesh.name);
    const isFiltered = isMeshFilteredOut ? isMeshFilteredOut(mesh.name) : false;

    if (isMapped && !isFiltered) {
      onSelectMesh(mesh.name);
    }
  };

  return (
    <primitive
      object={scene}
      onPointerOver={handlePointerOver}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}
