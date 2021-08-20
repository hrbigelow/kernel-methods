<script>
import { Sync } from './sync';
import { range } from 'd3';
import { onMount } from 'svelte';

export let sig, cfg, plot, cn, gridarea;
let divw=0, divh=0;
let drag_point = null;
let s, mounted = false;


function solve(do_solve, msg) {
  // console.log(`in solve: ${msg}, do_solve=${do_solve}`);
  if (! do_solve) return;
  const NSTEPS = 50;
  var start_alpha = plot.alpha;
  var end_alpha = plot.solutionAlpha();
  // console.log(`in solve: ${end_alpha}`);

  function transition(step, nsteps) {
    if (step == nsteps) {
      plot.alpha = end_alpha;
    } else {
      var delta = step / nsteps;
      for (let i = 0; i != plot.n; i++) {
        plot.alpha[i] = delta * end_alpha[i] + (1 - delta) * start_alpha[i];
      }
    }
    s.notify();
    if (step != nsteps) {
      setTimeout(() => transition(step+1, nsteps), 10);
    }
  }
  transition(0, NSTEPS);
}


/*
Synopsis:
1. show just data points
2. add gray curves, with mu_i in center
3. move the mu_i towards the data points
4. add blue and orange curves (only blue will be visible)
5. solve for alpha
6. move mu_i towards center
7. move mu_i back

*/
function intro_movie() {

  const start_alpha = Array.from(plot.alpha);
  const solution_alpha = plot.solutionAlpha();

  function init(progress) {
    cfg.curves = false;
    cfg.minsolution = false;
    cfg.solution = false;
    cfg.show_data = true; 
    plot.push_mu_to_center(1.0);
  }

  function enter(progress) {
    cfg.curves = true; 
    cfg.solution = true;
  }

  function expand_mus(progress) {
    const factor = 0.5 * (Math.sin(Math.PI * (progress - 0.5)) + 1);
    plot.push_mu_to_center(1.0 - factor);
    plot.touch++;
  }

  function solve(progress) {
    const factor = 0.5 * (Math.sin(Math.PI * (progress - 0.5)) + 1);
    for (let i = 0; i != plot.n; i++) 
      plot.alpha[i] = (1.0 - factor) * start_alpha[i] + factor * solution_alpha[i];
  }

  function wiggle(progress) {
    const factor = Math.sin(Math.PI * 2 * progress) * 0.35;
    cfg.minsolution = true;
    plot.push_mu_to_center(factor);
    plot.alpha = plot.solutionAlpha();
  }

  var scenes = [init, enter, expand_mus, solve, wiggle];
  const scene_steps = [35, 25, 25, 80, 100]; 


  function transition(scene_idx, step) {
    // console.log(`intro_movie transition ${step}`);
    if (step > scene_steps[scene_idx]) {
      scene_idx += 1;
      step = 0;
    }
    if (scene_idx == scene_steps.length) {
      cfg.minsolution = false;
      plot.touch++;
      return;
    }

    const timeout = step == 0 ? 800 : 10;
    const progress = step / scene_steps[scene_idx];
    scenes[scene_idx](progress);
    s.notify();
    setTimeout(() => transition(scene_idx, step+1), timeout);
  }

  transition(0, 0);
}


function update() {
  if (! mounted) return;
  var cmd = cfg.cmd;
  // console.log(cfg);
  if (cmd == null) throw 'got null cfg.cmd in Curves update';
  if (cmd == 'reset_alpha') plot.resetAlpha();
  if (cmd == 'del_point') plot.delPoint();
  if (cmd == 'add_point') plot.addPoint();
  if (cmd == 'new_data') plot.populate();
  if (cmd == 'auto_solve') solve(cfg.auto_solve);
  if (cmd == 'mu_tracks_x' && cfg.mu_tracks_x) plot.recenter_mu();
  if (cmd == 'scramble') plot.set_scramble(cfg.scramble);
  if (cmd == 'set_sigma') plot.set_sigma(cfg.log_sigma);
  if (cmd == 'play_intro') intro_movie();
  if (cmd.match(/update_alpha/)) { 
    // do nothing
  }
  else if (cmd == 'set_sigma' || cmd == 'mu_xy_changed') {
    if (cfg.auto_solve)
      plot.alpha = plot.solutionAlpha();
  } else if (cmd != 'reset_alpha') {
    solve(cfg.auto_solve);
  }

  plot.touch++;
  cfg.cmd = null;
  s.notify();
}


function resize(width, height) {
  if (! mounted) return;
  plot.resize(width, height);
  // console.log(`in Curves resize with component dims: ${width} x ${height}, ctx dims: ${plot.ctx.width} x ${plot.ctx.height}`);
  // console.log(`in Curves resize with ${width} x ${height}`);
  plot.touch++;
}



onMount(() => {
  s = new Sync(sig, cn, update);
  mounted = true;
  resize(divw, divh);
});

function onMouseDown(evt) {
  drag_point = evt.target;
}


function onMouseMove(evt) {
  if (drag_point == null) return;
  var g = drag_point.id.match(/(?<code>\D+)(?<num>\d+)/).groups
  if (g.code == 'mu')
    plot.setMu(g.num, evt.offsetX);
  else if (g.code == 'xy') {
    plot.setDataPoint(g.num, evt.offsetX, evt.offsetY);
    if (cfg.mu_tracks_x)
      plot.setMu(g.num, evt.offsetX);
  }
  cfg.cmd = 'mu_xy_changed';
  update();
  // s.notify();
}

function onMouseUp(evt) {
  drag_point = null;
}

$: resize(divw, divh);

</script>

<!--
  This component must be placed in a grid, which controls the size.
  gridarea is a global CSS rule applied from the parent element which should
  specify grid-area, align-self and justify-self properties.  When the grid
  layout changes, the div is resized, and this component reacts via the bound
  w and h variables.  Since both div and svg elements are placed in the same
  grid cell via the 'gridarea' class, the dimensions are the same.
-->
<div class='framed {gridarea} z3' bind:clientWidth={divw} bind:clientHeight={divh}></div>
<svg class='framed {gridarea}'
     on:mousemove={onMouseMove}
     on:mouseup={onMouseUp}
     >
     <defs>
     <polygon id='mu-select' points="-6,0 6,0 0,12"/>
     </defs>
  {#each plot.getMuX() as [mu,x], i}
    <use class='marker draggable'
         id='mu{i}' x="{mu}" y="0" xlink:href='#mu-select'
                             on:mousedown={onMouseDown}/>

  {/each}

  {#each range(plot.n) as i}
    {#if cfg.curves}
      <path class="curve" d="{plot.curve(i)}"/>
    {/if}

    {#if cfg.points}
      {#each plot.points(i) as [u,v]}
        <circle class="point" cx="{u}" cy="{v}" r="4"/>
      {/each}
    {/if}
  {/each}

  {#if cfg.minsolution}
    <path class="min-solution-curve" d="{plot.minSolutionCurve()}"/>
  {/if}

  {#if cfg.solution}
    <path class="solution-curve" d="{plot.solutionCurve()}"/>
  {/if}

  {#if cfg.show_data}
    {#each plot.data() as [u,v], i}
      <circle
        id='xy{i}'
        class="marker draggable" 
        cx="{u}" cy="{v}" r="5"
        on:mousedown={onMouseDown}/>
    {/each}
  {/if}

</svg>

<style>

  .z3 {
    z-index: -3;
  }

  .marker {
    fill: #000000;
    stroke: #000000;
  }

  .curve {
    fill: none;
    stroke: rgba(200, 200, 200, 1);
    stroke-width: 2px;
  }

  .point {
    fill: rgba(200, 200, 200, 1);
    stroke-width: 1px;
  }

  .framed {
    border: 1px solid gray;
  }

  .solution-curve {
    fill: none;
    stroke: rgba(0,0,255,1);
    stroke-width: 2px;
  }

  .min-solution-curve {
    fill: none;
    stroke: rgba(255,140,0,1);
    stroke-width: 2px;
  }

  .draggable:hover {
    stroke: rgba(255,0,0,1);
    fill: rgba(255,0,0,1);
  }


</style>

