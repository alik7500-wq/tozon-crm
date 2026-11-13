import React,{Suspense} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {PanoramaSphere} from '../tour360/components/PanoramaSphere';
import {TourCanvasErrorBoundary} from '../tour360/components/TourCanvasErrorBoundary';
export default function BuyerPanorama({url,panorama,onNavigate,language}){
 const yaw=(Number(panorama.yaw)||0)*Math.PI/180,pitch=Math.max(-85,Math.min(85,Number(panorama.pitch)||0))*Math.PI/180;
 const position=[-0.1*Math.cos(pitch)*Math.cos(yaw),-0.1*Math.sin(pitch),-0.1*Math.cos(pitch)*Math.sin(yaw)];
 const hotspots=(panorama.hotspots||[]).map(h=>({...h,hotspot_type:'NAVIGATION',target_panorama_id:h.targetId}));
 return <div className="relative h-80 w-full overflow-hidden rounded-xl bg-slate-900">
  <TourCanvasErrorBoundary panoramaUrl={url} errorTitle={language==='tj'?'Сайри 360° дастрас нест':undefined} errorMessage={language==='tj'?'Кабинетро нав кунед ё ба менеҷер муроҷиат кунед.':undefined} retryLabel={language==='tj'?'Такрор кардан':undefined}><Canvas key={url} camera={{position,fov:Math.max(40,Math.min(100,Number(panorama.fov)||75))}} dpr={[1,1.5]}>
   <OrbitControls enableZoom enablePan={false} rotateSpeed={-0.4} minDistance={0.05} maxDistance={0.5} minPolarAngle={0.05} maxPolarAngle={Math.PI-0.05}/>
   <Suspense fallback={null}><PanoramaSphere panoramaUrl={url} hotspots={hotspots} onHotspotClick={h=>onNavigate(h.target_panorama_id)}/></Suspense>
  </Canvas></TourCanvasErrorBoundary>
 </div>;
}
