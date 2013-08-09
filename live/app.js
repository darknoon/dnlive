
var config = {
	drawLines: 0
};

var hasmoved = {};
var mouseDownness;

var lastTouchPositions = {};
var trackingNone = false;

function ColorAdjuster(name, color, strokeColor, location) {
	this.value = 1;
	this.name = name;
	this.color = color;
	this.strokeColor = strokeColor;
	this.location = location;
	this.touches = [];
	
	return this;
}

ColorAdjuster.prototype.hitTest = function (x,y) {
	var w = canvas.width;
	var h = canvas.height;
	var maxR = w / 2.5 / (1.0 - zoom.value);
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
	
	this.value = this.touches.length > 0 ? this.value : clamp(this.value, 0,1);
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
	
	this.damping = 0.99
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
	
	var maxR = w * 0.55 / (1.0 - zoom.value);
	var minR = w * 0.1;
	
	for (var name in channels) {
		var channel = channels[name];
		channel.update(t, dt);
	}
	
	ctx.globalCompositeOperation = 'lighter';
	// Draw circles
	for (var name in channels) {
		var channel = channels[name];
		var hit = channel.touches.length > 0;

		ctx.fillStyle = channel.color
		
		var x = channel.location.x / (1.0 - zoom.value);
		var y = channel.location.y / (1.0 - zoom.value);

		ctx.beginPath();
		ctx.arc(x, y, maxR, 0, 2*Math.PI);
		ctx.closePath();
			
		ctx.globalAlpha = channel.value;
		ctx.fill();
		
		var innerR = hit ? clamp( lerp(minR, maxR, channel.value), minR, maxR) : minR;
		ctx.beginPath();
		ctx.arc(x, y, innerR, 0, 2*Math.PI);
		ctx.closePath();

		ctx.globalAlpha = 1.0;
		ctx.fill();
	}

	ctx.globalCompositeOperation = 'source-over';	
	ctx.globalAlpha = 1;
	
	// Draw light rings
	ctx.globalAlpha = 1;
	if (config.drawLines) {
		for (var name in channels) {
			var channel = channels[name];
			var hit = channel.touches.length > 0;
			var x = channel.location.x / (1.0 - zoom.value);
			var y = channel.location.y / (1.0 - zoom.value);
			var r = clamp( lerp(minR, maxR, channel.value), minR, maxR);


			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2*Math.PI);
			ctx.closePath();

			ctx.lineWidth = 1;
			ctx.strokeStyle = 'white'
	//		ctx.strokeStyle = channel.strokeColor
			ctx.globalAlpha = hit ? 1.0 : 0.01 * (1 - zoom.value);
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;
	
	for (var name in channels) {
		var channel = channels[name];
		var hit = channel.touches.length > 0;
		var x = channel.location.x / (1.0 - zoom.value);
		var y = channel.location.y / (1.0 - zoom.value);
	
		ctx.fillStyle = channel.value < 0.75 ? 'white' : 'black';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.font = '20pt HelveticaNeue-UltraLight'
		ctx.fillText(name.toUpperCase(), x, y, 20);
	}
	
	
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
	zoom.damping = 0.98
	zoom.tension = 43
	
	var o = {a:null};
	(function () {
	with (o) {
		a = 'p';
	}
	})();
	console.log("a : " + o.a);

	var utils = require('utils.js');
	var rgba = utils.rgba;

	var sq = Math.sqrt(3) / 3;
	
	var d = 180;

	channels = {
		r: new ColorAdjuster('r', rgba(255, 0, 0), rgba(255, 100, 20), {x:0, y:-1/2 * d}),
		g: new ColorAdjuster('g', rgba(0, 255, 0), rgba(40, 255, 0), {x:-sq * d, y:1/2 * d}),
		b: new ColorAdjuster('b', rgba(0, 0, 255), rgba(255, 255, 255), {x:sq * d, y:1/2 * d}),
	}
	
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