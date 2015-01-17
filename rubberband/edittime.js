function GetBehaviorSettings()
{
	return {
		"name":			"Rubber Band",
		"id":			"RubberBand",
		"version":		"0.5",
		"description":	"Tie one object to another via a rubber band",
		"author":		"simulated_tea",
		"help url":		"https://github.com/simulated-tea/Construct2-RubberBand",
		"category":		"Movements",
		"flags":		0
						| bf_onlyone
	};
};

AddNumberParam("Relaxed Length", "The distance allowed before any effect is felt in pixel");
AddNumberParam("Stiffness", "The stength of the force if stretched");
AddNumberParam("Gravity", "Optional gravity effect");
AddNumberParam("Drag", "Optional drag effect");

AddCondition(0, 0, "Is streched", "Rubber Band", "{my}'s rubber band is streched", "Fixture object is out of relaxed lengths range", "IsStretched");

AddObjectParam("Fixture", "Object to tie a rubber band to")
AddAction(0, af_none, "Tie", "Connect", "Tie {my} to <b>{0}</b>", "Tie a new rubber band to the target", "tie");

AddAction(1, af_none, "Cut", "Connect", "Cut {my} free", "Unbind the rubber band", "cut");

// possible expression: speed(x & y)

ACESDone();

var property_list = [
	new cr.Property(ept_integer, "Relaxed Length", 100,  "The distance allowed before any effect is felt in pixel"),
	new cr.Property(ept_float, "Stiffness", 5, "The stength of the force if stretched"),
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
