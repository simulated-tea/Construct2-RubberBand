"use strict";

var assert = require("./helper/better-assert")

describe('RubberBand - runtime', function(){
    global.cr = require('./helper/crMock');
    global.assert2 = function() {};
    require("./../rubberband/runtime")

    var behavior = new cr.behaviors.RubberBand({iam: 'runtime', getDt: function() { return 0.016 }}),
        type = new behavior.Type(behavior, {iam: 'objtype'}),
        actions = behavior.acts,
        defaultProperties = {
            relaxedLength: 10,
            stiffness: 5,
            gravity: 0,
            drag: 0,
            enabled: true,
        };

    describe('tie', function() {
        var objinst = {iam: 'inst', x: 0, y: 0},
            behinst = new behavior.Instance(type, objinst);

        actions.tie.call(behinst, {getFirstPicked: function () { return 'the target instance' }});

        it('should put the found instance into its fixture', function() {
            assert(behinst.fixture === 'the target instance');
        });
    });

    describe('tick', function() {
        var tests = [
            // plain rubber - plain acceleration, x quadratic in t, v linear in t
            {dt: 0.016, fixx: 20, fixy: 5, dx: 0, dy: 0, externShiftX: 0, externShiftY: 0,
                expectedX: 0.0209, expectedY: 0.0052, newdx: 0.8746, newdy: 0.2186},

            // picking up external momentum
            {dt: 0.016, fixx: 0, fixy: 0, dx: 0, dy: 0, externShiftX: -0.16, externShiftY: -0.16, relaxedLength: 100,
                expectedX: -0.08, expectedY: -0.08, newdx: -5, newdy: -5},
        ].forEach(function (params) {
            var bbUpdated = false,
                objinst = {iam: 'inst', x: 0, y: 0, type: { name: 'hostObject2' },
                    set_bbox_changed: function() { bbUpdated = true }
                },
                behinst = new behavior.Instance(type, objinst);
            prepareBehaviorInstanceForTest(behinst, params);

            behinst.tick()

            it('updates position correctly - '+commentOnParams(params), function() {
                assert(bbUpdated);
                assert(aboutEqual(behinst.inst.x, params.expectedX), behinst.inst.x+' =~= '+params.expectedX);
                assert(aboutEqual(behinst.inst.y, params.expectedY), behinst.inst.y+' =~= '+params.expectedY);
            });
            it('updates speed correctly - '+commentOnParams(params), function() {
                assert(aboutEqual(behinst.dx, params.newdx), behinst.dx+' =~= '+params.newdx);
                assert(aboutEqual(behinst.dy, params.newdy), behinst.dy+' =~= '+params.newdy);
            });
        });
    });

    function aboutEqual(a, b) {
        return Math.abs(a - b) <= 0.0001;
    }
    function prepareBehaviorInstanceForTest(behinst, params) {
        behinst.runtime = {getDt: function() { return params.dt }};
        behinst.properties = [];
        Object.keys(defaultProperties).forEach(function (key) {
            behinst.properties.push(params[key] ? params[key] : defaultProperties[key]);
        });
        behinst.onCreate();
        behinst.fixture = {x: params.fixx, y: params.fixy}
        behinst.lastX = -params.externShiftX;
        behinst.lastY = -params.externShiftY;
        behinst.dx = params.dx;
        behinst.dy = params.dy;
    };

    function commentOnParams(params) {
        return (!params.relaxedLength || params.relaxedLength <= cr.distanceTo(0, 0, params.fixx, params.fixy) ? 'with rubber band, ' : '')
            +(params.dt <= 0.01 ? 'short time, ' : params.dt > 0.1 ? 'long time, ' : '')
            +(params.externShiftX || params.externShiftY ? 'with external force, ' : '')
            +(params.dx || params.dy ? 'with initial momentum, ' : '');
    }
});

