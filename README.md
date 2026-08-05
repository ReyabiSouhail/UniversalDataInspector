# Universal Data Inspector 4.0

A configuration-driven custom widget for **ArcGIS Web AppBuilder 2.19 / ArcGIS Enterprise 10.9**.

The widget queries any layers or tables selected by the administrator, applies administrator-defined rules, places a pin at the clicked map location, highlights winning features, and displays one unified summary panel.

## Core design principle

The widget does **not** decide what “best” means.

The administrator defines:

- which web-map sources participate;
- which fields are used;
- optional SQL `WHERE` filters;
- candidate conditions;
- ranking criteria and tie breakers;
- numeric, text, date, or priority-text comparison;
- Top 1 or Top N output;
- fields shown in the default template;
- optional custom HTML for each rule.

## Runtime workflow

```text
Map click
  -> show marker immediately
  -> query enabled sources in parallel
  -> normalize different layer fields into canonical names
  -> filter candidates using each configured rule
  -> sort candidates using administrator-defined criteria
  -> select Top 1 or Top N
  -> render one summary card per rule
  -> highlight winning geometries
```

## Installation in Web AppBuilder Developer Edition

Copy the `UniversalDataInspector` folder to:

```text
WebAppBuilderForArcGIS/client/stemapp/widgets/UniversalDataInspector
```

Restart Web AppBuilder Developer Edition and add the widget from the widget gallery.

## Publication through GitHub Pages

Publish all widget files at the repository root. The following URL must return the manifest JSON:

```text
https://YOUR-USER.github.io/UniversalDataInspector/manifest.json
```

Register that URL as an **AppBuilder Extension** item in ArcGIS Enterprise, then share the item with the organization or appropriate groups.

## Configuration guide

### 1. Sources

Enable any source discovered in the current web map.

Each source has:

- `key`: stable logical name used by rules;
- `source`: selector using source ID, URL, or title;
- `where`: optional server-side SQL filter;
- `relationship`: spatial relationship to the click tolerance geometry;
- `maxRecords`: safety limit per source;
- `fieldMap`: mapping from canonical names to real source fields;
- `displayFields`: default fields shown by summaries.

Example:

```json
{
  "key": "tower_a",
  "source": { "matchBy": "title", "value": "Tower A" },
  "where": "STATUS = 'ACTIVE'",
  "fieldMap": {
    "speed": "SPEED_Mbps",
    "technology": "NETWORK_TYPE",
    "updated": "LAST_UPDATE"
  }
}
```

Canonical mapping allows different layers to use different physical field names while rules use one common name.

### 2. Conditions

Conditions decide which queried records are candidates.

Supported operators:

- `equals`
- `notEquals`
- `contains`
- `startsWith`
- `greaterThan`
- `greaterOrEqual`
- `lessThan`
- `lessOrEqual`
- `isEmpty`
- `isNotEmpty`

Conditions can use `AND` or `OR` logic.

### 3. Ranking criteria

Ranking criteria define what “best” means. They are evaluated in order, so later criteria act as tie breakers.

Supported value types:

- `number`
- `text`
- `date`
- `priorityText`
- `auto`

Supported directions:

- `descending`
- `ascending`

Examples:

Highest speed, newest update as tie breaker:

```json
"sort": [
  { "field": "speed", "valueType": "number", "direction": "descending" },
  { "field": "updated", "valueType": "date", "direction": "descending" }
]
```

Preferred technology order:

```json
{
  "field": "technology",
  "valueType": "priorityText",
  "direction": "descending",
  "priority": ["5G", "4G", "3G", "2G"]
}
```

The priority list is authored by the administrator. It is not hard-coded in the widget.

### 4. Default template

The default template automatically displays:

- rule name and description;
- winning source title;
- candidate count;
- configured display fields;
- Top N result list when more than one result is selected.

### 5. Custom template

Each rule can use custom HTML.

Available placeholders include:

```text
{{summary.name}}
{{summary.description}}
{{summary.candidateCount}}
{{best.sourceTitle}}
{{best.sourceKey}}
{{best.values.CANONICAL_NAME}}
{{best.attributes.REAL_FIELD_NAME}}
```

Example:

```html
<section class="udi-summary-card">
  <div class="udi-summary-kicker">{{summary.name}}</div>
  <h2>{{best.sourceTitle}}</h2>
  <table class="udi-table">
    <tr><th>Speed</th><td>{{best.values.speed}}</td></tr>
    <tr><th>Technology</th><td>{{best.values.technology}}</td></tr>
    <tr><th>Candidates</th><td>{{summary.candidateCount}}</td></tr>
  </table>
</section>
```

Custom HTML is stored in the widget configuration. Only trusted application administrators should edit it.

## Performance choices

- Only configured fields are requested.
- Source requests run in parallel.
- Geometry is returned only when configured.
- Each source has a configurable record limit.
- Query responses use an in-memory TTL cache.
- Old click executions are ignored after a newer click.
- A pixel tolerance envelope is converted to map units.
- Missing or failed sources produce warnings without blocking successful results.

## Important limitations

- SQL syntax depends on the underlying ArcGIS service.
- MapServer sublayer metadata may not expose fields until the service is loaded; advanced JSON can still specify field names.
- Custom HTML is intended for trusted administrators.
- The widget is designed for 2D Web AppBuilder applications.
- Functional testing must be performed with the organization’s real secured services, proxy, CORS, domains, and field schemas.

## Example

See:

```text
examples/user-defined-tower-rules.json
```

The example demonstrates two layers with different physical field names, an administrator-defined numeric rule, a date tie breaker, and a custom priority-text rule.
