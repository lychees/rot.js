var Game = {
    display: null,
    map: {},
    color: {},
    shadow: {},
    width: 0,
    height: 0,
    camera_x: 0,
    camera_y: 0,
    offset_x: 0,
    offset_y: 0,
    engine: null,
    player: null,
    pedro: null,
    ananas: null,
    
    init: function() {
        
        this.display = new ROT.Display({
        	width: 32,
        	height: 16,
        	fontSize: 20,
            space: 1.1,
            fontFamily: "Helvetica",
        });

        document.body.appendChild(this.display.getContainer());
        
        this._generateMap();
        
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        scheduler.add(this.pedro, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
    },

    _adjustCamera() {
    	const o = this.display.getOptions();
        const w = o.width;
        const h = o.height;
    	
    	if (this.camera_x - this.offset_x < 0) this.offset_x += this.camera_x - this.offset_x;    	
    	else if (this.width - this.camera_x + this.offset_x < w) this.offset_x -= (this.width - this.camera_x + this.offset_x) - w + 1;
    	
    	if (this.camera_y - this.offset_y < 0) this.offset_y += this.camera_y - this.offset_y;
    	else if (this.height - this.camera_y + this.offset_y < h) this.offset_y -= (this.height - this.camera_y + this.offset_y) - h + 1;
    },

    _zoomCamera() {

    },

    _moveCamera: function(dx, dy) {        
    	this.camera_x += dx; this.camera_y += dy;
        let o = this.display.getOptions();
        let w = o.width, h = o.height; 
        let ww = Math.floor(w/2);
        let hh = Math.floor(h/2);

        // console.log(dx, this.camera_x, ww);

        if (dx > 0 && this.camera_x < ww || dx < 0 && this.camera_x > this.width - ww) {
        	this.offset_x += dx; 
        } else if (dy > 0 && this.camera_y < hh || dy < 0 && this.camera_y > this.height - hh){
        	this.offset_y += dy;
        } else {
        	this._adjustCamera();	
        }
    },

    _generateMap: function() {    	
    	this.width = 64;
    	this.height = 32;
        var digger = new ROT.Map.Digger(this.width, this.height);
        //var digger = new ROT.Map.Arena(this.width, this.height); 
        var freeCells = [];
        
        var digCallback = function(x, y, value) {
            if (value) { return; }            
            var key = x+","+y;
            this.map[key] = " ";
            freeCells.push(key);
        }
        digger.create(digCallback.bind(this));
        
        this._generateBoxes(freeCells);
                
        this.player = this._createBeing(Player, freeCells);               
        this.pedro = this._createBeing(Pedro, freeCells);                
        let o = this.display.getOptions();
        let w = o.width;
        let h = o.height;        
		
		this.camera_x = this.player._x;
        this.camera_y = this.player._y;
        this.offset_x = Math.floor(w/2);
        this.offset_y = Math.floor(h/2);
        this._adjustCamera();
        this._drawWholeMap();
    },
    
    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);        
        return new what(x, y);
    },
    
    _generateBoxes: function(freeCells) {
        for (var i=0;i<5;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this.map[key] = "箱";
            this.color[key] = "#cc0";
            if (!i) { this.ananas = key; } /* first box contains an ananas */
        }
    },

    _drawWholeMap: function() {
        let o = this.display.getOptions();
        let w = o.width;
        let h = o.height; 

        /* input callback */
        function lightPasses(x, y) {
            var key = x+","+y;
            if (key in data) { return (data[key] == 0); }
            return false;
        }

        var fov = new ROT.FOV.PreciseShadowcasting(function(x, y){
            const key = x+','+y; 
            if (!Game.map[key]) return false;
            return true;
        });

        /* output callback */
        fov.compute(this.player._x, this.player._y, 25, function(x, y, r, visibility) {
            //var ch = (r ? "" : "@");
            //var color = (data[x+","+y] ? "#aa0": "#660");
            //display.draw(x, y, ch, "#fff", color);
            const key = x+','+y;   
            Game.shadow[key] = "#fff";
        });        
  	
        for (let x=0;x<w;++x) {
        	for (let y=0;y<h;++y) {



        		let xx = x + this.camera_x - this.offset_x;
        		let yy = y + this.camera_y - this.offset_y;
        		let key = xx+','+yy;   
                let bg = this.shadow[key]; if (!bg) {
                    this.display.draw(x, y, null);
                    continue;
                }
                let c = this.map[key];                
                if (c === "箱") {
                    if (bg === '#555') {
                        if (this.shadow[key] === '#fff') {
                            this.display.draw(x, y, c, this.color[key]);
                        } else {
                            const cc = this.color[key] === '#cc0' ? '#440' : '#111';
                            this.display.draw(x, y, c, cc);
                        }
                    } else {
                        this.display.draw(x, y, c, this.color[key]);
                    }
                } else {
                    if (!c) c = "啊";      
                    if (bg === '#555') {
                        this.display.draw(x, y, c, '#555');
                    } else {
                        this.display.draw(x, y, c, '#fff');
                    }              
                }
        	}
        }
        if (this.player) this.player._draw();
        if (this.pedro) this.pedro._draw();

        fov.compute(this.player._x, this.player._y, 25, function(x, y, r, visibility) {            
            const key = x+','+y;   
            Game.shadow[key] = '#555';
        }); 
    }
};

var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
}
    
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == 13 || code == 32) {
        this._checkBox();
        return;
    }

    var keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    /* one of numpad directions? */
    if (!(code in keyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];

    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) { return; }

    this._x = newX;
    this._y = newY;
    Game._moveCamera(dir[0], dir[1]);
    Game._drawWholeMap();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

Player.prototype._draw = function() {    
    Game.display.draw(this._x - Game.camera_x + Game.offset_x, this._y - Game.camera_y + Game.offset_y, "伊", "#0be");
}
    
Player.prototype._checkBox = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key] != "箱") {
        alert("這裡沒有箱子。");
    } else if (key == Game.ananas) {
        alert("你得到了寶石，贏得了遊戲！");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
    } else {
        if (Game.color[key] === "#cc0") {
            alert("箱子空空如也。");
            Game.color[key] = '#333';
        }
    }
}
    
var Pedro = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
}
    
Pedro.prototype.getSpeed = function() { return 100; }
    
Pedro.prototype.act = function() {
    var x = Game.player.getX();
    var y = Game.player.getY();
 

    var passableCallback = function(x, y) {
        return (x+","+y in Game.map);
    }
    var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    }
    astar.compute(this._x, this._y, pathCallback);

    path.shift();
    console.log(path); // ???
    if (!path || path.length === 0) {
        alert("遊戲結束，你被活捉了！");
        Game.engine.lock();        
    } else {
        x = path[0][0];
        y = path[0][1];
        //Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = x;
        this._y = y;
        //this._draw();
        Game._drawWholeMap();
    }
}
    
Pedro.prototype._draw = function() {
    const key = this._x+','+this._y;
    let bg = Game.shadow[key]; if (bg !== '#fff') return;
    Game.display.draw(this._x - Game.camera_x + Game.offset_x, this._y - Game.camera_y + Game.offset_y, "衛", "red");
}    


Game.init();

