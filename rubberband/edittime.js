function GetBehaviorSettings()
{
    return {
        "name":        "Rubber Band",
        "id":          "RubberBand",
        "version":     "0.8",
        "description": "Tie one object to another via a rubber band",
        "author":      "simulated_tea",
        "help url":    "https://github.com/simulated-tea/Construct2-RubberBand",
        "category":    "Movements",
        "flags":       0
    };
};

AddCondition(0, 0, "Is tied", "", "{my}'s rubber band is tied", "The object is attached to another object via its rubberband", "IsTied");
AddCondition(1, 0, "Is streched", "", "{my}'s rubber band is streched", "Fixture object is out of relaxed lengths range", "IsStretched");
AddCondition(2, 0, "Is enabled", "", "Is {my} enabled", "Test if the behavior is currently enabled.", "IsEnabled");

AddObjectParam("Fixture", "Object to tie a rubber band to");
AddAction(0, af_none, "Tie", "", "Tie {my} to <b>{0}</b>", "Tie a new rubber band to the target", "tie");
AddAction(1, af_none, "Cut", "", "Cut {my} free", "Unbind the rubber band", "cut");

AddComboParamOption("Disabled");
AddComboParamOption("Enabled");
AddComboParam("State", "Set whether to enable or disable the behavior.");
AddAction(2, af_none, "Set enabled", "", "Set {my} <b>{0}</b>", "Set whether this behavior is enabled.", "setEnabled");

AddNumberParam("Band length change", "The number of pixel to make the band longer or (if negative) shorter");
AddAction(3, af_none, "Modify Length", "Configuration", "Modify band length by <b>{0}</b>", "Modify the length of the band. Length will not go below 0.", "modifyLength");
AddNumberParam("New band length", "The length in pixel to set the band to (>=0)", "100");
AddAction(4, af_none, "Set Length", "Configuration", "Set band length to <b>{0}</b>", "Set the length of the band to a fixed value (>0)", "setLength");

AddExpression(0, ef_return_number, "Get vector X", "", "VectorX", "The current X component of motion (px/s).");
AddExpression(1, ef_return_number, "Get vector Y", "", "VectorY", "The current Y component of motion (px/s).");
AddExpression(2, ef_return_number, "Get angle of motion", "", "MovingAngle", "The current angle of motion, in degrees");

ACESDone();

var property_list = [
    new cr.Property(ept_integer, "Relaxed Length", 100,  "The distance allowed before any effect is felt in pixel"),
    new cr.Property(ept_float, "Stiffness", 5, "The stength of the force if stretched"),
    new cr.Property(ept_float, "Gravity", 10, "Optional gravity effect, in pixel/second"),
    new cr.Property(ept_float, "Drag", 1, "Optional drag effect"),
    new cr.Property(ept_combo, "Initial State", "Enabled", "Whether to initially have the behavior enabled or disabled", "Disabled|Enabled")
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
