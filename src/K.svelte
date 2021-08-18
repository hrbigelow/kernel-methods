<script>
	import katex from 'katex'
	const render = n => katex.render(n.textContent, n)
</script>
<span use:render><slot/></span>

