<script>
  import { writable } from 'svelte/store';
  import { Plot } from './plot';
  import { Context } from './context';
  import Curves from './Curves.svelte';
  import LowPanelControls from './LowPanelControls.svelte';
  import SliderControls from './SliderControls.svelte';
  import KernelHeatmap from './KernelHeatmap.svelte';
  import KernelMatrix from './KernelMatrix.svelte';
  import K from './K.svelte';

  export let fullscreen = false;
  let topclass = fullscreen ? 'screen100' : 'screen80';

  let cfg = {
    cmd: null,
    points: false,
    curves: true,
    solution: true,
    auto_solve: false,
    mu_tracks_x: true,
    scramble: false,
    log_sigma: 0,
    show_data: true
  };

  let ctx = new Context(0, 0, [-4, 4], [-4, 4]);
  let plot = new Plot(ctx, 3);
  let sig = writable(0); 
  let h;

</script>

<figure>
<div class='{topclass} fb-vert'>
  <div class='fi-upper gbox-upper'>
      <Curves sig={sig} cn=1 cfg={cfg} plot={plot} gridarea='curves'/>
      <SliderControls sig={sig} cn=3 cfg={cfg} plot={plot} gridarea='slider-controls'/>
      <LowPanelControls sig={sig} cn=2 cfg={cfg} plot={plot} gridarea='panel'/>
  </div>

  <div class='fi-lower gbox-lower'>
    <KernelHeatmap sig={sig} cn=4 plot={plot} gridarea='cell2'/>
    <KernelMatrix sig={sig} cn=5 plot={plot} gridarea='cell6'/>
    <div class='y1'><K>{`\mu`}</K></div>
    <div class='y2'><K>{`\mu_i`}</K></div>
    <div class='x1'><K>{`x`}</K></div>
    <div class='x2'><K>{`x_i`}</K></div>
    <div class='cap1'><K>{`\mathcal{N}(x; \mu, \sigma)`}</K></div>
    <div class='cap2'><K>{`\mathcal{N}(x_i; \mu_i, \sigma)`}</K></div>
  </div>
</div>
<figcaption>
  Interactive plot.  You can drag the black <K>{`(x_i, y_i)`}</K> data points and triangles
  (<K>{`\mu_i`}</K> values).  <b>Top</b>: gray curves are Gaussians centered at the
  <K>{`\mu_i`}</K>.  Blue curve is the <K>{`\vec{\alpha}`}</K> linear combination of the gray curves.
  <b>Bottom left</b>: A heatmap showing the family of Gaussians with the same
  <K>{`\sigma`}</K> at every <K>{`\mu`}</K> value.  Red dots show the locations of evaluation
  points.  <b>Bottom right</b>:  The matrix of values of evaluation points
  organized by <K>{`\mu_i`}</K> and <K>{`x_i`}</K>.  Other details provided in text.  
    <a href="full.html">Full Page Figure</a>.
</figcaption>
</figure>


<style>

  figure {
    grid-column: page;
  }

  .gbox-upper {
    display: grid;
    grid-template-columns: [figure-start curves-start] auto [curves-end slider-start] min-content [slider-end figure-end];
    grid-template-rows: auto min-content;
    row-gap: 5px;
    column-gap: 10px;
    justify-items: center;
    align-items: end;
  }

  .gbox-upper :global(.curves) {
    grid-area: 1/1/2/2;
    align-self: stretch;
    justify-self: stretch;
  }

  .gbox-upper :global(.panel) {
    grid-column: curves;
    grid-row: 2;
    align-self: stretch;
    justify-self: stretch;
  }

  .gbox-upper :global(.slider-controls) {
    grid-column: slider;
    grid-row: 1;
    align-self: end;
    justify-self: stretch;
  }

  .gbox-lower {
      display: grid;
      /* grid-template-columns: min-content min-content 1fr 1fr 1fr min-content min-content; */
      grid-template-columns: 5% min-content min-content 5% 10% 5% min-content min-content 5%;
      grid-template-rows: 60% repeat(2, min-content);
      row-gap: 5px;
      column-gap: 5px;
      justify-items: center;
      align-items: center;
      justify-content: start;
      align-content: center;
  }

  .y1 {
  
      grid-row: 1;
      grid-column: 2;
  }

  .y2 {
      grid-row: 1;
      grid-column: 7;
  }

  .x1 {
      grid-row: 2;
      grid-column: 3;
  }

  .x2 {
      grid-row: 2;
      grid-column: 8;
  }

  .cap1 {
      grid-row: 3;
      grid-column: 1/5;
  }

  .cap2 {
      grid-row: 3;
      grid-column: 6/10;
  }

  .gbox-lower :global(.cell2) {
      grid-row: 1;
      grid-column: 3;
      align-self: stretch;
  }

  .gbox-lower :global(.cell6) {
      grid-row: 1;
      grid-column: 8;
      align-self: stretch;
  }

  .fb-vert {
      display: flex;
      flex-direction: column;
  }

  .fb-horz {
      display: flex;
      fiex-direction: row;
  }

  .fi-upper {
      flex: 4 4 0;
  }
  .fi-lower {
      flex: 2 2 0;
  }


  .screen80 {
      height: 80vh;
  }

  .screen100 {
      height: 95vh;
  }


</style>

