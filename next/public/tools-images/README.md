# Tools Images Directory

This directory contains the tool logos/images used throughout the application.

## How to Add Images Manually

1. **Get the tool name** from `next/src/data/carouselTools.ts`
2. **Normalize the filename**:
   - Convert to lowercase
   - Remove spaces, dots, and special characters
   - Example: `ElevenLabs` → `elevenlabs.png`
   - Example: `Dropship.io` → `dropshipio.png`
   - Example: `Brain.fm` → `brainfm.png`
   - Example: `Exploding Topics` → `explodingtopics.png`

3. **Save the image** as a PNG file with the normalized name in this directory:
   ```
   next/public/tools-images/{normalized-name}.png
   ```

4. **Image Requirements**:
   - Format: PNG (recommended) or other web formats (JPG, SVG)
   - Recommended size: 512x512px or larger (will be scaled down)
   - Background: Transparent or black (for best display on dark backgrounds)
   - Aspect ratio: Square (1:1) works best

## Fallback Chain

If an image is not found in `/tools-images/`, the system will automatically try:
1. `/tools-images/{name}.png` (primary)
2. `/tools-logos/{name}.png` (fallback)
3. Clearbit logo API (if domain mapping exists)
4. `/placeholder.svg` (final fallback)

## Example: Adding ElevenLabs Logo

1. Tool name: `ElevenLabs`
2. Normalized filename: `elevenlabs.png`
3. Save as: `next/public/tools-images/elevenlabs.png`
4. The image will automatically be used throughout the app!

## Current Tools That Need Images

Based on `carouselTools.ts`, these tools should have images in this directory:
- ubersuggest.png
- flair.png
- atria.png
- helium10.png
- midjourney.png
- elevenlabs.png
- chatgpt.png
- semrush.png
- canva.png
- shophunter.png
- winninghunter.png
- runway.png
- pipiads.png
- sendshort.png
- kalodata.png
- fotor.png
- foreplay.png
- higgsfield.png
- vmake.png
- dropship.png
- heygen.png
- veo3.png
- brain.png (Brain.fm)
- capcut.png
- exploding.png
- gemini.png
