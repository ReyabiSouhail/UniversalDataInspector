# Universal Data Inspector — Web AppBuilder 2.19

A real ArcGIS Web AppBuilder 2D custom widget project for ArcGIS Enterprise 10.9.

## Runtime behavior

1. The user opens the widget and clicks the map.
2. A configurable marker is placed immediately.
3. The widget queries administrator-selected map layers or tables.
4. Source-specific fields are mapped to common canonical names.
5. Administrator-created conditions filter the candidates.
6. Administrator-created ranking criteria define what “best” means.
7. The widget returns Top 1 or Top N and renders a single summary.
8. Each rule may use the default template or custom HTML.

No business definition of “best” is hard-coded.

## ArcGIS compatibility

- ArcGIS Enterprise 10.9
- ArcGIS Web AppBuilder 2.19
- ArcGIS API for JavaScript 3.35
- 2D applications only

See `PORTAL_DEPLOYMENT.md` for GitHub Pages and Portal registration instructions.
