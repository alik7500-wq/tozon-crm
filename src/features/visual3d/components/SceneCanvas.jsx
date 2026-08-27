import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds, Center } from '@react-three/drei';
import { SceneModel } from './SceneModel';
import { SceneLoader } from './SceneLoader';

export function SceneCanvas({
  modelUrl,
  cameraConfig,
  environmentConfig,
  entitiesMap,
  isMeshFilteredOut,
  onHoverMesh,
  onSelectMesh,
  hoveredMeshKey,
  selectedMeshKey,
  controlsRef
}) {
  const defaultCamera = {
    position: cameraConfig?.position || [35, 25, 35],
    fov: cameraConfig?.fov || 45
  };

  return (
    <Canvas
      camera={defaultCamera}
      dpr={[1, 2]} // Performance optimization: max 2x DPR
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="w-full h-full"
    >
      {/* Lighting Setup */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[40, 60, 20]} intensity={1.2} />
      <directionalLight position={[-30, 40, -30]} intensity={0.4} />
      <hemisphereLight skyColor="#ffffff" groundColor="#0f172a" intensity={0.5} />

      {/* Orbit Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={250}
        maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below ground level
        target={cameraConfig?.target || [0, 0, 0]}
      />

      {/* Model with Suspense and Auto-Bounding Center */}
      <Suspense fallback={<SceneLoader message="Загрузка 3D фасада..." />}>
        <Bounds fit clip observe margin={1.15}>
          <Center>
            <SceneModel
              modelUrl={modelUrl}
              entitiesMap={entitiesMap}
              isMeshFilteredOut={isMeshFilteredOut}
              onHoverMesh={onHoverMesh}
              onSelectMesh={onSelectMesh}
              hoveredMeshKey={hoveredMeshKey}
              selectedMeshKey={selectedMeshKey}
            />
          </Center>
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
