import App from './App.svelte';
// import activate_katex from './katex_load';


function get_target() {
  var sel;
  if (location.hostname.endsWith('ghost.io'))
    sel = 'main -> article > section';
  else
    sel = 'body';

  return document.querySelector(sel);
}

const app = new App({
    target: get_target(),
    props: { }
});
export default app;
