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
        this.speedometer = new behaviorProto.Speedometer();
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
        this.speedometer.startRecording(this.inst);
        this.isStretched = false;
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

        this.speedometer.startRecording(this.inst);
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
        if (!this.enabled)
        {
            return;
        }
        var dt = Math.max(this.runtime.getDt(this.inst), 0.000001),
            accelerationX = 0,
            accelerationY = 0,
            delta = this.getDeltaVector(),
            stretch = this.calculateStretch();
        this.speedometer.tick(dt);
        if (this.speedometer.readyToRead) // Shield against possible external movements
        {
            var realSpeed = this.speedometer.getSpeed(this.inst);
            this.dx = realSpeed.x;
            this.dy = realSpeed.y;
        }
        if (this.fixture)
        {
            this.isStretched = (stretch.displacement > 0);
            if (this.isStretched)
            {
                var absolutAcceleration = stretch.displacement*this.stiffness;
                accelerationX = absolutAcceleration*delta.x*stretch.ratio;
                accelerationY = absolutAcceleration*delta.y*stretch.ratio;
                this.dx += dt*accelerationX;
                this.dy += dt*accelerationY;
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
            this.inst.x += (this.dx + 0.5*(accelerationX)*dt)*dt;
            this.inst.y += (this.dy + 0.5*(accelerationY + this.gravity)*dt)*dt;
            // collision checks missing here (-> 8directions beh)
            this.inst.set_bbox_changed();
        }
    };

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
                {"name": "Relaxed Length", "value": this.relaxedLength},
                {"name": "Spring Rate", "value": this.stiffness},
                {"name": "Gravity", "value": this.gravity},
                {"name": "Drag", "value": this.drag},
                {"name": "Enabled", "value": this.enabled}
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
    };

    behaviorProto.acts = new Acts();

    function Exps() {};

    behaviorProto.exps = new Exps();

    ///////////////////////////
    // Custom speedometer
    behaviorProto.Speedometer = function ()
    {
        this.x = 0;
        this.y = 0;
        this.Sdt = 0;
        this.readyToRead = false;
    }
    var SpeedoProto = behaviorProto.Speedometer.prototype;

    SpeedoProto.startRecording = function (obj)
    {
        this.x = obj.x;
        this.y = obj.y;
        this.Sdt = 0;
        this.readyToRead = false;
    }

    SpeedoProto.tick = function (dt)
    {
        this.Sdt += dt;
        if (this.Sdt > 0.05)
        {
            this.readyToRead = true;
        }
    }

    SpeedoProto.getSpeed = function (obj)
    {
        var deltaX = obj.x - this.x,
            deltaY = obj.y - this.y,
            velocityX = 0,
            velocityY = 0;

        if (deltaX > 0.0001)
        {
           velocityX = deltaX/this.Sdt;
        }
        if (deltaY > 0.0001)
        {
           velocityY = deltaY/this.Sdt;
        }

        this.startRecording(obj);
        return {
            x: velocityX,
            y: velocityY
        }
    }
}());
