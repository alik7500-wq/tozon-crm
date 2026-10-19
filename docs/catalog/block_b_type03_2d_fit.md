# Complete technical plan for Block B type 3

The 81.80 m² technical PNG was clipped at the right edge during its original export. The source landscape PDF contains the complete plan. The corrected export fits its entire left panel, including the kitchen, bathrooms, heading and location diagram, into a 1290 × 1680 image with a small white margin.

- Source: owner-provided `Автовокзал парковка(1).pdf`, page 36 (index 35).
- Source SHA-256: `72d42886a8f0ab748c433a9b1b0b3237de96dc2eb0b33fd6aac14d7a20e939f5`.
- Reproduce: `python3 scripts/catalog/fit_block_b_type03_plan.py SOURCE.pdf` (PyMuPDF).
- Both catalogue and legacy technical-plan paths receive identical bytes.
- The other 33 published Block B images match their previous checksums, including the furnished plan for this type.
- No apartment data, image paths or room marker positions change.
