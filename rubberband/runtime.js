// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

cr.behaviors.RubberBand = function(runtime)
{
    this.runtime = runtime;
};

(function ()
{
    var behaviorProto = cr.behaviors.RubberBand.prototype;

    behaviorProto.Type = function(behavior, objtype)
    {
        this.behavior = behavior;
        this.objtype = objtype;
        this.runtime = behavior.runtime;
    };

    var behtypeProto = behaviorProto.Type.prototype;

    behtypeProto.onCreate = function()
    {
    };

    behaviorProto.Instance = function(type, inst)
    {
        this.type = type;
        this.behavior = type.behavior;
        this.inst = inst;
        this.runtime = type.runtime;
    };

    var toleratedNumericError = 1;

    var behinstProto = behaviorProto.Instance.prototype;

    behinstProto.onCreate = function()
    {
        this.relaxedLength = Math.max(this.properties[0], 0);
        this.stiffness = this.properties[1]*0.1; // for nicer default config values
        this.gravity = this.properties[2]*100;
        this.drag = this.properties[3]*0.01;
        this.collisionsEnabled = this.properties[4]; // 0=disabled, 1=enabled
        this.enabled = this.properties[5];

        this.elasticity = 0.1;
        this.stuckMillies = 0;

        this.fixture = null;
        this.fixtureUid = -1;
        this.dx = 0;
        this.dy = 0;
        this.isStretched = false;
        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
        this.medianDt = 0.016; // 60 FPS
        this.lastDts = [0.016, 0.016, 0.016, 0.16, 0.16];
    };

    behinstProto.onDestroy = function ()
    {
        this.fixture = null;
    };

    behinstProto.saveToJSON = function ()
    {
        return {
            "fixtureUid": this.fixture ? this.fixture.uid : -1,
            "relaxedLength": this.relaxedLength,
            "stiffness": this.stiffness,
            "gravity": this.gravity,
            "collisionsEnabled": this.collisionsEnabled,
            "enabled": this.enabled,
            "drag": this.drag,
            "dx": this.dx,
            "dy": this.dy,
            "lastX": this.lastX,
            "lastY": this.lastY,
            "medianDt": this.medianDt,
            "lastDts": this.lastDts
        };
    };

    behinstProto.loadFromJSON = function (o)
    {
        this.fixtureUid = o["fixtureUid"];
        this.relaxedLength = o["relaxedLength"];
        this.stiffness = o["stiffness"];
        this.gravity = o["gravity"];
        this.collisionsEnabled = o["collisionsEnabled"];
        this.enabled = o["enabled"];
        this.drag = o["drag"];
        this.dx = o["dx"];
        this.dy = o["dy"];
        this.lastX = o["lastX"];
        this.lastY = o["lastY"];
        this.medianDt = o["medianDt"];
        this.lastDts = o["lastDts"];

        this.elasticity = 0.1;
        this.isStretched = (this.calculateStretch().displacement > 0);
    };

    behinstProto.afterLoad = function ()
    {
        if (this.fixtureUid === -1)
        {
            this.fixture = null;
        }
        else
        {
            this.fixture = this.runtime.getObjectByUID(this.fixtureUid);
            assert2(this.fixture, "Failed to find fixture object by UID");
        }

        this.fixtureUid = -1;
    };

    behinstProto.tick = function ()
    {
        this.getLast5MedianDt();
        this.pickupExternalImpulse();
        var diff = { x: 0, y: 0 };
        if (this.enabled)
        {
            diff = this.calculateBandMovement();
        }

        if (!movementNegligible(diff))  // save draw calls (and collisions) if nothing moves
        {
            if (this.collisionsEnabled)
            {
                this.inst.update_bbox();
                if (this.isMovingSlow(diff))
                {
                    this.oneStepOrCollision(diff);
                }
                else
                {
                    // i should raycast, only how?
                    // just fly through for now
                    this.inst.x += diff.x;
                    this.inst.y += diff.y;
                    this.inst.set_bbox_changed();
                }
            }
            else
            {
                this.inst.x += diff.x;
                this.inst.y += diff.y;
                this.inst.set_bbox_changed();
            }
        }

        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
    }

    behinstProto.getLast5MedianDt = function ()
    {
        var dt = this.runtime.getDt(this.inst);
        this.lastDts.pop();
        this.lastDts.unshift(dt);
        var sample = this.lastDts.slice().sort(function(a,b) {return a-b});
        this.medianDt = sample[2];
    }

    behinstProto.pickupExternalImpulse = function ()
    {
        if (this.lastX !== this.inst.x || this.lastY !== this.inst.y) // there are there other sources of movement
        {
            var delta = this.getPositionDelta();
            this.dx = (this.dx + delta.x/this.medianDt)/2;
            this.dy = (this.dy + delta.y/this.medianDt)/2;
        }
    }

    behinstProto.calculateBandMovement = function ()
    {
        var accelX = 0,
            accelY = 0,
            dt = this.runtime.getDt(this.inst),
            delta = this.getDeltaVector(),
            stretch = this.calculateStretch();
        if (this.fixture)
        {
            this.isStretched = (stretch.displacement > 0);
            if (this.isStretched)
            {
                var accel = stretch.displacement*this.stiffness;
                accelX = accel*delta.x*stretch.ratio;
                accelY = accel*delta.y*stretch.ratio;
                this.dx += this.medianDt*accelX;
                this.dy += this.medianDt*accelY;
            }
        }
        if (this.gravity)
        {
            this.dy += this.medianDt*this.gravity;
        }
        if (this.drag)
        {
            this.dx -= (this.drag*this.dx);
            this.dy -= (this.drag*this.dy);
        }

        return {
            x: cr.clamp((this.dx + 0.5*(accelX)*this.medianDt)*this.medianDt, -1000, 1000),
            y: cr.clamp((this.dy + 0.5*(accelY + this.gravity)*this.medianDt)*this.medianDt, -1000, 1000),
        };
    };

    function movementNegligible (vector)
    {
        return (Math.abs(vector.x) < 0.1 && Math.abs(vector.y) < 0.1)
    }

    behinstProto.getPositionDelta = function ()
    {
        return {
            x: this.inst.x - this.lastX,
            y: this.inst.y - this.lastY
        }
    }

    behinstProto.isMovingSlow = function (diff)
    {
        return (Math.abs(diff.x) < this.inst.bbox.width()
            && Math.abs(diff.y) < this.inst.bbox.height())
    }

    behinstProto.moveAndOnCollisionDo = function (diff, collisionHandler)
    {
        this.inst.x += diff.x;
        this.inst.y += diff.y;
        this.inst.set_bbox_changed();
        var collobj = this.runtime.testOverlapSolid(this.inst);
        if (collobj)
        {
            collisionHandler.call(this, diff, collobj);
        }
        window.console.log('no collision');
    }

    behinstProto.oneStepOrCollision = function (diff)
    {
        this.moveAndOnCollisionDo(diff, function (diff, collobj) {
            this.runtime.pushOutSolid(this.inst, -diff.x, -diff.y, Math.sqrt(diff.x*diff.x + diff.y*diff.y) + toleratedNumericError);
            this.runtime.registerCollision(this.inst, collobj);
            this.lastX = this.inst.x;
            this.lastY = this.inst.y;
            this.calculateBounceOffSpeed(collobj);
            //var postCollisionDelta = this.getPositionDelta();
            //if (!movementNegligible(postCollisionDelta))
            //{
            //    this.inst.set_bbox_changed();
            //}
        });
    }

    behinstProto.calculateBounceOffSpeed = function (c)
    {
        var constellation = this.detectConstellationWith(c);
        this.flipOneSpeedComponentAwayFrom(c, constellation);       // try angled bounce first
        this.applyFrictionToOtherSpeedComponent(constellation);

        window.console.log('about to validate');
        if (Math.abs(this.dx) > 0.7 || Math.abs(this.dy > 0.7))     // validate angled bounce is working
        {
            var speed = Math.sqrt(this.dx*this.dx + this.dy*this.dy);
            var testMoveDistance = 2; // pixel // could depend on remaining distance not yet moved into collobj ??
            this.inst.x += this.dx / speed * testMoveDistance;
            this.inst.y += this.dy / speed * testMoveDistance;
            //this.inst.set_bbox_changed();
            //var collobj = this.runtime.testOverlapSolid(this.inst);

            if (false)  // angled bounce failed - switch to reflect
            {
                window.console.log('validation failed');
                this.inst.x = this.lastX;
                this.inst.y = this.lastY;
                if (constellation === 'horizontal')
                {
                    this.dy = -this.elasticity*this.dy;
                }
                else
                {
                    this.dx = -this.elasticity*this.dx;
                }
            }
            else
            {
                window.console.log('validation succeeded');
            }
        }
        else
        {
            window.console.log('not fast enough');
        }
    }

    behinstProto.detectConstellationWith = function (c)
    {
        var toTheRight = this.inst.x > c.x;
        var below = this.inst.y > c.y;
        if (toTheRight === below)
        {
            var slopeDiagonalRightDown = (c.bquad.bry - c.bquad.midY())/(c.bquad.brx - c.bquad.midX());
            var slopeToInstance = Math.abs(this.inst.y - c.bquad.midY())/(Math.abs(this.inst.x - c.bquad.midX()) + 1);
            if ( slopeDiagonalRightDown < slopeToInstance)
            {
                return 'vertical';
            }
            else
            {
                return 'horizontal';
            }
        }
        else
        {
            var slopeDiagonalRightUp = (c.bquad.try_ - c.bquad.midY())/(c.bquad.trx - c.bquad.midX());
            var slopeToInstance = -Math.abs(this.inst.y - c.bquad.midY())/(Math.abs(this.inst.x - c.bquad.midX()) + 1);
            if ( slopeDiagonalRightUp < slopeToInstance )
            {
                return 'horizontal';
            }
            else
            {
                return 'vertical';
            }
        }
    }

    behinstProto.flipOneSpeedComponentAwayFrom = function (c, direction)
    {
        if (direction === 'horizontal' && (this.inst.x - c.x)*this.dx < 0 )
        {
            this.dx = -this.elasticity*this.dx;
        }
        else if (direction === 'vertical' && (this.inst.y - c.y)*this.dy < 0 )
        {
            this.dy = -this.elasticity*this.dy;
        }
    }

    behinstProto.applyFrictionToOtherSpeedComponent = function (direction)
    {
        if (direction === 'horizontal')
        {
            this.dy = 0.5*this.dy; // XXX 0.5 ===> this.friction
        }
        else if (direction === 'vertical')
        {
            this.dx = 0.5*this.dx;
        }
    }

    behinstProto.calculateStretch = function ()
    {
        if (!this.fixture)
        {
            return 0;
        }
        var distance = cr.distanceTo(this.fixture.x, this.fixture.y, this.inst.x, this.inst.y),
            displacement = Math.max(distance - this.relaxedLength, 0),
            result = {};
        result.ratio = displacement/distance;
        result.displacement = displacement;
        return result;
    }

    behinstProto.getDeltaVector = function ()
    {
        if (!this.fixture)
        {
            return {
                x: 0,
                y: 0
            }
        }
        return {
            x: this.fixture.x - this.inst.x,
            y: this.fixture.y - this.inst.y
        }
    }

    /**BEGIN-PREVIEWONLY**/
    behinstProto.getDebuggerValues = function (propsections)
    {
        propsections.push({
            "title": this.type.name,
            "properties": [
                {"name": "fixtureName/UID", "value": this.fixture ? this.fixture.type.name+"/"+this.fixture.uid : "-/-", "readonly": true},
                {"name": "Stretchedness", "value": this.isStretched, "readonly": true},
                {"name": "Velocity.x", "value": this.dx, "readonly": true},
                {"name": "Velocity.y", "value": this.dy, "readonly": true},
                {"name": "Relaxed Length", "value": this.relaxedLength},
                {"name": "Spring Rate", "value": this.stiffness},
                {"name": "Gravity", "value": this.gravity},
                {"name": "Drag", "value": this.drag},
                {"name": "Colliding", "value": !! this.collisionsEnabled},
                {"name": "Enabled", "value": !! this.enabled},
            ]
        });
    };

    behinstProto.onDebugValueEdited = function (header, name, value)
    {
        if (name === "Relaxed Length")
            this.relaxedLength = value;
        if (name === "Spring Rate")
            this.stiffness = value;
        if (name === "Gravity")
            this.gravity = value;
        if (name === "Drag")
            this.drag = value;
        if (name === "Colliding")
            this.collisionsEnabled = value;
        if (name === "Enabled")
            this.enabled = value;
    };
    /**END-PREVIEWONLY**/

    function Cnds() {};

    Cnds.prototype.IsStretched = function () { return this.isStretched }
    Cnds.prototype.IsTied = function () { return !! this.fixture }
    Cnds.prototype.IsEnabled = function () { return this.enabled }

    behaviorProto.cnds = new Cnds();

    function Acts() {};

    Acts.prototype.tie = function (obj)
    {
        if (!obj)
        {
            return;
        }
        var otherinst = obj.getFirstPicked(this.inst);
        if (!otherinst)
        {
            return;
        }
        this.fixture = otherinst;
    };

    Acts.prototype.cut = function ()
    {
        this.fixture = null;
        this.isStretched = false;
    };

    Acts.prototype.setEnabled = function (en)
    {
        this.enabled = (en === 1);
        if (!this.enabled)
        {
            this.dx = 0;
            this.dy = 0;
        }
    };

    Acts.prototype.modifyLength = function (delta)
    {
        this.relaxedLength = Math.max(this.relaxedLength + delta, 0);
    };

    Acts.prototype.setLength = function (length)
    {
        this.relaxedLength = Math.max(length, 0);
    };

    Acts.prototype.setColliding = function (en)
    {
        this.collisionsEnabled = (en === 1);
    };

    Acts.prototype.goCrazy = function ()
    {
        window.console.log('I want to raycast');
        //this.relaxedLength = Math.max(length, 0);
    };

    behaviorProto.acts = new Acts();

    function Exps() {};

	Exps.prototype.VectorX = function (ret)
	{
		ret.set_float(this.dx);
	};

	Exps.prototype.VectorY = function (ret)
	{
		ret.set_float(this.dy);
	};

	Exps.prototype.MovingAngle = function (ret)
	{
		ret.set_float(cr.to_degrees(Math.atan2(this.dy, this.dx)));
	};

    behaviorProto.exps = new Exps();

}());
