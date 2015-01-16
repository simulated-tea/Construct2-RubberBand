﻿// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
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

        this.fixture = null;
        this.fixtureUid = -1;
        this.dx = 0;
        this.dy = 0;
		this.isStretched = false;
	};

	behinstProto.onDestroy = function ()
	{
		// called when associated object is being destroyed
		// note runtime may keep the object and behavior alive after this call for recycling;
		// release, recycle or reset any references here as necessary
	};

	// called when saving the full state of the game
	behinstProto.saveToJSON = function ()
	{
		// return a Javascript object containing information about your behavior's state
		// note you MUST use double-quote syntax (e.g. "property": value) to prevent
		// Closure Compiler renaming and breaking the save format
		return {
            "fixtureUid": this.fixture ? this.fixture.uid : -1,
            "relaxedLength": this.relaxedLength,
            "stiffness": this.stiffness,
            "gravity": this.gravity,
            "drag": this.drag,
            "dx": this.dx,
            "dy": this.dy
		};
	};

	// called when loading the full state of the game
	behinstProto.loadFromJSON = function (o)
	{
        this.fixtureUid = o["fixtureUid"];
        this.relaxedLength = o["relaxedLength"];
        this.stiffness = o["stiffness"];
        this.gravity = o["gravity"];
        this.drag = o["drag"];
        this.dx = o["dx"];
        this.dy = o["dy"];

        this.isStretched = (this.calculateStretch().displacement > 0);
	};

	behinstProto.afterLoad = function ()
	{
		// Look up the pinned object UID now getObjectByUID is available
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
		var accelX = 0,
            accelY = 0,
            dt = this.runtime.getDt(this.inst),
            delta = this.getDeltaVector(),
            stretch = this.calculateStretch();
        this.isStretched = (stretch.displacement > 0);
        if (this.isStretched)
        {
            var accel = stretch.displacement*this.stiffness; //*this.mass
            accelX = accel*delta.x*stretch.ratio;
            accelY = accel*delta.y*stretch.ratio;
            this.dx += dt*accelX;
            this.dy += dt*accelY;
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
	};

    behinstProto.calculateStretch = function ()
    {
        if (!this.fixture) 
            return 0;
        var distance = cr.distanceTo(this.fixture.x, this.fixture.y, this.inst.x, this.inst.y),
            displacement = Math.max(distance - this.relaxedLength, 0);
        return {"ratio": displacement/distance, "displacement": displacement};
    }

    behinstProto.getDeltaVector = function ()
    {
        return {
            "x": this.fixture.x - this.inst.x,
            "y": this.fixture.y - this.inst.y
        };
    }

	/**BEGIN-PREVIEWONLY**/
	behinstProto.getDebuggerValues = function (propsections)
	{
		// Append to propsections any debugger sections you want to appear.
		// Each section is an object with two members: "title" and "properties".
		// "properties" is an array of individual debugger properties to display
		// with their name and value, and some other optional settings.
		propsections.push({
			"title": this.type.name,
			"properties": [
				// Each property entry can use the following values:
				// "name" (required): name of the property (must be unique within this section)
				// "value" (required): a boolean, number or string for the value
				// "html" (optional, default false): set to true to interpret the name and value
				//									 as HTML strings rather than simple plain text
				// "readonly" (optional, default false): set to true to disable editing the property
				{"name": "fixtureName/UID", "value": this.fixture ? this.fixture.type.name+"/"+this.fixture.uid : "-/-", "readonly": true},
				{"name": "Stretchedness", "value": this.isStretched, "readonly": true},
				//{"name": "dx", "value": this.dx, "readonly": true},
				//{"name": "dy", "value": this.dy, "readonly": true},
				//{"name": "deltaX", "value": this.getDeltaVector().x, "readonly": true},
				//{"name": "deltaY", "value": this.getDeltaVector().y, "readonly": true},
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

	//////////////////////////////////////
	// Conditions
	function Cnds() {};

	Cnds.prototype.IsStretched = function ()
	{
		return this.isStretched;
	};

	behaviorProto.cnds = new Cnds();

	//////////////////////////////////////
	// Actions
	function Acts() {};

	// the example action
	Acts.prototype.tie = function (obj)
	{
		if (!obj)
			return;
		var otherinst = obj.getFirstPicked(this.inst);
		if (!otherinst)
			return;
			
		this.fixture = otherinst;
	};

	behaviorProto.acts = new Acts();

	//////////////////////////////////////
	// Expressions
	function Exps() {};

	// the example expression
	//exps.prototype.myexpression = function (ret)	// 'ret' must always be the first parameter - always return the expression's result through it!
	//{
		//ret.set_int(1337);				// return our value
		// ret.set_float(0.5);			// for returning floats
		// ret.set_string("Hello");		// for ef_return_string
		// ret.set_any("woo");			// for ef_return_any, accepts either a number or string
	//};

	behaviorProto.exps = new Exps();

}());