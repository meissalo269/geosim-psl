<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- tsconfig: noUncheckedIndexedAccess disabled — raster/matrix code indexes typed arrays heavily.
- vite optimizeDeps.include lists runtime libs (slider, leaflet, geotiff…) — lazy optimization caused duplicate React chunks and blank pages.
- Spatial Markov runs as a seeded browser-side stochastic realization; CA-Markov uses a synchronous 3×3 neighborhood with smoothed weights, not suitability layers or exact area allocation, to keep the assumptions inspectable.
- Generated prediction rasters enter the shared session dataset list and carry isPrediction; historical calibration excludes them to avoid using simulated observations.
- Graph exports use ChartPanel to capture their titles and fictitious-data context; GeoTIFF exports preserve the categorical signed-integer grid and original georeferencing.
- Provided historical PSL rasters are pre-masked by pixel-centre inclusion in the supplied WGS84 study polygon; retain the original grid, assign exterior NoData, and serve fixed inputs through asset pointers so all analyses exclude the exterior consistently.
