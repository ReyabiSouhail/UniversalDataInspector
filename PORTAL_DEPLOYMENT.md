# Portal deployment — ArcGIS Enterprise 10.9

## Important repository layout

Upload the CONTENTS of this directory to the root of the GitHub repository. `manifest.json` must be located directly at:

`https://<username>.github.io/<repository>/manifest.json`

Do not upload one additional parent folder.

## Register the widget

1. Open the manifest URL in a private browser window. It must return JSON, not a GitHub HTML page and not a 404 page.
2. Sign in to Portal as an administrator.
3. Open **Content > New item > Application**.
4. Choose **Application Extension (AppBuilder)**.
5. Enter the complete public HTTPS URL ending with `/manifest.json`.
6. Create and share the extension item.
7. In a 2D Web AppBuilder application, open **Choose Widget > Custom**.

## When Portal says the URL is not an AppBuilder Extension

Check all of these:

- The URL ends with `/manifest.json`.
- The JSON is served anonymously over HTTPS.
- The response is the manifest itself, not `index.html` or a 404 page.
- GitHub repository files are at the published root.
- The `name` value equals the widget folder name: `UniversalDataInspector`.
- Portal 10.9 can access `github.io` through the firewall/proxy.
- Delete any old Portal extension item and register a new one after changing the manifest. Portal stores a copy of the manifest when the item is created.
