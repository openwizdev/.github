# Maps

`draw.mjs` draws the org map (`profile/map.png`) and each repo's map, each with a one-column `-phone` version for narrow screens, in the hand-drawn Virgil font from [Excalidraw](https://github.com/excalidraw/excalidraw) (OFL). The font is not kept here. When the architecture changes, edit the map in `draw.mjs`, render it and commit the new picture to its repo the same day.

```sh
npm pack @excalidraw/excalidraw && tar xzf excalidraw-excalidraw-*.tgz package/dist/prod/fonts/Virgil/Virgil-Regular.woff2
mkdir -p out && node draw.mjs package/dist/prod/fonts/Virgil/Virgil-Regular.woff2 out > out/sizes
while read name height width; do
  chromium --headless --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=3000 \
    --window-size=$width,$height --screenshot=out/$name.png "file://$PWD/out/$name.html"
done < out/sizes
```

| Picture | Goes to |
| --- | --- |
| `org.png`, `org-phone.png` | Unused: the profile now shows `profile/art/map-*.png` |
| `openwiz.png`, `openwiz-phone.png` | `docs/map.png`, `docs/map-phone.png` in OpenWiz |
| `wizplugins.png`, `wizplugins-phone.png` | `docs/images/map.png`, `docs/images/map-phone.png` in WizPlugins |
| `wizsite.png`, `wizsite-phone.png` | `docs/map.png`, `docs/map-phone.png` in WizSite (also pinned in `scripts/check.py`'s `DOC_HASHES`) |
