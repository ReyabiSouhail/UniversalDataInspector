# Universal Data Inspector 2.0

A reusable, configuration-driven widget for **ArcGIS Web AppBuilder Developer Edition 2.19 / ArcGIS Enterprise 10.9.x**.


## What works immediately

The default `config.json` runs in **Auto Inspect** mode. Add the widget to any 2D Web AppBuilder application, open it, and click the map. It queries visible queryable layers, places a marker, highlights the first geometry, and renders one panel containing all matching records.

## Main capabilities

- Automatic discovery of FeatureLayers, web-map tables, and queryable MapServer sublayers.
- Generic source matching by `id`, `title`, or `url`.
- Attribute and spatial queries.
- Sequential and parallel workflow execution.
- First, last, count, and array result modes.
- Best-record selection using multiple ordered rules.
- Client-side count, sum, average, min, and max.
- Administrator expressions with helper functions.
- HTML template rendering.
- Marker, highlight, cache, partial failure handling, and stale-click cancellation.
- English code comments and a JSON configuration validator.

## Installation for Developer Edition

Copy the folder `UniversalDataInspector` to:

```text
WebAppBuilderForArcGIS/client/stemapp/widgets/UniversalDataInspector
```

Restart Web AppBuilder, create or open a 2D application, then add **Universal Data Inspector** from the custom widget list.

## First test

1. Keep the supplied `config.json` unchanged.
2. Open the widget panel.
3. Click a visible feature on the map.
4. The panel should display matching records from visible queryable layers.

If nothing appears, verify that the layer supports Query and that the current map scale makes it visible.

## Workflow operations

### `autoIdentify`
Queries visible spatial sources around the clicked point.

### `spatialQuery`
Queries one configured source using a geometry from the context.

### `attributeQuery`
Queries one configured layer or table using a `where` expression.

### `selectRecord`
Chooses `first`, `last`, or `best` from an array.

### `statistics`
Calculates `count`, `sum`, `avg`, `min`, or `max` from an existing array.

### `expression`
Calculates a value from previous outputs. Helper functions are under `FN`, for example `FN.IF(...)`, `FN.ROUND(...)`, and `FN.COALESCE(...)`.

## Source selector

```json
{ "matchBy": "title", "value": "Parcels" }
```

For portable production configurations, URL matching is safer:

```json
{
  "matchBy": "url",
  "value": "https://server.example.com/arcgis/rest/services/Cadastre/FeatureServer/0"
}
```

## Advanced example

See `examples/advanced-workflow.json`. Replace its sample layer titles and fields with values shown in the widget setting page.

## Important security note

Expressions are intended for trusted application administrators. They are not a sandbox for untrusted end users. Do not allow public users to edit widget configuration.

## Performance rules

- Request only required fields in configured workflows.
- Set `returnGeometry` to `false` unless geometry is needed later.
- Put independent queries inside a `parallel` step.
- Use server-side `orderBy` and `maxRecords` when supported.
- Prefer URL source matching in production.
