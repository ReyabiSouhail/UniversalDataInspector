# Universal Data Inspector

A classic ArcGIS Web AppBuilder 2D custom widget for ArcGIS Enterprise 10.9 / Web AppBuilder 2.19.

## Esri conventions used

- `Widget.js` inherits `jimu/BaseWidget`.
- `setting/Setting.js` inherits `jimu/BaseWidgetSetting`.
- Runtime UI is stored in `Widget.html`.
- Runtime styles are stored in `css/style.css`.
- Runtime localization is stored in `nls/strings.js`.
- Settings UI is stored in `setting/Setting.html`.
- Settings styles are stored in `setting/css/style.css`.
- Settings localization is stored in `setting/nls/strings.js`.
- The folder name and manifest `name` are both `UniversalDataInspector`.

## Runtime behavior

1. The user opens the widget and clicks the map.
2. A marker is drawn immediately.
3. Every configured source is queried around the clicked point.
4. Fields from different layers are normalized using `fieldMap`.
5. Administrator-defined conditions and ranking criteria are applied.
6. Top 1 or Top N results are rendered in one summary panel.
7. Selected geometries are highlighted.

## Installation in Developer Edition

Copy the `UniversalDataInspector` folder to:

`client/stemapp/widgets/UniversalDataInspector`

Restart Web AppBuilder Developer Edition and add the widget from the widget gallery.

## Portal registration

Host the complete folder on an anonymous HTTPS web server. Register the direct URL to `manifest.json` as an `Application Extension (AppBuilder)` item using a Portal administrator account.

## Configuration model

See `examples/tower-rules.json` for a complete example. The administrator defines all business rules. The engine does not assume that highest, lowest, latest, or any specific text value is best.
