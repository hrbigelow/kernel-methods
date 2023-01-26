<script>
import { onMount } from 'svelte';
import GlslCanvas from 'glslCanvas';
import { RBFKernel, RBFShuffleKernel } from './kernel'; 
import parser from 'ua-parser-js';
import kernel_frag from './shaders/kernel_frag.glsl';
import { Sync } from './sync';
import * as d3 from 'd3';

export let sig, cn, plot, gridarea;
let xmin, xmax, mounted = false, ua_device;
let sandbox;
let svg, divh, can = null;
let s;

function xTou(x) {
  var h = svg.clientHeight;
  return h * (x - xmin) / (xmax - xmin);
}

function yTov(y) {
  return xTou(y);
}

function resize(dummy) {
  if (! mounted) return;
  var h = svg.clientHeight; // excludes border
  // console.log(`in KernelHeatmap resize with dummy=${dummy}, svg.clientHeight=${h}`);
  svg.setAttribute('width', h);
  if (can !== null)
    can.setAttribute('width', h);
  update();
}

function update() {
  var sigma = Math.sqrt(plot.get_sigma2());
  var do_scramble = plot.scrambled();
  var cut_size = plot.cut_size(); 
  [xmin, xmax] = plot.get_xrange();

  if (sandbox instanceof GlslCanvas) { 
    sandbox.setUniform("u_sigma", sigma);
    sandbox.setUniform("cut_size", cut_size);
    sandbox.setUniform("u_do_scramble", do_scramble ? 1 : 0);
    sandbox.setUniform("u_xmin", xmin); 
    sandbox.setUniform("u_xmax", xmax); 
  }
  plot.touch++;
}

onMount(() => {
  s = new Sync(sig, cn, update);
  console.log(`type of can = ${typeof can}`);
  var gl = can === null ? null : can.getContext('webgl') || can.getContext('experimental-webgl');
  if (gl && gl instanceof WebGLRenderingContext) {
    sandbox = new GlslCanvas(can);
    sandbox.load(kernel_frag);
  }
  mounted = true;
  ua_device = new parser().getDevice().type;
  // console.log(`ua_device type: ${ua_device}`);

  resize(divh);
});

$: resize(divh);

</script>

<!-- This component must be placed in a grid.  The 'gridarea' class
  must have properties grid-area, align-self and justify-self.  When the
  grid resizes, this component senses the change via the divh variable.
  This component keeps itself square shaped, so only needs to respond to
  height change.
-->
<div class='{gridarea} invis-framed' bind:clientHeight={divh}></div>
{#if ua_device === undefined || ua_device === 'console'}
  <canvas class='{gridarea} framed z1' bind:this={can}></canvas>
{/if}
<svg class='{gridarea} framed z2' bind:this={svg}>
  {#if mounted}
    {#each plot.x as x}
      {#each plot.mu as mu} 
        <circle cx="{xTou(x)}" cy="{yTov(mu)}" r="2" fill="rgba(255,0,0,1)" />
      {/each}
    {/each}
  {/if}
</svg>

<style>

  .framed {
    border: 1px solid gray;
  }

  .invis-framed {
    border: 1px solid transparent;
  }

  .z1 {
    z-index: 1;
  }

  .z2 {
    z-index: 2;
  }

</style>

