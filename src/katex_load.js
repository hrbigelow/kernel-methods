function activate_katex() {
    document.addEventListener("DOMContentLoaded", function() {
        renderMathInElement(document.body, {
            macros: {},
            globalGroup: true,
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
            ],
            throwOnError : false
        });
    });
}

export default activate_katex;
