$(document).ready(function() {
    var FOLLOW_DISTANCE = 100;

    // fish class
    var Fish = function(id) {
        this.id = id;
        this.entourage = [];
        
        // dx/yx is current speed, ox/oy is the previous one
        this.ox = this.dx = Math.random() - 0.5;
        this.oy = this.dy = Math.random() - 0.5;

        this.x = canvas.width * Math.random();
        this.y = canvas.height * Math.random();

        Fish.prototype.angleToClosestFish = function(otherFish) {
            otherFish = otherFish == null ? this.following : otherFish;
            if (otherFish) {
                return Math.atan2(otherFish.y - this.y, otherFish.x - this.x);
            }
            else {
                return Number.MAX_VALUE;
            }
        }

        Fish.prototype.angleFromFishDirectionToClosestFish = function(otherFish) {
            otherFish = (otherFish == null) ? this.following : otherFish;
            if (otherFish) {
                return Math.abs(deltaAngle(this.angle, this.angleToClosestFish(otherFish)));
            }
            else {
                return Number.MAX_VALUE;
            }
        }

        Fish.prototype.angleDirectionDifference = function(otherFish) {
            otherFish = (otherFish == null) ? this.following : otherFish;

            if (otherFish) {
                Math.abs(deltaAngle(this.angle, otherFish.angle));
            }
            else {
                return Number.MAX_VALUE;
            }
        }

        // update fish physics
        Fish.prototype.calc = function() {
            this.ox = this.dx;
            this.oy = this.dy;
            var MAX_SPEED = 1.1;
            var maxSpeed = MAX_SPEED;

            // do i need to find another fish buddy?
            if (this.following == null || py(this.x - this.following.x, this.y - this.following.y) > FOLLOW_DISTANCE) {
                if (this.following != null)
                    this.following.entourage.splice(this.following.entourage.indexOf(this));

                this.following = null;

                // attract closer to other fish (find closest)
                var closestDistance = Number.MAX_VALUE;
                var closestFish = null;

                for (var i = 0; i < fishes.length; i++) {
                    var fish = fishes[i];
                    if (fish != this) {
                        var distance = py(this.x - fish.x, this.y - fish.y);
                        // is it closer, within the max distance and within the sector that the fish can see?
                        if (distance < closestDistance && fish.following != this && distance < FOLLOW_DISTANCE && this.angleFromFishDirectionToClosestFish(fish) < Math.PI * 0.25) {
                            closestDistance = distance;
                            closestFish = fish;
                        }
                    }
                }
                if (closestFish != null) {
                    this.following = closestFish;
                    closestFish.entourage.push(this);
                }
            }

            // fish is following another
            if (this.following != null) {
                // go closer to other fish
                this.followingDistance = py(this.x - this.following.x, this.y - this.following.y);
                this.distanceFactor = 1 - this.followingDistance / FOLLOW_DISTANCE;

                // if going head on just break a little before following
                if (this.angleDirectionDifference() > (Math.PI * 0.9) && // on colliding angle?
                    this.angleFromFishDirectionToClosestFish() < (Math.PI * 0.2)) { // in colliding sector?
                    this.dx += this.following.x * 0.1;
                    this.dy += this.following.y * 0.1;
                }
                else if (this.followingDistance > FOLLOW_DISTANCE * 0.3) { // dont go closer if close
                    this.dx += Math.cos(this.angleToClosestFish()) * (0.05 * this.distanceFactor);
                    this.dy += Math.sin(this.angleToClosestFish()) * (0.05 * this.distanceFactor);
                }
            }

            // go closer to center, crashing into the canvas walls is just silly!
            if (this.x < canvas.width * .1 || this.x > canvas.width * .9 || this.y < canvas.height * .2 || this.y > canvas.height * .8) {
                this.dx += (canvas.width / 2 - this.x) / 5000;
                this.dy += (canvas.height / 2 - this.y) / 5000;
            }

            // Poor little fishies are scared of your cursor
            if (py(this.x - cursor.x, this.y - cursor.y) < FOLLOW_DISTANCE * 0.75) {
                this.dx -= (cursor.x - this.x) / 500;
                this.dy -= (cursor.y - this.y) / 500;
                maxSpeed = 4;
            }

            // if following fish, try avoid going close to your siblings
            if (this.following != null) {
                for (var i = 0; i < this.following.entourage.length; i++) {
                    var siblingFish = this.following.entourage[i];
                    if (siblingFish !== this) {
                        if (py(this.x - siblingFish.x, this.y - siblingFish.y) < FOLLOW_DISTANCE * 0.2) {
                            this.dx -= (siblingFish.x - this.x) / 1000;
                            this.dy -= (siblingFish.y - this.y) / 1000;
                        }
                    }
                }
            }

            // calculate heading from new speed
            this.angle = Math.atan2(this.dy, this.dx);

            // grab the speed from the vectors, and normalize it
            var speed = Math.max(0.1, Math.min(maxSpeed, py(this.dx, this.dy)));

            // recreate speed vector from recombining angle of direction with normalized speed
            this.dx = Math.cos(this.angle) * (speed + speedBoost);
            this.dy = Math.sin(this.angle) * (speed + speedBoost);

            // fish moves
            this.x += this.dx;
            this.y += this.dy;
        }
    }

    // begin main structure
    var canvas = document.getElementById('fishtank');
    var context = canvas.getContext('2d');

    var fishes = [];

    var speedBoostCountdown = 200,
        speedBoost = 0,
        SPEED_BOOST = 2;
    
    var fishBitmap = new Image()
    
    fishBitmap.onload = function() {
        update();
    };

    //fishBitmap.src = "img/fish" + (Math.floor(Math.random() * 5) + 1) + ".png"; // <-- random fish color
    fishBitmap.src = "img/fish1.png";

    // draw
    function draw(f) {
        var r = f.angle + Math.PI;

        context.translate(f.x, f.y);
        context.rotate(r);

        var w = 20;
        var acc = py(f.dx - f.ox, f.dy - f.oy) / 0.05;

        // if a fish does a flip make it less wide
        if (acc > 1)
            w = 10 + 10 / acc;

        context.drawImage(fishBitmap, 0, 0, w, 6);
        context.rotate(-r);
        context.translate(-f.x, -f.y);
    }

    // pythagoras shortcut
    function py(a, b) {
        return Math.sqrt(a * a + b * b);
    }

    // user input start
    var cursor = {
        x: 0,
        y: 0
    };

    var cursorDown = false;

    document.onmousemove = function(e) {
        cursor.x = e.pageX - (window.innerWidth / 2 - canvas.width / 2);
        cursor.y = e.pageY - (window.innerHeight / 2 - canvas.height / 2);
    }

    // out of screen is not a valid pos
    document.onmouseout = function(e) {
        cursor.y = cursor.x = Number.MAX_VALUE;
    }

    document.onmousedown = function() {
        activateSpeedBoost();
        cursorDown = true;
    }
    document.onmouseup = function() {
        cursorDown = false;
    }

    document.onkeydown = function() {
        keyDown = true;
    }

    document.onkeyup = function() {
        keyDown = false;
    }

    // find the shortest angle between two
    function deltaAngle(f, o) {
        var r = f - o;
        return Math.atan2(Math.sin(r), Math.cos(r));
    }

    function activateSpeedBoost() {
        speedBoostCountdown = 400 + Math.round(400 * Math.random());
        speedBoost = SPEED_BOOST;
    }

    // update and draw all of them
    function update() {
        if (fishes.length < 500) {
            fishes.push(new Fish(fishes.length));
        }

        if (!cursorDown) {
            //clear the canvas
            canvas.width = canvas.width;

            //Update and draw fish
            for (var i = 0; i < fishes.length; i++) {
                var fish = fishes[i];
                fish.calc();
                draw(fish);
            }
        }

        speedBoostCountdown--;

        if (speedBoostCountdown < 0)
            activateSpeedBoost();

        if (speedBoost > 0)
            speedBoost -= SPEED_BOOST / 80;  // reduce speed bost fast
        else
            speedBoost = 0;

        // call animation frame loop
        requestAnimationFrame(update);
    }
});