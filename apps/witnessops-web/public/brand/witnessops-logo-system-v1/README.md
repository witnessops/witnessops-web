# WitnessOps Logo System v1

Status: CANONICAL PRODUCTION ASSET SET  
Selected mark: geometric **W** with central gate/hourglass  
Primary treatment: flat monochrome  
Canonical black: `#0B0D10`  
Reversed white: `#FFFFFF`

## What is frozen

The core mark geometry is fixed. It consists of two closed polygons in a
`0 0 746 427` SVG viewBox:

- `main_w`
- `central_gate`

The normalized coordinates are stored in:

`source/mark-construction.json`

Do not redraw the mark from memory or reconstruct it from a PNG. Use the supplied
SVG masters.

## Primary assets

- `svg/witnessops-primary-stacked-black.svg`
- `svg/witnessops-primary-stacked-white.svg`
- `svg/witnessops-horizontal-black.svg`
- `svg/witnessops-horizontal-white.svg`
- `svg/witnessops-mark-black.svg`
- `svg/witnessops-mark-white.svg`
- `svg/witnessops-app-icon-dark.svg`
- `svg/witnessops-app-icon-light.svg`

All wordmarks are converted to vector outlines. No font dependency remains in
the distributed SVG files.

## Lockup hierarchy

**Primary stacked**  
Use for brand pages, formal covers, launch material, presentation openers, and
large centered placements.

**Horizontal**  
Use in website headers, navigation, email headers, document headers, and
wide-format layouts.

**Icon-only**  
Use for favicons, app icons, social avatars, compact navigation, badges, and
places where the WitnessOps name is already visible nearby.

## Clearspace

Define `X` as **1/8 of the mark height**.

Keep at least `X` of empty space around the mark and at least `X` around the full
lockup. No text, border, icon, or image edge may enter this area.

See:

- `specification/witnessops-clearspace.svg`
- `specification/witnessops-clearspace.png`

## Minimum sizes

Digital:

- Icon-only mark: **24 px** minimum
- Stacked lockup: **160 px** minimum width
- Horizontal lockup: **180 px** minimum width

Print:

- Icon-only mark: **6.5 mm** minimum width
- Stacked lockup: **42 mm** minimum width
- Horizontal lockup: **48 mm** minimum width

Use the supplied favicon treatment below 24 px.

## Color use

Approved:

- `#0B0D10` on white or very light backgrounds
- `#FFFFFF` on `#0B0D10` or sufficiently dark backgrounds

Do not add gradients, metallic effects, glows, shadows, outlines, bevels, or
multiple colors to the master identity.

## Geometry rules

Never:

- stretch or compress the mark;
- change the central gate/hourglass;
- move one polygon independently;
- alter the relative angles;
- round the corners;
- place the mark inside an unapproved container;
- rebuild the wordmark with a substitute font;
- reduce contrast below accessible visibility.

## App icon and favicon

The app icon uses the mark centered in a rounded square with a generous optical
margin. The favicon uses the same geometry with a slightly larger relative
margin for small-size clarity; it does not alter the mark itself.

Ready-to-use assets are in `favicon/`.

## Web implementation

Preferred format:

```html
<img
  src="/brand/witnessops-horizontal-black.svg"
  alt="WitnessOps"
  width="300"
  height="84"
/>
```

For dark surfaces, use the white version. Do not recolor through CSS unless the
SVG is intentionally embedded inline and restricted to `#0B0D10` or `#FFFFFF`.

## Reconstruction and integrity

- Canonical geometry: `source/mark-construction.json`
- Visual construction: `specification/witnessops-construction-grid.svg`
- File integrity: `SHA256SUMS.txt`
- Package manifest: `manifest.json`

The supplied raster reference is retained only as historical source evidence.
The SVG files are the operational masters.
