<script>
import { writable } from 'svelte/store';
import { Plot } from './plot';
import { Context } from './context';
import * as phi from './phi_space';
import Curves from './Curves.svelte';
import PhiSpace from './PhiSpace.svelte';
import LowPanelControls from './LowPanelControls.svelte';
import { numberDisplay } from './presentation';
import K from './K.svelte';

let box = { w: 10, h: 10 };

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

var max_alpha = 4;
let pp = new phi.PhiSpace(max_alpha); 
let sig = writable(0); 

</script>

<figure class='gb screen'>
    <Curves sig={sig} cfg={cfg} cn=1 plot={pp.plot} gridarea='curves'/>
    <PhiSpace sig={sig} cn=2 cfg={cfg} pp={pp} gridarea='phi'/>
    <LowPanelControls sig={sig} cfg={cfg} cn=3 plot={pp.plot} gridarea='panel'/>
    <div class='caption'>Plane spanned by 
      <K>{String.raw`\vec\phi_\sigma(\mu_1)`}</K> and
      <K>{String.raw`\vec\phi_\sigma(\mu_2)`}</K>
    </div>
  <figcaption class='figcap'> <b>Figure 2. Left</b>: The curves plot as before with only two curves.
      <b>Right</b>: The plane in feature space spanned by vectors <K>{String.raw`\vec\phi(\mu_1)`}</K>
          and <K>{String.raw`\vec\phi(\mu_2)`}</K> The blue arrow is 
      <K>{String.raw`\alpha_1 \vec\phi(\mu_1) + \alpha_2 \vec\phi(\mu_2)`}</K>.
  </figcaption>
</figure>


<style>

  figure {
    grid-column: page;
  }

  .screen {
    height: 60vh;
  }

  .gb {
    display: grid;
    grid-template-columns: [figure-start curves-start] auto [curves-end phi-start] min-content [figure-end phi-end];
    grid-template-rows: auto min-content min-content;
    row-gap: 5px;
    column-gap: 10px;
    justify-items: center;
    align-items: start;
  }

  .gb :global(.curves) {
    grid-column: curves;
    grid-row: 1;
    align-self: stretch;
    justify-self: stretch;
  }

  .gb :global(.phi) {
    grid-column: phi;
    grid-row: 1;
    align-self: stretch;
    justify-self: stretch;
  }

  .gb :global(.panel) {
    grid-column: curves;
    grid-row: 2;
    align-self: stretch;
    justify-self: stretch;
  }

  .gb .caption {
    grid-column: phi;
    grid-row: 2;
    align-self: start;
    justify-self: stretch;
  }

  .gb .figcap {
    grid-column: figure;
    grid-row: 3;
    align-self: start;
    justify-self: stretch;
  }


</style>

