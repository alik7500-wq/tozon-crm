# Block A image preparation

13 technical PNGs are source PDF vector excerpts rendered without re-drawing walls. Approved official areas are 58.98 m² for A-1 and 81.18 m² for A-6.

13 furnished PNGs were generated with the built-in image_gen tool, one source excerpt per apartment type, then visually compared against the source. These are furniture illustrations, not construction drawings. The manifest records selected source files and hashes.

## Prompt set
Common prompt: Convert the attached architectural source to one near-vertical orthographic overhead furnished 3D cutaway. Preserve the same outline, room arrangement, relative sizes, openings and glazing. Low white walls, warm light oak floors, neutral cream/olive furniture, pale stone bathrooms, white background. Ignore dimensions, text and hatching. Do not invent bedrooms, balconies, windows or exterior doors. No text in the resulting image.

Apartment-specific prompt: Use the rooms and source geometry identified by each layout_id and reference image in block_a_image_manifest.json. Total areas: typical 58.98, 79.26, 95.65, 56.18, 55.71, 81.18, 56.74; penthouse 56.45, 77.50, 95.20, 54.95, 111.80, 78.55. Preserve open terraces where drawn.

Targeted correction prompts applied to selected results:
- A-1: remove invented upper living window and bottom kitchen exterior door.
- A-3: combine child bedroom nook and main L-shaped bedroom space; furnish middle room as living room; seal invented bedroom-to-bedroom door with continuous partition.
- Penthouse 95.20: remove invented bottom kitchen and right hallway glazing.
- Penthouse 111.80: remove invented top-facing glazing, keep terrace open with low railing.

## Owner confirmation
On 19 October 2026, the owner confirmed that unit 219 / apartment 60 / layout 29 is a two-room apartment plus a separate kitchen. Publication will align the unit, layout and descriptions to 2 rooms. Area 95.20 m² and pricing remain unchanged.
