
var config = {
	drawLines: 0
};

var hasmoved = {};

var lastTouchPositions = {};
var trackingNone = false;

function ColorAdjuster(name, location) {
	this.value = 1
	this.name = name
	this.color = {r:255, g:255, b:255}
	this.strokeColor = {r:1, g:1, b:1}
	this.location = location
	this.touches = []
	
	this.ringPosition = new Bouncy();
	this.ringPosition.tension = 120
	this.ringPosition.damping = .8
	this.ringPosition.velocity = -1
	this.ringPosition.target = 0
	
	return this;
}

ColorAdjuster.prototype.hitTest = function (x,y) {
	var w = canvas.width;
	var h = canvas.height;

	var utils = require('utils.js');
	var lerp = utils.lerp;
	var clamp = utils.clamp;
	var rgba = utils.rgba;
	
	var zoomScale = 1.0 / (1.0 - clamp(zoom.value, 0.0, 1.0 - 0.001));
	var maxR = w * 0.48 * zoomScale;

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
	var utils = require('utils.js');
	var lerp = utils.lerp;
	var clamp = utils.clamp;
	
	var hit = this.touches.length > 0;
	
	this.ringPosition.target = hit ? this.value : 0
	
	this.value = hit ? this.value : clamp(this.value, 0,1);
	
	this.ringPosition.update(dt);
}

ColorAdjuster.prototype.removeTouch = function (id, x, y) {
	var utils = require('utils.js');
	
	var touches = this.touches;
	for (var i in touches) {
		var t = touches[i];
		if (t.id == id) {
			remove(touches, t);
		}
	}
}

function Bouncy() {
	this.value = 0
	this.velocity = 0
	this.target = 0
	
	this.damping = 0.95
	this.tension = 30
}

Bouncy.prototype.update = function(dt) {
	var value = this.value;
	var velocity = this.velocity;
	var target = this.target;
	
	velocity += this.tension * dt * (target - value);
	velocity *= this.damping;
	value += dt * velocity;
	
	this.value = value;
	this.velocity = velocity;
}

function remove(a,v) {
	var i = a.indexOf(v);
	if (i == -1) return;
	return a.splice(i,1);
}


function update (t, dt) {
	var utils = require('utils.js');
	var lerp = utils.lerp;
	var clamp = utils.clamp;
	var rgba = utils.rgba;
	
	zoom.update(dt);
	
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
	
	var zoomScale = 1.0 / (1.0 - clamp(zoom.value, 0.0, 1.0 - 0.001));
	var maxR = w * 0.48 * zoomScale;
	var minR = w * 0.113;
	
	for (var name in channels) {
		var channel = channels[name];
		channel.update(t, dt);
	}
	
	function fillCircle(x, y, r, color, alpha, compositeOp) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2*Math.PI);
		ctx.closePath();

		ctx.globalCompositeOperation = compositeOp
		ctx.globalAlpha = alpha
		ctx.fillStyle = color
		ctx.fill()
	}


	function strokeCircle(x, y, r, color, alpha, compositeOp) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2*Math.PI);
		ctx.closePath();

		ctx.globalCompositeOperation = compositeOp
		ctx.globalAlpha = alpha
		ctx.strokeStyle = color
		ctx.stroke()
	}
	
	// Helper function to iterate channels and calculate common stuff
	function eachChannelDraw(fn) {
		for (var name in channels) {
			var channel = channels[name];
			var hit = channel.touches.length > 0;
			var x = channel.location.x * zoomScale;
			var y = channel.location.y * zoomScale;
			
			fn(channel, x, y, hit);
		}
	}
	
	ctx.globalCompositeOperation = 'lighter';
	eachChannelDraw(function (channel, x, y, hit) {
		// Draw the circle
		fillCircle(x, y, maxR, rgba(channel.color), channel.value);
	
		// If it's dim, draw an outline
		if (channel.value < 0.1) {
			strokeCircle(x, y, maxR, rgba(channel.color), 0.1);
		}
	
		// Draw the control indicator
		var innerR = lerp(minR, maxR, channel.ringPosition.value)
		innerR = clamp(innerR, 0.1, 1.1 * maxR);
		strokeCircle(x, y, innerR, rgba(channel.color), 0.8);
	});
	
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.font = '28pt HelveticaNeue-UltraLight'
	eachChannelDraw(function (channel, x, y, hit) {

		var v = channel.ringPosition.value;
		
		var brightness = utils.ramp(0.5, 0.75, v);
		ctx.fillStyle = 'white';
		// ctx.fillStyle = rgba(255 * clamp(v))
		
		var valueName = clamp(Math.floor(channel.value * 100), 0, 100);
		ctx.fillText(valueName, x, y, 100);
	});
	
	ctx.fillStyle = 'white'
	ctx.globalAlpha = 0.2 * clamp(1 - 2 * zoom.value * zoom.value)
	ctx.fillText("light", 0, h/2 - 45, 220);
	
	// Update channels
	for (var name in channels) {
		channels[name].update(t, dt);
	}

	ctx.restore();
}

function setup() {
	var canvas = document.getElementById('canvas');
	// This is too slow, except on iPhone 5-class devices
	// canvas.MSAAEnabled = true

	zoom = new Bouncy();
	
	zoom.target = 0
	zoom.velocity = 0.4
	zoom.damping = 0.8
	zoom.tension = 43
	
	var utils = require('utils.js');
	var rgba = utils.rgba;

	var sq = Math.sqrt(3);
	
	var d = 110;

	channels = {
		r: new ColorAdjuster('r', {x: 0,        y:-d  }),
		g: new ColorAdjuster('g', {x:-sq * d/2, y: d/2}),
		b: new ColorAdjuster('b', {x: sq * d/2, y: d/2}),
	}
	
	channels.r.color = {r:255, g:0,   b:0,   a:1}
	channels.g.color = {r:0,   g:255, b:0,   a:1}
	channels.b.color = {r:0,   g:0,   b:255, a:1}
	
	channels.r.value = Math.random();
	channels.g.value = Math.random();
	channels.b.value = Math.random();	
}

function teardown() {
	delete channels;
}



function onmousedown(e) {
	var utils = require('utils.js');

	hasmoved['mouse'] = false;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.hitTest(e.x, e.y)) {
			channel.addTouch('mouse', e.x, e.y);
		}
	}
	lastTouchPositions['mouse'] = {x:e.x, y:e.y};
}

function onmouseup(e) {
	for (var name in channels) {
		var channel = channels[name];
		channel.removeTouch('mouse');
	}
	if (!hasmoved['mouse']) {
		zoom.target = zoom.target < 0.7 ? 1.0 : 0.0;
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
	var utils = require('utils.js');
	var each = utils.each;
		
	for (var name in channels) {
		var channel = channels[name];
		each(e.changedTouches, function (i, t) {
			if (channel.hitTest(t.clientX, t.clientY)) {
				hasmoved[t.identifier] = false;
				channel.addTouch(t.identifier, t.clientX, t.clientY);
			}
		});
	}
}

function ontouchmove (e) {
	var utils = require('utils.js');
	var each = utils.each;
		
	for (var name in channels) {
		var channel = channels[name];
		each(e.changedTouches, function (i, t) {
			hasmoved[t.identifier] = true;
			channel.updateTouch(t.identifier, t.clientX, t.clientY);
		});
	}
}

function ontouchend (e) {

	var utils = require('utils.js');
	var each = utils.each;
	
	for (var name in channels) {
		var channel = channels[name];
		each(e.changedTouches, function (i, t) {
			channel.removeTouch(t.identifier);
		});
	};	
	
	each(e.changedTouches, function (i, t) {
		if (!hasmoved[t.identifier]) {
			zoom.target = zoom.target < 0.7 ? 1.0 : 0.0;
		}
	});
}