// utils.js


function clamp(v, min, max) {
	if (arguments.length == 1) {
		return clamp(v, 0,1)
	}
	return Math.min(Math.max(min, v), max);
}

exports.test = function (n) {
	console.log(n);
}

function rgba(r, g, b, a) {
	if (arguments.length > 3) {
		return 'rgba(' + clamp(r,0,255) + ',' + clamp(g,0,255) + ',' + clamp(b,0,255) + ',' + clamp(a, 0,1) + ')';
	} else if (arguments.length > 2) {
		return rgba(r, g, b, 1);
	} else if (arguments.length > 1) {
		return rgba(arguments[0], arguments[0], arguments[0], arguments[1]);
	} else if (arguments.length == 1) {
		if (r.constructor == Object) {
			return rgba(r.r, r.g, r.b, r.a)
		} else {
			return rgba(r, r, r, 1)
		}
	}
}

function lerp(a, b, k) {
	return (1-k) * a + k * b;
}

// Ramp up the value from 0 to 1 over (min, max) and have 0 / 1 elsewhere
function ramp(min, max, value) {
	return clamp( 1/(max-min) * value - min );
}

function describe(obj) {
	var output = '{\n';
	each(obj, function(k,v) {
	  output += k + ': ' + v + ';\n';
	});
	output += '}';
	return output;
}

function each(o, fn) {
	for (var k in o) {
		if (o.hasOwnProperty(k)) {
			fn(k, o[k]);
		}
	}
}

exports.clamp = clamp
exports.rgba = rgba
exports.lerp = lerp
exports.describe = describe
exports.each = each
exports.ramp = ramp