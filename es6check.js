

try {
    eval("let [a]=[42]");
} catch (e) {
	document.write('This game needs ES6 support, try Chrome instead.');
	document.write('<style>#start-button {display:none;}</style>');
    throw "die on no es6";
}

