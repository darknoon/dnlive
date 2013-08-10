
var config = {
	drawLines: 0
};

var hasmoved = {};
var mouseDownness;

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
	var touches = this.touches;
	for (var i in touches) {
		var t = touches[i];
		if (t.id == id) {
			touches.remove(t);
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

	var anyHit = false;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.touches.length > 0) anyHit = true;
	}
	
	mouseDownness = lerp(mouseDownness, anyHit, 0.1);
	
	var zoomScale = 1.0 / (1.0 - clamp(zoom.value, 0.0, 1.0 - 0.001));
	var maxR = w * 0.48 * zoomScale;
	var minR = w * 0.14;
	
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
		fillCircle(x, y, maxR, rgba(channel.color), channel.value);
	
		var innerR = lerp(minR, maxR, channel.ringPosition.value)
		innerR = clamp(innerR, 0.1, 1.1 * maxR);
		strokeCircle(x, y, innerR, rgba(channel.color), 0.8);
	});
	
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.font = '20pt HelveticaNeue-UltraLight'
	eachChannelDraw(function (channel, x, y, hit) {

		var bstart = 0.5;
		var bend = 0.75;
	
		var v = channel.ringPosition.value;
		
		var brightness = clamp( 1/(bend-bstart) * v - bstart );
		ctx.fillStyle = 'white';rgba(255 * clamp(v))
		
		var valueName = clamp(Math.floor(channel.value * 100), 0, 100);
		
		ctx.fillText(channel.name.toUpperCase() + valueName, x, y, 100);
	});
	
	ctx.fillStyle = 'white'
	ctx.globalAlpha = zoom.value
	ctx.fillText("blah", 0, 45, 120);
	
	// Update channels
	for (var name in channels) {
		channels[name].update(t, dt);
	}

	ctx.restore();
}

function setup() {
	zoom = new Bouncy();
	
	zoom.target = 0
	zoom.velocity = 0.4
	zoom.damping = 0.8
	zoom.tension = 43
	
	var utils = require('utils.js');
	var rgba = utils.rgba;

	var sq = Math.sqrt(3) / 3;
	
	var d = 180;

	channels = {
		r: new ColorAdjuster('r', {x:0, y:-1/2 * d}),
		g: new ColorAdjuster('g', {x:-sq * d, y:1/2 * d}),
		b: new ColorAdjuster('b', {x:sq * d, y:1/2 * d}),
	}
	
	channels.r.color = {r:255, g:0, b:0, a:1}
	channels.g.color = {r:0, g:255, b:0, a:1}
	channels.b.color = {r:0, g:0, b:255, a:1}
	
	channels.r.value = Math.random();
	channels.g.value = Math.random();
	channels.b.value = Math.random();
	
	console.log('setup called');

}

function teardown() {
	delete channels;
	
	console.log('teardown called');
}



function onmousedown(e) {
	var utils = require('utils.js');

	console.log(utils.describe(e))
	
	hasmoved['mouse'] = false;
	for (var name in channels) {
		var channel = channels[name];
		if (channel.hitTest(e.x, e.y)) {
			console.log('hit ' + name);
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
	
	console.log('touch start :' + utils.describe(e.touches[0]) )

	for (var name in channels) {
		var channel = channels[name];
		each(e.touches, function (i, t) {
			if (channel.hitTest(t.clientX, t.clientX)) {
				console.log('hit ' + name);
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
		each(e.touches, function (i, t) {
			hasmoved[t.identifier] = true;
			channel.updateTouch(t.identifier, t.clientX, t.clientY);
		});
	}
}

function ontouchend (e) {
	var utils = require('utils.js');
	var each = utils.each;
		
	each(channels, function(name, channel) {
		each(e.touches, function (i, t) {
			channel.removeTouch(t.identifier);
		});
	});	
}