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
        this.relaxedLength = this.properties[0];
        this.stiffness = this.properties[1]*0.1; // for nicer default config values
        this.gravity = this.properties[2]*100;
        this.drag = this.properties[3]*0.01;
        this.enabled = this.properties[4]; // 0=disabled, 1=enabled

        this.fixture = null;
        this.fixtureUid = -1;
        this.dx = 0;
        this.dy = 0;
        this.isStretched = false;
        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
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
            "enabled": this.enabled,
            "drag": this.drag,
            "dx": this.dx,
            "dy": this.dy
        };
    };

    behinstProto.loadFromJSON = function (o)
    {
        this.fixtureUid = o["fixtureUid"];
        this.relaxedLength = o["relaxedLength"];
        this.stiffness = o["stiffness"];
        this.gravity = o["gravity"];
        this.enabled = o["enabled"];
        this.drag = o["drag"];
        this.dx = o["dx"];
        this.dy = o["dy"];

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
        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
    };

    behinstProto.tick = function ()
    {
        var beeingNudged = this.lastX !== this.inst.x || this.lastY !== this.inst.y;
        if (!this.enabled)
        {
            return;
        }
        var accelX = 0,
            accelY = 0,
            dt = this.runtime.getDt(this.inst),
            delta = this.getDeltaVector(),
            stretch = this.calculateStretch();
        if (beeingNudged)
        {
            this.accountForNudge(dt);
        }
        if (this.fixture)
        {
            this.isStretched = (stretch.displacement > 0);
            if (this.isStretched)
            {
                var accel = stretch.displacement*this.stiffness;
                accelX = accel*delta.x*stretch.ratio;
                accelY = accel*delta.y*stretch.ratio;
                this.dx += dt*accelX;
                this.dy += dt*accelY;
            }
        }
        if (this.gravity)
        {
            this.dy += dt*this.gravity;
        }
        if (this.drag)
        {
            this.dx -= (this.drag*this.dx);
            this.dy -= (this.drag*this.dy);
        }
        {
            this.inst.x += (this.dx + 0.5*(accelX)*dt)*dt;
            this.inst.y += (this.dy + 0.5*(accelY + this.gravity)*dt)*dt;
            this.inst.set_bbox_changed();
        }
        this.lastX = this.inst.x;
        this.lastY = this.inst.y;
    };

    behinstProto.accountForNudge = function (dt)
    {
        var deltaX = this.inst.x - this.lastX,
            deltaY = this.inst.y - this.lastY;
        if (Math.abs(deltaX) > 0.001)
        {
            this.dx = (this.dx + deltaX/dt)/2;
        }
        if (Math.abs(deltaY) > 0.001)
        {
            this.dy = (this.dy + deltaY/dt)/2;
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
        var result = {};
        if (!this.fixture)
        {
            result.x = 0;
            result.y = 0;
            return result;
        }
        result.x = this.fixture.x - this.inst.x;
        result.y = this.fixture.y - this.inst.y;
        return result;
    }

    /**BEGIN-PREVIEWONLY**/
    behinstProto.getDebuggerValues = function (propsections)
    {
        propsections.push({
            "title": this.type.name,
            "properties": [
                {"name": "fixtureName/UID", "value": this.fixture ? this.fixture.type.name+"/"+this.fixture.uid : "-/-", "readonly": true},
                {"name": "Tiedness", "value": !! this.fixture, "readonly": true},
                {"name": "Stretchedness", "value": this.isStretched, "readonly": true},
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

    Acts.prototype.cut = function (obj)
    {
        this.fixture = null;
        this.isStretched = false;
    }

    Acts.prototype.SetEnabled = function (en)
    {
        this.enabled = (en === 1);
        if (this.enabled)
        {
            this.lastX = this.inst.x;
            this.lastY = this.inst.y;
        }
        else
        {
            this.dx = 0;
            this.dy = 0;
        }
    };

    behaviorProto.acts = new Acts();

    function Exps() {};

    behaviorProto.exps = new Exps();

}());
