// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

cr.behaviors.MultiRubberBand = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var behaviorProto = cr.behaviors.MultiRubberBand.prototype;

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

        this.fixture = [];
        this.fixtureUids = [];
        this.dx = 0;
        this.dy = 0;
		this.isStretched = false;
	};

	behinstProto.onDestroy = function ()
	{
        this.fixture = [];
	};

	behinstProto.saveToJSON = function ()
	{
		return {
            "fixtureUidString": getAllUids(),
            "relaxedLength": this.relaxedLength,
            "stiffness": this.stiffness,
            "gravity": this.gravity,
            "drag": this.drag,
            "dx": this.dx,
            "dy": this.dy
		};
	};

    behinstProto.getAllUids = function ()
    {
        var uidString = '';
        forAll(this, this.fixture, function(i)
        {
            uidString += ','+fixture.uid;
        });
        if (uidString.length) // cut leading ,
        {
            uidString = uidString.slice(1);
        }
        return uidString;
    }

	behinstProto.loadFromJSON = function (o)
	{
        this.fixtureUids = o["fixtureUidString"];
        this.relaxedLength = o["relaxedLength"];
        this.stiffness = o["stiffness"];
        this.gravity = o["gravity"];
        this.drag = o["drag"];
        this.dx = o["dx"];
        this.dy = o["dy"];
	};

    behinstProto.parseUidString = function (string) {
        if (string.length === 0)
        {
            return [];
        }
        return string.split(',');
    }

	behinstProto.afterLoad = function ()
	{
        this.fixture = [];
		if (this.fixtureUids !== [])
		{
            forAll(this, this.fixtureUids, function(i)
            {
                this.fixture.push(this.runtime.getObjectByUID(this.fixtureUids[i]));
            });
		}
        assert2(this.fixture.length === this.fixtureUids.length, "Failed to find all fixture objects by UID");

		this.fixtureUids = [];
	};

	behinstProto.tick = function ()
	{
		var accelX = 0,
            accelY = 0,
            dt = this.runtime.getDt(this.inst),
            deltas = this.getDeltaVectors(),
            stretches = this.calculateStretches();
        if (this.fixture.length)
        {
            for (var i = 0; i < this.fixture.length; ++i)
            forAll(this, this.fixture, function(i)
            {
                var accel = stretches[i].displacement*this.stiffness;
                accelX += accel*deltas[i].x*stretches[i].ratio;
                accelY += accel*deltas[i].y*stretches[i].ratio;
            });
        }
        if (this.gravity)
        {
            accelY += this.gravity;
        }
        this.dx += dt*accelX;
        this.dy += dt*accelY;
        if (this.drag)
        {
            this.dx -= (this.drag*this.dx);
            this.dy -= (this.drag*this.dy);
        }
        {
            this.inst.x += (this.dx + 0.5*(accelX)*dt)*dt;
            this.inst.y += (this.dy + 0.5*(accelY)*dt)*dt;
            this.inst.set_bbox_changed();
        }
	};

    behinstProto.calculateStretches = function ()
    {
        var stretchList = [];
        forAll(this, this.fixture, function(i)
        {
            var distance = cr.distanceTo(this.fixture[i].x, this.fixture[i].y, this.inst.x, this.inst.y),
                displacement = Math.max(distance - this.relaxedLength, 0),
                result = {};
            result.ratio = displacement/distance;
            result.displacement = displacement;
            stretchList.push(result);
        });
        return stretchList;
    }

    behinstProto.getDeltaVectors = function ()
    {
        var deltaList = [];
        forAll(this, this.fixture, function(i)
        {
            var delta = {};
            delta.x = this.fixture[i].x - this.inst.x;
            delta.y = this.fixture[i].y - this.inst.y;
            deltaList.push(delta);
        });
        return deltaList;
    }

	/**BEGIN-PREVIEWONLY**/
	behinstProto.getDebuggerValues = function (propsections)
	{
		propsections.push({
			"title": this.type.name,
			"properties": [
				{"name": "fixtureSize", "value": this.fixture.length, "readonly": true},
				{"name": "Tiedness", "value": !! this.fixture, "readonly": true},
				{"name": "Relaxed Length", "value": this.relaxedLength},
				{"name": "Spring Rate", "value": this.stiffness},
				{"name": "Gravity", "value": this.gravity},
				{"name": "Drag", "value": this.drag}
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
	};
	/**END-PREVIEWONLY**/

	function Cnds() {};

	Cnds.prototype.IsTied = function ()
	{
		return !! this.fixture;
	};

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
		this.fixture.push(otherinst);
	};

	Acts.prototype.cutFrom = function (obj)
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
        cr.ArrayFindRemove(this.fixture, otherinst);
    }

	Acts.prototype.cutAll = function (obj)
    {
        this.fixture = [];
    }

	behaviorProto.acts = new Acts();

	function Exps() {};

	behaviorProto.exps = new Exps();

}());
