import FullPagePlot from './FullPagePlot.svelte';
import activate_katex from './katex_load';

const full_page = new FullPagePlot({
	target: document.body
});

activate_katex();

export default full_page;

