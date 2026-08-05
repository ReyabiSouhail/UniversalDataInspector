# Deployment checklist

1. Verify `/manifest.json` returns HTTP 200 and `application/json`.
2. Verify the hosted folder name is `UniversalDataInspector`.
3. Verify `manifest.json` contains `"name": "UniversalDataInspector"`.
4. Verify `/Widget.js`, `/Widget.html`, `/config.json`, `/css/style.css`, and `/setting/Setting.js` return HTTP 200.
5. For Enterprise 10.9 use `wabVersion` 2.19. For Enterprise 10.9.1 use 2.21.
6. Create a new Portal AppBuilder Extension item after changing the manifest.
