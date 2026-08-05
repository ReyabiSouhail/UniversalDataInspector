# Universal Data Inspector — Step 1

This package implements the first milestone only: selecting one or more queryable sources from the current Web Map.

## Target

- ArcGIS Enterprise 10.9.1
- Web AppBuilder 2.21
- ArcGIS API for JavaScript 3.x
- 2D applications

## Current functionality

- Discovers FeatureLayer instances.
- Discovers leaf sublayers from ArcGIS Dynamic Map Services.
- Discovers standalone tables declared in the Web Map.
- Loads REST metadata when it is not already available on the map layer.
- Allows multiple layer selection in the widget settings.
- Stores layer ID, title, URL, source type, geometry type, Object ID field, fields, capabilities, and maximum record count.
- Restores saved selections when the settings page is reopened.
- Displays the configured layer metadata in the runtime widget.

## Installation

Copy the `UniversalDataInspector` folder to:

`client/stemapp/widgets/UniversalDataInspector`

Restart Web AppBuilder Developer Edition and create a new 2D application.

## Test

1. Add the widget.
2. Open its settings.
3. Click **Refresh layers**.
4. Select one or more layers.
5. Click **OK**.
6. Reopen the widget settings and confirm the selection is preserved.
7. Open the widget at runtime and verify that the selected layer metadata is displayed.

## Next milestone

Step 2 will allow the administrator to choose fields from each selected layer.
