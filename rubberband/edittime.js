function GetBehaviorSettings()
{
	return {
		"name":			"Multi Rubber Band",
		"id":			"MultiRubberBand",
		"version":		"0.6",
		"description":	"Tie one object to multiple others via rubber bands",
		"author":		"simulated_tea",
		"help url":		"https://github.com/simulated-tea/Construct2-RubberBand",
		"category":		"Movements",
		"flags":		0
						| bf_onlyone
	};
};

AddObjectParam("Fixture", "Object to tie a rubber band to")
AddAction(0, af_none, "Tie", "Connect", "Tie {my} to <b>{0}</b>", "Tie a new rubber band to the target", "tie");

AddObjectParam("Fixture", "Object to untie a rubber band from")
AddAction(1, af_none, "Cut", "Connect", "Cut {my} free from <b>{0}</b>", "Unbind the rubber band from a specific target", "cutFrom");
AddAction(2, af_none, "Cut All", "Connect", "Cut {my} free from all ties", "Unbind the rubber band from all ties", "cutAll");

// possible expression: isTied, speed(x & y)

ACESDone();

var property_list = [
	new cr.Property(ept_integer, "Relaxed Length", 100,  "The distance allowed before any effect is felt in pixel. Currently the same for all targets"),
	new cr.Property(ept_float, "Stiffness", 5, "The stength of the force if stretched. Currently the same for all targets"),
    new cr.Property(ept_float, "Gravity", 10, "Optional gravity effect, in pixel/second"),
    new cr.Property(ept_float, "Drag", 1, "Optional drag effect")
];

function CreateIDEBehaviorType()
{
	return new IDEBehaviorType();
}

function IDEBehaviorType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

IDEBehaviorType.prototype.CreateInstance = function(instance)
{
	return new IDEInstance(instance, this);
}

function IDEInstance(instance, type)
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");

	this.instance = instance;
	this.type = type;

	this.properties = {};

	for (var i = 0; i < property_list.length; i++)
		this.properties[property_list[i].name] = property_list[i].initial_value;
}

IDEInstance.prototype.OnCreate = function()
{
}

IDEInstance.prototype.OnPropertyChanged = function(property_name)
{
}
