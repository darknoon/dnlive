// utils.js


function clamp(v, min, max) {
	if (min > max) {
		var temp = min;
		min = max;
		max = temp;
	}
	return Math.min(Math.max(min, v), max);
}

exports.test = function (n) {
	console.log(n);
}

function rgba(r, g, b, a) {
	if (arguments.length > 3) {
		return 'rgba(' + clamp(r,255,0) + ',' + clamp(g,255,0) + ',' + clamp(b,255,0) + ',' + clamp(a,1,0) + ')';
	} else if (arguments.length > 2) {
		return rgba(r, g, b, 1);
	} else if (arguments.length > 1) {
		return rgba(r, r, r, g);
	} else {
		return rgba(r, r, r, 1);
	}
}

function lerp(a, b, k) {
	return (1-k) * a + k * b;
}

exports.clamp = clamp
exports.rgba = rgba
exports.lerp = lerp