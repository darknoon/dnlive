var poo = 0.0;
var pooT = 0.0;

console.log('app.js eval');

var centroid = {x: 0, y :0};
var centroidV = {x: 0, y :0};
var target = {x: 0, y :0};

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

function clamp(v, min, max) {
	if (min > max) {
		var temp = min;
		min = max;
		max = temp;
	}
	return Math.min(Math.max(min, v), max);
}

function update (t, dt) {

	poo = lerp(poo, pooT, 0.1);
	
	var oldCentroid = {x:centroid.x, y:centroid.y};
	
	var tension = 100;
	var friction = 0.95;
	centroidV.x += dt * tension * (target.x - centroid.x);
	centroidV.y += dt * tension * (target.y - centroid.y);
	centroidV.x *= friction;
	centroidV.y *= friction;
	centroid.x += centroidV.x * dt;
	centroid.y += centroidV.y * dt;
	
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');
	var w = width;
	var h = height;
	
	ctx.globalAlpha = 1;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
	ctx.fillRect(0,0,w,h);

	function mark(x,y,r) {
		if (0) {
			ctx.beginPath();
			ctx.arc(x,y,r,0,2*Math.PI, true);
			ctx.closePath();
			ctx.fill();
		} else {
			ctx.fillRect(x-r,y-r,2*r,2*r);
		}
	}
	
	function randP(p) {
		var r = lerp(0.5, 0.9, Math.random());
		do {
			p.x = 2 * Math.random() - 1;
			p.y = 2 * Math.random() - 1;
		} while(p.x * p.x + p.y * p.y > r * r);
	}

	function draw(x,y) {
		var v = 40;
		var p = {x:0, y:0};
		randP(p);
		x += v * p.x;
		y += v * p.y;
		mark(x,y,0.5);
	}

	ctx.save();
	
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = rgba(255, 0, 0);
	ctx.globalAlpha = 0.9 * poo;
	
	var count = 190;
	for (var i=0; i<count; i++) {
		var k = i/count;
		draw(lerp(centroid.x, oldCentroid.x, k), lerp(centroid.y, oldCentroid.y, k));
	}
	ctx.restore();
}

function setup() {
	console.log('setup called');
	canvas.addEventListener('touchstart', ontouchstart);
	canvas.addEventListener('touchmove', ontouchmove);
	canvas.addEventListener('touchend', ontouchend);

	canvas.addEventListener('mousedown', onmousedown);
	canvas.addEventListener('mouseup', onmouseup);
	canvas.addEventListener('mousemove', onmousemove);
}

function teardown() {
	console.log('teardown called');
	canvas.removeEventListener('touchstart', ontouchstart);
	canvas.removeEventListener('touchmove', ontouchend);
	canvas.removeEventListener('touchend', ontouchend);

	canvas.removeEventListener('mousedown', onmousedown);
	canvas.removeEventListener('mouseup', onmouseup);
	canvas.removeEventListener('mousemove', onmousemove);
}

function onmousedown(e) {
	target.x = e.clientX;
	target.y = e.clientY;
	pooT = 1.0;
}

function onmouseup(e) {
	target.x = e.clientX;
	target.y = e.clientY;
	pooT = 0.0;
}

function onmousemove(e) {
	target.x = e.clientX;
	target.y = e.clientY;
}

function updateCentroid(e) {
	var c = target;
	c.x = 0;
	c.y = 0;
	for (var i in e.touches) {
		var t = e.touches[i];
		c.x += t.clientX;
		c.y += t.clientY;
	}
	c.x /= e.touches.length;
	c.y /= e.touches.length;
}

function ontouchstart (e) {
	pooT = 1.0;
	updateCentroid(e);
}

function ontouchmove (e) {
	updateCentroid(e);
}

function ontouchend (e) {
	pooT = e.touches.length > 0 ? 1 : 0;
}