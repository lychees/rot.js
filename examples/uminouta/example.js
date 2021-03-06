MAP_WIDTH = 32;
MAP_HEIGHT = 16;
DISPLAY_FONTSIZE = 20;
DISPLAY_WIDTH = 16 * DISPLAY_FONTSIZE;
DISPLAY_HEIGHT = 8 * DISPLAY_FONTSIZE;

// https://stackoverflow.com/questions/12143544/how-to-multiply-two-colors-in-javascript
function add_shadow(c1, d) {
    if (c1[0] !== '#') {
        return c1;
    }    
    let r = c1.charCodeAt(1); if (r >= 97) r -= 97 - 10; else r -= 48;
    let g = c1.charCodeAt(2); if (g >= 97) g -= 97 - 10; else g -= 48;
    let b = c1.charCodeAt(3); if (b >= 97) b -= 97 - 10; else b -= 48;
    r = Math.floor(r / 2) + 48;
    g = Math.floor(g / 2) + 48;
    b = Math.floor(b / 2) + 48;
    let c2 = '#' + String.fromCharCode(r) + String.fromCharCode(g) + String.fromCharCode(b);    
    return c2;
}

class Camera {

    x = 0; y = 0;
    ox = 0; oy = 0;

    constructor(x, y, ox, oy) {        
        this.x = x; this.y = y;                
        this.ox = ox; this.oy = oy;
    }

    adjust() {
    	const o = Game.map.display.getOptions();
        const w = o.width, h = o.height;
    	
    	if (this.x - this.ox < 0) this.ox += this.x - this.ox;    	
    	else if (Game.map.width - this.x + this.ox < w) this.ox -= (Game.map.width - this.x + this.ox) - w + 1;
    	
    	if (this.y - this.oy < 0) this.oy += this.y - this.oy;
    	else if (Game.map.height - this.y + this.oy < h) this.oy -= (Game.map.height - this.y + this.oy) - h + 1;
    }

    zoom(d) {
        let o = Game.map.display.getOptions();                        
        o.fontSize += d;        
        o.width = Math.floor(DISPLAY_WIDTH / o.fontSize);
        o.height = Math.floor(DISPLAY_HEIGHT / o.fontSize);        
                        
        setTimeout(() => { // Animation?
            Game.map.display.setOptions({
                width: o.width,
        	    height: o.height,
        	    fontSize: o.fontSize,
                space: 1.1,
                fontFamily: "Helvetica",
            });
        }, 1);
    }

    move(dx, dy) {        
    	this.x += dx; this.y += dy;
        const o = Game.map.display.getOptions();
        const w = o.width, h = o.height;
        const ww = Math.floor(w/2);
        const hh = Math.floor(h/2);

        if (dx > 0 && this.x < ww || dx < 0 && this.x > Game.map.width - ww) {
        	this.ox += dx; 
        } else if (dy > 0 && this.y < hh || dy < 0 && this.y > Game.map.height - hh){
        	this.oy += dy;
        } else {
        	this.adjust();	
        }
    }
}

class Map {

    display = null;    
    width = 0; height = 0;    
    ground = {};
    shadow = {};
    boxes = {};
    color = {};
    ananas = null;

    constructor() {
        this.display = new ROT.Display({
        	width: DISPLAY_WIDTH / DISPLAY_FONTSIZE,
        	height: DISPLAY_HEIGHT / DISPLAY_FONTSIZE,
        	fontSize: DISPLAY_FONTSIZE,
            space: 1.1,
            fontFamily: "Helvetica",
        });

    	this.width = MAP_WIDTH;
    	this.height = MAP_HEIGHT;
        //var digger = new ROT.Map.Digger(this.width, this.height);
        var digger = new ROT.Map.Arena(this.width, this.height); 
        
        let freeCells = [];        
        var digCallback = function(x, y, value) {
            if (value) { return; }            
            var key = x+","+y;
            this.ground[key] = " ";
            freeCells.push(key);
        }
        digger.create(digCallback.bind(this));        
        
        this.generateBoxes(freeCells); 
        Game.player = this.createBeing(Player, freeCells);               
        Game.pedro = this.createBeing(Pedro, freeCells);
    }
    
    createBeing(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);      
        return new what(x, y, 7, 10, 5, 1, 0);
    }
    
    generateBoxes(freeCells) {
        for (var i=0;i<3;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]); 
            this.boxes[key] = new Box(x, y);  
            /*this.ground[key] = "箱";
            this.color[key] = "#cc0";
            if (!i) { this.ananas = key; } /* first box contains an ananas
            */
        }
    }
        
    draw() {
        const o = this.display.getOptions(); 
        let w = o.width, h = o.height; 
        
        let fov = new ROT.FOV.PreciseShadowcasting(function(x, y) {
            const key = x+','+y; 
            if (!Game.map.ground[key]) return false; // this.ground?
            return true;
        });

        fov.compute(Game.player.x, Game.player.y, 18, function(x, y, r, visibility) {            
            const key = x+','+y;   
            Game.map.shadow[key] = "#fff"; // this.shadow?
        });

        console.log(w);
        console.log(h);
  	
        for (let x=0;x<w;++x) {
        	for (let y=0;y<h;++y) {
        		let xx = x + Game.camera.x - Game.camera.ox;
        		let yy = y + Game.camera.y - Game.camera.oy;
        		let key = xx+','+yy;   
                let bg = this.shadow[key]; if (!bg) {
                    this.display.draw(x, y, null);
                    continue;
                }
                let c = this.ground[key];

                //console.log(c);
                /*
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
                    */

                if (!c) c = "啊";
                if (this.shadow[key] === '#fff') this.display.draw(x, y, c, '#fff');
                else this.display.draw(x, y, c, add_shadow('#fff'));                
        	}
        }

        for (var key in this.boxes) {  
            this.boxes[key].draw();
        }

        if (Game.player) Game.player.draw();
        if (Game.pedro) Game.pedro.draw();

        fov.compute(Game.player.x, Game.player.y, 25, function(x, y, r, visibility) {
            const key = x+','+y;   
            Game.map.shadow[key] = '#555'; //?
        }); 

        Game.drawStatus();
    }
}

let Game = {
    
    engine: null,
    map: null,
    camera: null,    
    player: null,
    pedro: null,
    ananas: null,
    logs: [],
    
    init: function() {

        this.map = new Map();
                
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

        document.body.appendChild(this.map.display.getContainer());
        document.body.appendChild(this.status_display.getContainer());
        document.body.appendChild(this.logs_display.getContainer());
        
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        scheduler.add(this.pedro, true);
                
        let o = this.map.display.getOptions();
        let w = o.width;
        let h = o.height;

        this.camera = new Camera(this.player.x, this.player.y, Math.floor(w/2), Math.floor(h/2));        
        this.camera.adjust();
        
        
        this.engine = new ROT.Engine(scheduler);        
        this.engine.start();                
        this.draw();
    },


    drawStatus() {
        this.status_display.drawText(0, 0, "伊莎貝拉");
        this.status_display.drawText(0, 1, ROT.Util.format("生命 %s/%s", this.player.hp, this.player.HP));
        this.status_display.drawText(0, 2, ROT.Util.format("魔力 %s/%s", this.player.mp, this.player.MP));        
        this.status_display.drawText(0, 3, ROT.Util.format("速 %s\n", this.player.speed));
        this.status_display.drawText(0, 4, ROT.Util.format("攻 %s\n", this.player.ap));
        this.status_display.drawText(0, 5, ROT.Util.format("防 %s\n", this.player.dp));
    },

    draw() {
        this.map.draw();
        this.drawStatus();
    }
};


class Event {
    x = 0;
    y = 0;    
    constructor(x, y) {
        this.x = x; this.y = y;
    }
    touch() {        
    }
    open() {        
    }
}

class Box extends Event {
    constructor(x, y) {        
        super(x, y);
        this.ch = '箱'; this.color = '#cc0';
    }
    empty() {
        return this.color === '#ddd';
    }
    open() {
        if (!this.empty()) {
            this.color = '#777';
        }
    }
    draw() {
        const key = this.x+','+this.y; let bg = Game.map.shadow[key]; if (!bg) return;
        Game.map.display.draw(this.x - Game.camera.x + Game.camera.ox, this.y - Game.camera.y + Game.camera.oy, this.ch, bg === '#fff' ? this.color : add_shadow(this.color));                            
    }
}

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
        Game.map.display.draw(this.x - Game.camera.x + Game.camera.ox, this.y - Game.camera.y + Game.camera.oy, this.ch, this.color);
    }
}

class Player extends Being {
    constructor(x, y, speed, hp, mp, ap, dp) {
        super(x, y, speed, hp, mp, ap, dp);
        this.ch = "伊"; this.color = "#0be";
    }
    checkBox() {
        var key = this.x + "," + this.y;
        let b = Game.map.boxes[key]
        if (!b) {
            // alert("這裡沒有箱子。");
        } else {
            b.open();
        }                        
            /*else if (key == Game.ananas) {
                alert("你得到了寶石，贏得了遊戲！");
                Game.engine.lock();
                window.removeEventListener("keydown", this);
            } else {
                if (Game.color[key] === "#cc0") {
                    alert("箱子空空如也。");
                    Game.color[key] = '#333';
                }
            }*/
    }
    act() {
        Game.engine.lock();
        window.addEventListener("keydown", this);
    }
    handleEvent(e) {        
        var code = e.keyCode;
        if (code == 13 || code == 32) {
            this.checkBox();
            return;
        }
        if (code == 79) {
            Game.camera.zoom(1);
            return;
        }
        if (code == 80) {
            Game.camera.zoom(-1);
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
        if (!(newKey in Game.map.ground)) { return; }

        if (Game.pedro.x === newX && Game.pedro.y === newY) {
            
        } else {
            this.x = newX; this.y = newY;
            Game.camera.move(dir[0], dir[1]);
            Game.map.draw();
            
        }   
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
    }    
}

class Pedro extends Being {
    constructor(x, y, speed, hp, mp, ap, dp) {
        super(x, y, speed, hp, mp, ap, dp);
        this.ch = "衛"; this.color = "#e00";        
    }
    act() {
        return;
        const x = Game.player.x, y = Game.player.y;
             
        var passableCallback = function(x, y) {
            return (x+","+y in Game.map.ground);
        }
        var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});
    
        var path = [];
        var pathCallback = function(x, y) {
            path.push([x, y]);
        }
        astar.compute(this.x, this.y, pathCallback);
    
        path.shift();
        //console.log(path); // ???
        if (!path || path.length === 0) {        
            //alert("遊戲結束，你被活捉了！");
            //Game.engine.lock();        
        } else if (path.length === 1) {
            alert("啊！");
            Game.player.hp -= 1;
        } else {                    
            this.x = path[0][0]; this.y = path[0][1];            
        }
        Game.draw();
    }

    draw() {
        const key = this.x+','+this.y; let bg = Game.map.shadow[key]; if (bg !== '#fff') return;
        super.draw();
    }
}

Game.init();

