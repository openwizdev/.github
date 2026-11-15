# Maps

`draw.mjs` draws the org map (`profile/map.png`) and each repo's map, in the hand-drawn Virgil font from [Excalidraw](https://github.com/excalidraw/excalidraw) (OFL). The font is not kept here. When the architecture changes, edit the map in `draw.mjs`, render it and commit the new picture to its repo the same day.

```sh
npm pack @excalidraw/excalidraw && tar xzf excalidraw-excalidraw-*.tgz package/dist/prod/fonts/Virgil/Virgil-Regular.woff2
mkdir -p out && node draw.mjs package/dist/prod/fonts/Virgil/Virgil-Regular.woff2 out > out/sizes
while read name height; do
  chromium --headless --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=3000 \
    --window-size=900,$height --screenshot=out/$name.png "file://$PWD/out/$name.html"
done < out/sizes
```

| Picture | Goes to |
| --- | --- |
| `org.png` | `profile/map.png` here |
| `openwiz.png` | `docs/map.png` in OpenWiz |
| `wizplugins.png` | `docs/images/map.png` in WizPlugins |
| `wizsite.png` | `docs/map.png` in WizSite |
