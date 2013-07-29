
var hasmoved = {};
var mouseDownness;

var lastTouchPositions = {};
var trackingNone = false;

function ColorAdjuster(name, color, location) {
	this.value = 1;
	this.name = name;
	this.color = color;
	this.location = location;
	this.touches = [];
		
	return this;
}

ColorAdjuster.prototype.hitTest = function (x,y) {
	var w = canvas.width;
	var h = canvas.height;
	var maxR = w / 2.5 / (1.0 - zoom);
	var dx = x - this.location.x - w/2;
	var dy = y - this.location.y - h/2;
	return dx * dx + dy * dy < maxR * maxR;
}

ColorAdjuster.prototype.addTouch = function (id, x, y) {
	var touches = this.touches;
	touches.push({id:id, x:x, y:y, px:x, py:y});	
}

ColorAdjuster.prototype.updateTouch = function (id, x, y) { 
	var touches = this.touches;
	for (var i in touches) {
		var t = touches[i];
		if (t.id == id) {
			t.px = t.x;
			t.py = t.y;
			t.x = x;
			t.y = y;
			var dx = t.x - t.px;
			var dy = t.y - t.py;
			
			this.value -= 0.001 * dy;
		}
	}
}

ColorAdjuster.prototype.update = function (t, dt) {

}

ColorAdjuster.prototype.removeTouch = function (id, x, y) {
	var touches = this.touches;
	for (var i in touches) {
		var t = touches[i];
		if (t.id == id) {
			touches.remove(t);
		}
	}
}

Array.prototype.remove = function(v) {
	var i = this.indexOf(v);
	if (i == -1) return;
	this.splice(i,1);
}


function update (t, dt) {
	var utils = require('utils.js');
	var lerp = utils.lerp;
	var clamp = utils.clamp;
	var rgba = utils.rgba;
	
	
	zoom = lerp(zoom, zoomTarget * 0.99, 0.05);
	
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');
	var w = canvas.width;
	var h = canvas.height;
	ctx.save();

	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
	ctx.fillStyle = 'rgba(0, 0, 0, 1)';
	ctx.fillRect(0,0,w,h);

	ctx.translate(w/2, h/2);

	var anyHit = false;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.touches.length > 0) anyHit = true;
	}
	
	mouseDownness = lerp(mouseDownness, anyHit, 0.1);
	
	
	var maxR = w / 2.5 / (1.0 - zoom);
	
	for (var name in channels) {
		var channel = channels[name];
		channel.update(t, dt);
	}
	
	ctx.globalCompositeOperation = 'lighter';
	// Draw circles
	for (var name in channels) {
		var channel = channels[name];
		
		ctx.beginPath();
		ctx.fillStyle = channel.color
		ctx.globalAlpha = channel.value;
		
		var x = channel.location.x / (1.0 - zoom);
		var y = channel.location.y / (1.0 - zoom);
		
		ctx.arc(x, y, maxR, 0, 2*Math.PI);
		ctx.fill();
		ctx.closePath();
	}

	ctx.globalCompositeOperation = 'source-over';	
	ctx.globalAlpha = 1;

	// Draw dark rings
	for (var name in channels) {
		var channel = channels[name];
		if (channel.touches.count == 0) continue;
		var x = channel.location.x / (1.0 - zoom);
		var y = channel.location.y / (1.0 - zoom);
		ctx.strokeStyle = 'black'
		ctx.globalAlpha = 0.2 * (1 - zoom);
	
		ctx.beginPath();
		ctx.arc(x, y, channel.value * maxR, 0, 2*Math.PI);
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.closePath();
	}
	
	// Draw light rings
	ctx.globalAlpha = 1;
	for (var name in channels) {
		var channel = channels[name];

		var x = channel.location.x / (1.0 - zoom);
		var y = channel.location.y / (1.0 - zoom);

		ctx.strokeStyle = 'white'
		ctx.globalAlpha = 0.8 * (1 - zoom);

		ctx.beginPath();
		ctx.arc(x, y, channel.value * maxR, 0, 2*Math.PI);
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.closePath();
	}
	ctx.globalAlpha = 1;
	
	for (var name in channels) {
		var channel = channels[name];
		var x = channel.location.x / (1.0 - zoom);
		var y = channel.location.y / (1.0 - zoom);
	
		ctx.fillStyle = 'white';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.font = '20pt HelveticaNeue-UltraLight'
		ctx.fillText(name.toUpperCase(), x, y, 20);
	}
	
	ctx.restore();
}

function setup() {
	zoom = 0.5;
	zoomTarget = 0.0;

	var utils = require('utils.js');
	var rgba = utils.rgba;

	var sq = Math.sqrt(3) / 3;
	
	var d = 100;

	channels = {
		r: new ColorAdjuster('r', rgba(255, 0, 0), {x:0, y:-1 * d}),
		g: new ColorAdjuster('g', rgba(0, 255, 0), {x:-sq * d, y:0}),
		b: new ColorAdjuster('b', rgba(0, 0, 255), {x:sq * d, y:0}),
	}
	
	channels.r.value = Math.random();
	channels.g.value = Math.random();
	channels.b.value = Math.random();
	
	console.log('setup called');

	window.addEventListener('touchstart', ontouchstart);
	window.addEventListener('touchmove', ontouchmove);
	window.addEventListener('touchend', ontouchend);

	window.addEventListener('mousedown', onmousedown);
	window.addEventListener('mouseup', onmouseup);
	window.addEventListener('mousemove', onmousemove);
}

function teardown() {
	delete channels;
	
	console.log('teardown called');
	window.removeEventListener('touchstart', ontouchstart);
	window.removeEventListener('touchmove', ontouchend);
	window.removeEventListener('touchend', ontouchend);

	window.removeEventListener('mousedown', onmousedown);
	window.removeEventListener('mouseup', onmouseup);
	window.removeEventListener('mousemove', onmousemove);
}

function onmousedown(e) {
	hasmoved['mouse'] = false;
	var hasHit = false;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.hitTest(e.x, e.y)) {
			hasHit = true;
			console.log('hit ' + name);
			channel.addTouch('mouse', e.x, e.y);
		}
	}
	if (!hasHit) {
		
	}
	lastTouchPositions['mouse'] = {x:e.x, y:e.y};
}

function onmouseup(e) {
	for (var name in channels) {
		var channel = channels[name];
		channel.removeTouch('mouse');
	}
	if (!hasmoved['mouse']) {
		zoomTarget = zoomTarget < 0.7 ? 1.0 : 0.0;
	}
}

function onmousemove(e) {
	var prev = lastTouchPositions['mouse'];
	hasmoved['mouse'] = true;
	for (var name in channels) {
		var channel = channels[name];
		if (trackingNone) {
			channel.value = channel.value;
		} else {
			channel.updateTouch('mouse', e.x, e.y);
		}
	}
	lastTouchPositions['mouse'] = {x:e.x, y:e.y};
}


function ontouchstart (e) {
	zoomTarget = 1.0;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.hitTest(e.x, e.y)) {
			e.touches.each(function (t) {channel.addTouch(t.identifier, t.clientX, t.clientY)});
		}
	}
}

function ontouchmove (e) {
	updateCentroid(e);
}

function ontouchend (e) {
	zoomTarget = e.touches.length > 0 ? 1 : 0;
}