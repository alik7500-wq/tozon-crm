import React, { useEffect, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PanoramaHotspot } from './PanoramaHotspot';

export function PanoramaSphere({
  panoramaUrl,
  hotspots = [],
  onHotspotClick
}) {
  const texture = useTexture(panoramaUrl);
  const sphereRef = useRef();

  // Configure texture mapping
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1; // Invert horizontal so panoramic projection is non-mirrored
      texture.needsUpdate = true;
    }

    return () => {
      // Memory cleanup: dispose previous panorama texture
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

  return (
    <group>
      {/* 360 Panorama Inward Sphere */}
      <mesh ref={sphereRef} scale={[-1, 1, 1]}>
        <sphereGeometry args={[50, 60, 40]} />
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Interactive Hotspots positioned on spherical coordinates */}
      {hotspots.map((hotspot) => (
        <PanoramaHotspot
          key={hotspot.id || `${hotspot.yaw}-${hotspot.pitch}`}
          hotspot={hotspot}
          onClick={onHotspotClick}
        />
      ))}
    </group>
  );
}
