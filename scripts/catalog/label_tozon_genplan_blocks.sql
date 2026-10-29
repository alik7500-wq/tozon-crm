-- User-confirmed block labels: lower-right site A (left), Б (right);
-- upper-left site В (left), Г (right). Original map image is preserved.
DO $labels$
BEGIN
  PERFORM pg_advisory_xact_lock(31020261030);
  IF NOT EXISTS (SELECT 1 FROM public.visual_maps WHERE id=3 AND project_id=3
    AND image_path='https://res.cloudinary.com/r3pnvm9s/image/upload/v1787392389/tozon-crm/euh4vu4ocbgschzszw3p.png') THEN
    RAISE EXCEPTION 'Expected reviewed TOZON PLAZA map';
  END IF;
  IF EXISTS (SELECT 1 FROM public.map_hotspots WHERE visual_map_id=3) THEN
    RAISE EXCEPTION 'Map already has annotations; review before applying labels';
  END IF;
  INSERT INTO public.map_hotspots
    (visual_map_id,target_building_id,label,x_pct,y_pct,width_pct,height_pct,sort_order,created_at,updated_at)
  VALUES
    (3,4,'Блок А',69.5,47,10,4.5,0,now()::text,now()::text),
    (3,3,'Блок Б',78,53,10,4.5,1,now()::text,now()::text),
    (3,NULL,'Блок В',10.5,14.5,10,4.5,2,now()::text,now()::text),
    (3,NULL,'Блок Г',19,9.5,10,4.5,3,now()::text,now()::text);
END;
$labels$;
