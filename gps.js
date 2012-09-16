EARTH_R = 6371000;
function startWatch() {
	if(navigator.geolocation) {
		var watchId = navigator.geolocation.watchPosition(function(pos) {
			latitude =			pos.coords.latitude;
			longitude =			pos.coords.longitude;
			accuracy =			pos.coords.accuracy;
			altitude =			pos.coords.altitude;
			altitudeAccuracy =	pos.coords.altitudeAccuracy;
			realcompass =		pos.coords.heading;
			realspeed =			pos.coords.speed;
			timestamp =			pos.timestamp;
			
			var _accuracy =	""+((typeof accuracy != "undefined" && accuracy != null) ? accuracy+"m" : "?");
			var _altitude =	""+((typeof altitude != "undefined" && altitude != null) ? altitude + ((typeof altitudeAccuracy != "undefined" && altitudeAccuracy != null) ? " ± "+altitudeAccuracy+"m" : "m") : "?");
			var _compass =	""+((typeof compass != "undefined" && compass != null) ? compass+"°" : "?");
			document.getElementById("prec").innerHTML =		_accuracy;
			document.getElementById("alt").innerHTML =		_altitude;
			document.getElementById("angle").innerHTML =	_compass;
			
			Navigator.addPoint(pos.coords.longitude, -pos.coords.latitude, pos.coords.accuracy);
		},
		function(error) {
			switch(error.code) {
				case error.PERMISSION_DENIED:
					alert("You must accept geolocalisation on your navigator.");
					break;
				case error.POSITION_UNAVAILABLE:
					alert("Your location cannot be determined.");
					break;
				case error.TIMEOUT:
					alert("Timeout error.");
					break;
				default:
					alert("Unknown error.");
			}
		},
		{enableHighAccuracy:true, timeout:30000, maximumAge:1000});
	}
	else
		alert("Your navigator does not support HTML5 geolocalisation.");
}

function stopWatch() {
	navigator.geolocation.clearWatch(watchId);
}

function format_meters(m) {
	if(m > 1000)
		return (Math.round(m)/1000)+"km";
	else
		return (Math.round(m*10)/10)+"m";
}

function deg2rad(a) {
	return (a/180)*Math.PI;
}

function rad2deg(a) {
	return (a*180)/Math.PI;
}

function deg2m(a) {
	return 2*Math.sin(a/2)*EARTH_R;
}

function mps2kmps(v) {
	return v*3.6;
}

Navigator = {
	canvas: null,
	ctx: null,
	
	width: null,
	height: null,
	
	firstX: null,
	firstY: null,
	
	leftest: null,
	rightest: null,
	topest: null,
	bottomest: null,
	
	myspeed: 0,
	mycompass: 0,
	
	trace: [],
	
	totalLength: 0,
	
	fac: 0,
	angle_fac: 1,
	
	init: function() {
		this.canvas = document.getElementById("canvas");
		this.ctx = this.canvas.getContext("2d");
		
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		
		this.fac = this.height;
	},
	
	addPoint: function(x, y, accuracy) {
		var coord = {x:deg2rad(x), y:deg2rad(y), time:+(new Date)};
		this.drawPath(this.calc(coord), accuracy);
	},
	
	calc: function(coord) {
		var width = this.width;
		var height = this.height;
		var fac = this.fac;
		var ctx = this.ctx;
		var path = [];
		
		var trace = this.trace;
		
		if(trace.length > 0 && trace[trace.length-1].x == coord.x && trace[trace.length-1].y == coord.y)
			return "DO_NOTHING";

		this.trace.push(coord);
		
		// On update les extrèmes
		if(this.leftest == null || coord.x < this.leftest)
			this.leftest = coord.x;
		if(this.rightest == null || coord.x > this.rightest)
			this.rightest = coord.x;
		if(this.topest == null || coord.y < this.topest)
			this.topest = coord.y;
		if(this.bottomest == null || coord.y > this.bottomest)
			this.bottomest = coord.y;
		
		// Centre du path
		var centerX = (this.leftest + this.rightest)/2;
		var centerY = (this.topest + this.bottomest)/2;
		
		var _this = this;
		
		// Calcule de la longueur
		if(trace.length >= 2) {
			var x1 = trace[trace.length-2].x;
			var y1 = trace[trace.length-2].y;
			var x2 = trace[trace.length-1].x;
			var y2 = trace[trace.length-1].y;
			var dx = x2-x1;
			var dy = y2-y1;
			var adx = Math.abs(dx);
			var ady = Math.abs(dy);
			var lastLength = Math.sqrt(adx*adx+ady*ady);
			this.totalLength += lastLength;
			
			// calcul de la vitesse
			if(typeof realspeed == "undefined" || realspeed == null) {
				var dt = (trace[trace.length-1].time-trace[trace.length-2].time)/1000;
				this.myspeed = deg2m(lastLength)/dt;
			}
			
			// calcul de la boussole
			if(typeof realcompass == "undefined" || realcompass == null) {
				var angle = Math.atan(dy/dx);
				if(dx < 0)
					angle += Math.PI;
				angle += Math.PI/2;
				this.angle_fac = -Math.cos(4*angle)*(Math.SQRT2-1)/2+(Math.SQRT2+1)/2;
				this.mycompass = rad2deg(angle);
				// this.mycompass = 0; // Enable/Disable mycompass
			}
		}
		
		// calcul des coords (world->canvas)
		for(var i in trace) {
			var x = trace[i].x;
			var y = trace[i].y;
			
			// recentrement
			x -= centerX;
			y -= centerY;
			
			// scale
			neededFacW = ((width/this.angle_fac)-40)/(this.rightest-this.leftest);
			neededFacH = ((height/this.angle_fac)-40)/(this.bottomest-this.topest);
			console.log(this.angle_fac);
			
			fac = (neededFacW < neededFacH) ? neededFacW : neededFacH;
			
			x *= fac;
			y *= fac;
			
			_this.fac = fac;
			
			path.push({x:x,y:y});
		}
		return path;
	},
	
	drawPath: function(path, accuracy) {
		if(path == "DO_NOTHING")
			return;
		var ctx = this.ctx;
		var width = this.width;
		var height = this.height;
		var r = EARTH_R;
		
		if(path.length < 2) {
			ctx.clearRect(0,0,width,height);
			ctx.save();
				ctx.font = "28px Arial";
				ctx.textAlign = "center";
				ctx.fillStyle = "#cccccc";
				ctx.fillText("Waiting for some data... ["+path.length+"/2]", width/2, height/2);
			ctx.restore();
		}
		else {
			var acc_r = Math.asin((accuracy/2)/r)*this.fac;
			if(acc_r == "Infinity")
				acc_r = 0;
			ctx.clearRect(0, 0, width, height);
			
			ctx.save();
				ctx.translate(width/2, height/2);
				// Boussole
				if(typeof realcompass != "undefined" && realcompass != null)
					compass = realcompass;
				else
					compass = this.mycompass;
				ctx.rotate(-deg2rad(compass));
				
				// Grille
				ctx.strokeStyle = "rgba(50, 140, 56, 0.3)";
				var squareSize = width/deg2m(width/this.fac);
				
				while(squareSize < 20)
					squareSize *= 10;
				var numSquare = (width*(1+Math.SQRT2))/squareSize;
				
				for(var i=0; i<numSquare; i++) {
					ctx.beginPath();
					ctx.moveTo(-width*Math.SQRT2+squareSize*i, -width*Math.SQRT2);
					ctx.lineTo(-width*Math.SQRT2+squareSize*i, width*(1+Math.SQRT2));
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(-width*Math.SQRT2, -width*Math.SQRT2+squareSize*i);
					ctx.lineTo(width*(1+Math.SQRT2), -width*Math.SQRT2+squareSize*i);
					ctx.stroke();
				}
								
				ctx.strokeStyle = "#328c2e";
				
				ctx.beginPath();
				for(var i in path) {
					if(i == 0)
						ctx.moveTo(path[i].x, path[i].y);
					else
						ctx.lineTo(path[i].x, path[i].y);
				}
				
				ctx.stroke();

				ctx.beginPath();
				ctx.strokeStyle = "#cccccc";
				ctx.fillStyle = "rgba(204,204,204,0.1)";
				ctx.arc(path[path.length-1].x, path[path.length-1].y, acc_r, 0, Math.PI*2, true);
				ctx.fill();
				ctx.stroke();
				
				ctx.beginPath();
				ctx.fillStyle = "rgba(255,0,0,1)";
				ctx.arc(path[path.length-1].x, path[path.length-1].y, 3, 0, Math.PI*2, true);
				ctx.fill();
			ctx.restore();
			
			this.drawInterface();
		}
	},
	drawInterface: function() {
		var ctx = this.ctx;
		var width = this.width;
		var height = this.height;
		
		var ladder = deg2m(width/this.fac); // C'est l'échelle quoi!
		
		// Latitude Longitude Altitude
		ctx.save();
			ctx.font = "28px Arial";
			ctx.textAlign = "right";
			ctx.fillStyle = "#cccccc";
			if(typeof altitude == "undefined" || altitude == null)
				printalt = " ?";
			else
				printalt = Math.round(altitude)+"m";
			ctx.fillText("Lat:"+Math.round(latitude*1000)/1000+"° Long:"+Math.round(longitude*1000)/1000+"° Alt:"+printalt, width-20, 40);
		ctx.restore();
		
		// Échelle
		ctx.save();
			ctx.font = "28px Arial";
			ctx.textAlign = "left";
			ctx.fillStyle = "#cccccc";
			ctx.fillText("← "+format_meters(ladder)+" →", 40, height-20);
		ctx.restore();
		
		// Distance parcourue
		ctx.save();
			ctx.font = "28px Arial";
			ctx.textAlign = "left";
			ctx.fillStyle = "#cccccc";
			ctx.fillText("~ "+format_meters(deg2m(this.totalLength)), 40, height-50);
		ctx.restore();
		
		// Nord
		ctx.save();
			ctx.translate(50, 50);
			if(typeof realcompass != "undefined" && realcompass != null)
				compass = realcompass;
			else
				compass = this.mycompass;
			ctx.rotate(-deg2rad(compass));
			ctx.font = "32px Arial";
			ctx.textAlign = "center";
			ctx.fillStyle = "#cccccc";
			ctx.fillText("↑", 0, -10);
			ctx.fillText("N", 0, 30);
		ctx.restore();
		
		// Vitesse
		if(typeof realspeed == "undefined" || realspeed == null)
			speed = this.myspeed;
		else
			speed = this.realspeed;
		if(typeof maxSpeed == "undefined" || maxSpeed == null)
			maxSpeed = 0.01;
			
		// to km/h
		speed = Math.round(speed*3.6*10)/10;
		
		if(speed > maxSpeed)
			maxSpeed = speed;
		var a = (speed/maxSpeed)*Math.PI;

		ctx.save();
			ctx.fillStyle = "#cccccc";

			ctx.translate(width-120, height-26);
			ctx.save();
				ctx.rotate(a);

				ctx.beginPath();
				ctx.arc(-60, 0, 6, -Math.PI/2, Math.PI/2, false);
				ctx.lineTo(-110, 0);
				ctx.closePath();

				ctx.fill();
			ctx.restore();
			
			ctx.textAlign = "end";
			ctx.font = "24px Arial";
			ctx.fillText(speed, 0, 6);
			ctx.textAlign = "start";
			ctx.font = "20px Arial";
			ctx.fillText("km/h", 1, 6);
		ctx.restore();
	}
};

function googleMaps() {
	document.location = "http://maps.google.com/maps?q="+latitude+","+longitude+"&ll="+latitude+","+longitude;
}

function showLastUp() {
	if(typeof timestamp == "undefined" || timestamp == null)
		return "Never";
	else {
		var t = Math.round(((new Date).getTime()-timestamp)/1000);
		if(t < 60)
			return t+" second"+((t>1)?"s":"")+" ago";
		else if(t < 3600)
			return Math.floor(t/60)+" minute"+((Math.floor(t/60)>1)?"s":"")+" and "+(t%60)+" second"+((t%60>1)?"s":"")+" ago";
		else
			return Math.floor(t/3600)+" hour"+((Math.floor(t/3600)>1)?"s":"")+" and "+Math.floor((t%3600)/60)+" minute"+((Math.floor((t%3600)/60)>1)?"s":"")+" ago";
	}
}

setInterval(function() {
	document.getElementById("time").innerHTML = showLastUp();
}, 500);
