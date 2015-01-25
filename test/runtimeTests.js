"use strict";

var assert = require("./helper/better-assert")

describe('RubberBand - runtime', function(){
    global.cr = require('./helper/crMock');
    global.assert2 = function() {};
    require("./../rubberband/runtime")

    var behavior = new cr.behaviors.RubberBand({iam: 'runtime', getDt: function() { return 0.016 }}),
        type = new behavior.Type(behavior, {iam: 'objtype'}),
        actions = behavior.acts,
        properties = [
        10,   // Relaxed Length
        5,    // Stiffness
        0,    // Gravity
        0,    // Drag
        true, // Enabled
    ];

    describe('tie', function() {
        var objinst = {iam: 'inst', x: 0, y: 0};
        var behinst = new behavior.Instance(type, objinst);

        actions.tie.call(behinst, {getFirstPicked: function () { return 'the target instance' }});

        it('should put the found instance into its fixture', function() {
            assert(behinst.fixture === 'the target instance');
        });
    });

    describe('tick', function() {
        var bbUpdated = false,
            objinst = {iam: 'inst', x: 0, y: 0, type: { name: 'hostObject2' }, set_bbox_changed: function() { bbUpdated = true }},
            behinst = new behavior.Instance(type, objinst);
        behinst.properties = properties;
        behinst.onCreate();
        behinst.fixture = {x: 20, y: 5}

        behinst.tick()

        it('did update its position according to the rubber band pull', function() {
            assert(bbUpdated);
            assert(Math.abs(behinst.inst.x - 0.021) <= 0.001, behinst.inst.x);
            assert(Math.abs(behinst.inst.y - 0.0052) <= 0.0001, behinst.inst.y);
        });
    });
});
