-- Link the two reviewed labels to existing buildings of TOZON PLAZA — 2.
-- Idempotent: preserves any later manual reassignment.
UPDATE map_hotspots h SET target_building_id = b.id
FROM buildings b
WHERE h.visual_map_id = 3 AND h.label IN ('Блок В', 'Блок Г')
  AND h.target_building_id IS NULL AND b.project_id = 4 AND b.name = h.label;
