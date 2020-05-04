class Camera {

    constructor(x, y, ox, oy) {        
        this.x = x; this.y = y;                
        this.ox = ox; this.oy = oy;
    }

    adjustCamera() {
    	const o = Game.display.getOptions();
        const w = o.width, h = o.height;
    	
    	if (this.x - this.ox < 0) this.ox += this.x - this.ox;    	
    	else if (Game.width - this.x + this.ox < w) this.ox -= (Game.width - this.x + this.ox) - w + 1;
    	
    	if (this.y - this.oy < 0) this.oy += this.y - this.oy;
    	else if (Game.height - this.y + this.oy < h) this.oy -= (this.height - this.y + this.oy) - h + 1;
    }

    zoomCamera() {

    }

    moveCamera(dx, dy) {        
    	this.x += dx; this.y += dy;
        const o = Game.display.getOptions();
        const w = o.width, h = o.height;
        const ww = Math.floor(w/2);
        const hh = Math.floor(h/2);

        if (dx > 0 && this.x < ww || dx < 0 && this.x > this.width - ww) {
        	this.ox += dx; 
        } else if (dy > 0 && this.y < hh || dy < 0 && this.y > this.height - hh){
        	this.oy += dy;
        } else {
        	this.adjustCamera();	
        }
    }
}



var Game = {
    display: null,
    map: {},
    color: {},
    shadow: {},
    width: 0,
    height: 0,
    camera: null,
    engine: null,
    player: null,
    pedro: null,
    ananas: null,
    logs: [],
    
    init: function() {
        
        this.display = new ROT.Display({
        	width: 64,
        	height: 16,
        	fontSize: 20,
            space: 1.1,
            fontFamily: "Helvetica",
        });

        this.status_display = new ROT.Display({
            width: 20,
            height: 16,
            fontSize: 20,
            space: 1.1,
            fontFamily: "Helvetica",
        });

        this.logs_display = new ROT.Display({
            width: 64,
            height: 4,
            fontSize: 20,
            space: 1.1,
            fontFamily: "Helvetica",
        });

        document.body.appendChild(this.display.getContainer());
        document.body.appendChild(this.status_display.getContainer());
        document.body.appendChild(this.logs_display.getContainer());
                
        this._generateMap();
        
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        scheduler.add(this.pedro, true);
        
        this.engine = new ROT.Engine(scheduler);
        this.engine.start();        
        this.drawStatus();
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

        this.camera = new Camera(this.player.x, this.player.y, Math.floor(w/2), Math.floor(h/2));        
        this.camera.adjustCamera();
        this._drawWholeMap();
    },
    
    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);      
        return new what(x, y, 7, 10, 5, 1, 0);
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
        fov.compute(this.player.x, this.player.y, 25, function(x, y, r, visibility) {
            //var ch = (r ? "" : "@");
            //var color = (data[x+","+y] ? "#aa0": "#660");
            //display.draw(x, y, ch, "#fff", color);
            const key = x+','+y;   
            Game.shadow[key] = "#fff";
        });        
  	
        for (let x=0;x<w;++x) {
        	for (let y=0;y<h;++y) {
        		let xx = x + this.camera.x - this.camera.ox;
        		let yy = y + this.camera.y - this.camera.oy;
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
        if (this.player) this.player.draw();
        if (this.pedro) this.pedro._draw();

        fov.compute(this.player.x, this.player.y, 25, function(x, y, r, visibility) {            
            const key = x+','+y;   
            Game.shadow[key] = '#555';
        }); 

        this.drawStatus();
    },

    drawStatus() {
        this.status_display.drawText(0, 0, "伊莎貝拉");
        this.status_display.drawText(0, 1, ROT.Util.format("生命 %s/%s", this.player.hp, this.player.HP));
        this.status_display.drawText(0, 2, ROT.Util.format("魔力 %s/%s", this.player.mp, this.player.MP));        
        this.status_display.drawText(0, 3, ROT.Util.format("速 %s\n", this.player.speed));
        this.status_display.drawText(0, 4, ROT.Util.format("攻 %s\n", this.player.ap));
        this.status_display.drawText(0, 5, ROT.Util.format("防 %s\n", this.player.dp));
    }
};


class Being {
    constructor(x, y, speed, hp, mp, ap, dp) {
        this.ch = '生'; this.color = '#fff';
        this.x = x; this.y = y;
        this._speed = speed; this.speed = speed;
        this._HP = hp; this.HP = hp; this.hp = hp;
        this._MP = mp; this.MP = mp; this.mp = mp;
        this._ap = this.ap = ap;
        this._dp = this.dp = dp;        
    }
    dead() {
        this.ch = '死'; this.color = '#222';
    }
    draw() {
        Game.display.draw(this.x - Game.camera.x + Game.camera.ox, this.y - Game.camera.y + Game.camera.oy, this.ch, this.color);
    }
}

class Player extends Being {
    constructor(x, y, speed, hp, mp, ap, dp) {
        super(x, y, speed, hp, mp, ap, dp);
        this.ch = "伊"; this.color = "#0be";
    }
    act() {
        Game.engine.lock();
        window.addEventListener("keydown", this);
    }
    handleEvent(e) {        
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
        var newX = this.x + dir[0];
        var newY = this.y + dir[1];

        var newKey = newX + "," + newY;
        if (!(newKey in Game.map)) { return; }

        if (Game.pedro._x === newX && Game.pedro._y === newY) {
            
        } else {
            this.x = newX;
            this.y = newY;
            Game.camera.moveCamera(dir[0], dir[1]);
            Game._drawWholeMap();    
        }

        
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
    }
    _checkBox() {
        var key = this.x + "," + this.y;
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
}
    
var Pedro = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
}
    
Pedro.prototype.getSpeed = function() { return 100; }
    
Pedro.prototype.act = function() {
    var x = Game.player.x;
    var y = Game.player.y;
 
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
    } else if (path.length === 1) {
        alert("啊！");
        Game.player.hp -= 1;
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
    Game.display.draw(this._x - Game.camera.x + Game.camera.ox, this._y - Game.camera.y + Game.camera.oy, "衛", "red");
}    

Game.init();

