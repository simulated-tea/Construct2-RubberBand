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

    var behinstProto = behaviorProto.Instance.prototype;

    behinstProto.onCreate = function()
    {
        this.relaxedLength = Math.max(this.properties[0], 0);
        this.stiffness = this.properties[1]*0.1; // for nicer default config values
        this.gravity = this.properties[2]*100;
        this.drag = this.properties[3]*0.01;
        this.enabled = this.properties[4]; // 0=disabled, 1=enabled

        this.fixture = null;
        this.fixtureUid = -1;
        this.dx = 0;
        this.dy = 0;
        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
        this.medianDt = 0.016; // 60 FPS
        this.lastDts = [0.016, 0.016, 0.016, 0.16, 0.16];

        // working set to avoid object creations during tick
        this.diff = {x: 0, y: 0};
        this.vectorToTiee = {x: 0, y: 0};
        this.stretch = {displacement: 0, ratio: 0};
    };

    behinstProto.onDestroy = function ()
    {
        this.fixture = null;
    };

    behinstProto.saveToJSON = function ()
    {
        return {
            "fu": this.fixture ? this.fixture.uid : -1,
            "rl": this.relaxedLength,
            "s": this.stiffness,
            "g": this.gravity,
            "e": this.enabled,
            "d": this.drag,
            "dx": this.dx,
            "dy": this.dy,
            "lx": this.lastX,
            "ly": this.lastY,
            "mt": this.medianDt,
            "ld": this.lastDts
        };
    };

    behinstProto.loadFromJSON = function (o)
    {
        this.fixtureUid = o["fu"];
        this.relaxedLength = o["rl"];
        this.stiffness = o["s"];
        this.gravity = o["g"];
        this.enabled = o["e"];
        this.drag = o["d"];
        this.dx = o["dx"];
        this.dy = o["dy"];
        this.lastX = o["lx"];
        this.lastY = o["ly"];
        this.medianDt = o["mt"];
        this.lastDts = o["ld"];

        this.diff = {x: 0, y: 0};
        this.vectorToTiee = {x: 0, y: 0};
        this.stretch = {displacement: 0, ratio: 0};
        this.calculateStretch();
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

        this.diff.x = 0;
        this.diff.y = 0;

        if (this.enabled)
        {
            this.calculateBandMovement();
        }

        if (Math.abs(this.diff.x) > 0.1 || Math.abs(this.diff.y) > 0.1)  // save draw calls if nothing moves
        {
            this.inst.x += this.diff.x;
            this.inst.y += this.diff.y;
            this.inst.set_bbox_changed();
        }

        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
    }

    behinstProto.calculateBandMovement = function ()
    {
        var accelX = 0,
            accelY = 0;
        this.calculateTieeVector();
        this.calculateStretch();
        if (this.fixture)
        {
            if (this.stretch.displacement > 0)
            {
                var accel = this.stretch.displacement*this.stiffness;
                accelX = accel*this.vectorToTiee.x*this.stretch.ratio;
                accelY = accel*this.vectorToTiee.y*this.stretch.ratio;
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

        this.diff.x = cr.clamp((this.dx + 0.5*(accelX)*this.medianDt)*this.medianDt, -1000, 1000);
        this.diff.y = cr.clamp((this.dy + 0.5*(accelY + this.gravity)*this.medianDt)*this.medianDt, -1000, 1000);
    };

    behinstProto.getLast5MedianDt = function ()
    {
        this.lastDts.pop();
        this.lastDts.unshift(this.runtime.getDt(this.inst));
        this.medianDt = this.lastDts.slice().sort(function(a,b) {return a-b})[2];
    }

    behinstProto.pickupExternalImpulse = function ()
    {
        if (this.otherSourcesOfMovementExist())
        {
            this.dx = (this.dx + (this.inst.x - this.lastX)/this.medianDt)/2;
            this.dy = (this.dy + (this.inst.y - this.lastY)/this.medianDt)/2;
        }
    }

    behinstProto.otherSourcesOfMovementExist = function ()
    {
        return this.lastX !== this.inst.x || this.lastY !== this.inst.y
    }

    behinstProto.calculateStretch = function ()
    {
        if (!this.fixture)
        {
            return;
        }
        var distance = cr.distanceTo(this.fixture.x, this.fixture.y, this.inst.x, this.inst.y),
            displacement = Math.max(distance - this.relaxedLength, 0);
        this.stretch.ratio = displacement/distance;
        this.stretch.displacement = displacement;
    }

    behinstProto.calculateTieeVector = function ()
    {
        if (!this.fixture)
        {
            this.vectorToTiee.x = 0;
            this.vectorToTiee.y = 0;
            return;
        }
        this.vectorToTiee.x = this.fixture.x - this.inst.x;
        this.vectorToTiee.y = this.fixture.y - this.inst.y;
    }

    /**BEGIN-PREVIEWONLY**/
    behinstProto.getDebuggerValues = function (propsections)
    {
        propsections.push({
            "title": this.type.name,
            "properties": [
                {"name": "FixtureName/UID", "value": this.fixture ? this.fixture.type.name+"/"+this.fixture.uid : "-/-", "readonly": true},
                {"name": "Distance streched", "value": this.stretch.displacement, "readonly": true},
                {"name": "Velocity.x", "value": this.dx, "readonly": true},
                {"name": "Velocity.y", "value": this.dy, "readonly": true},
                {"name": "Relaxed Length", "value": this.relaxedLength},
                {"name": "Spring Rate", "value": this.stiffness},
                {"name": "Gravity", "value": this.gravity},
                {"name": "Drag", "value": this.drag},
                {"name": "Enabled", "value": !! this.enabled}
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
        if (name === "Enabled")
            this.enabled = value;
    };
    /**END-PREVIEWONLY**/

    function Cnds() {};

    Cnds.prototype.IsStretched = function () { return this.stretch.displacement > 0 }
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
        this.stretch.displacement = 0;
        this.stretch.ratio = 0;
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

    Acts.prototype.modifyLength = function (value)
    {
        this.relaxedLength = Math.max(this.relaxedLength + value, 0);
    };

    Acts.prototype.setLength = function (value)
    {
        this.relaxedLength = Math.max(value, 0);
    };

    Acts.prototype.setStiffness = function (value)
    {
        this.stiffness = value*0.1;
    };

    Acts.prototype.setGravity = function (value)
    {
        this.gravity = value*100;
    };

    Acts.prototype.setDrag = function (value)
    {
        this.drag = value*0.01;
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
