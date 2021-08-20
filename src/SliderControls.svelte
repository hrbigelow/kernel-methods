<script>
import { Sync } from './sync';
import { numberDisplay } from './presentation';
import K from './K.svelte';

export let sig, cn, cfg, plot, gridarea;

function update() {
  plot.touch++;
}

var s = new Sync(sig, cn, update);

// generic handler
function h(evt) {
  cfg.cmd = evt.target.id;
  s.notify();
  update();
}

</script>

<div class='gb {gridarea}'>
  {#each plot.alpha as a, i}
    <div class='alpha'>
        <label class='ib'><K>{`\alpha_`}{i}</K>
        <input id='update_alpha{i}'
               class='ib slider'
               type=range
               bind:value={a}
               on:input={h}
               min=-10 max=10 step=0.01>
      <div class='ib'>{numberDisplay(a)}</div>
      </label>
    </div>
  {/each}
  <button class='left' id='new_data' on:click={h}>New Data</button>
  <button class='right' id='reset_alpha' on:click={h}>Reset <K>{`\alpha`}</K></button>
  <button class='left' id='del_point' on:click={h}>Del Point</button>
  <button class='right' id='add_point' on:click={h}>Add Point</button>
  <button class='left' id='play_intro' on:click={h}>Play Intro</button>
</div>


<style>

  .gb {
    display: grid;
    row-gap: 5px;
    column-gap: 5px;
    justify-items: stretch;
    align-items: stretch;
    align-content: start;

    grid-template-columns: [alpha-start left-start] min-content [left-end right-start] min-content [right-end alpha-end];
    grid-template-rows: min-content;
  }

  .ib {
    display: inline-block;
  }

  .left {
    grid-column: left;
  }

  .right {
    grid-column: right;
  }

  .alpha {
    grid-column: alpha;
    white-space: nowrap;
    overflow: hidden;
    width: 12em;
  } 

  .slider {
    width: 8em;
  }

</style>

