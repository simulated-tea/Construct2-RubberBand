"use strict";

var assert = require("./helper/better-assert")

describe('RubberBand - runtime', function(){
    global.cr = require('./helper/crMock');
    global.window = require('./helper/browserMock');
    global.assert2 = function() {};
    require("./../rubberband/runtime")

    var behavior = new cr.behaviors.RubberBand({
            iam: 'runtime',
            getDt: function() { return 0.016; },
            testOverlapSolid: function() { return null; }
        }),
        type = new behavior.Type(behavior, {iam: 'objtype'}),
        actions = behavior.acts,
        defaultProperties = {
            relaxedLength: 10,
            stiffness: 5,
            gravity: 0,
            drag: 0,
            colliding: false,
            enabled: true
        };

    describe('tie', function() {
        var objinst = {iam: 'inst', x: 0, y: 0},
            behinst = new behavior.Instance(type, objinst);

        actions.tie.call(behinst, {getFirstPicked: function () { return 'the target instance' }});

        it('should put the found instance into its fixture', function() {
            assert(behinst.fixture === 'the target instance');
        });
    });

    xdescribe('tick', function() {
        var tests = [
            // plain rubber - plain acceleration, x quadratic in t, v linear in t
            {dt: 0.016, fixx: 40, fixy: 5, dx: 0, dy: 0, externShiftX: 0, externShiftY: 0,
                expectedX: 0.1750, expectedY: 0.0219, newdx: 7.2934, newdy: 0.9117},

            // picking up external momentum
            {dt: 0.016, fixx: 0, fixy: 0, dx: 0, dy: 0, externShiftX: -0.32, externShiftY: -0.32, relaxedLength: 100,
                expectedX: -0.16, expectedY: -0.16, newdx: -10, newdy: -10},
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

    xdescribe('calculateBounceOffSpeed', function() {
        var c = {
            bquad: { tlx: -10, tly: -10, trx: 10, try_: -10, blx: -10, bly: 10, brx: 10, bry: 10,
                midX: function() { return 0; }, midY: function() { return 0; }
            }};

        [
        { inst: { x:   5, y: -15 }, dx: - 5, dy:  10, expect: { dx: - 5, dy: -10 }, testname: '1 o\'clock innward' },
        { inst: { x:   5, y: -15 }, dx:   5, dy:  10, expect: { dx:   5, dy: -10 }, testname: '1 o\'clock outward' },
        { inst: { x:  15, y: - 5 }, dx: -10, dy:   5, expect: { dx:  10, dy:   5 }, testname: '2 o\'clock innward' },
        { inst: { x:  15, y: - 5 }, dx: -10, dy: - 5, expect: { dx:  10, dy: - 5 }, testname: '2 o\'clock outward' },
        { inst: { x:  15, y:   5 }, dx: -10, dy: - 5, expect: { dx:  10, dy: - 5 }, testname: '4 o\'clock innward' },
        { inst: { x:  15, y:   5 }, dx: -10, dy:   5, expect: { dx:  10, dy:   5 }, testname: '4 o\'clock outward' },
        { inst: { x:   5, y:  15 }, dx: - 5, dy: -10, expect: { dx: - 5, dy:  10 }, testname: '5 o\'clock innward' },
        { inst: { x:   5, y:  15 }, dx:   5, dy: -10, expect: { dx:   5, dy:  10 }, testname: '5 o\'clock outward' },
        { inst: { x: - 5, y:  15 }, dx:   5, dy: -10, expect: { dx:   5, dy:  10 }, testname: '7 o\'clock innward' },
        { inst: { x: - 5, y:  15 }, dx: - 5, dy: -10, expect: { dx: - 5, dy:  10 }, testname: '7 o\'clock outward' },
        { inst: { x: -15, y:   5 }, dx:  10, dy: - 5, expect: { dx: -10, dy: - 5 }, testname: '8 o\'clock innward' },
        { inst: { x: -15, y:   5 }, dx:  10, dy:   5, expect: { dx: -10, dy:   5 }, testname: '8 o\'clock outward' },
        { inst: { x: -15, y: - 5 }, dx:  10, dy:   5, expect: { dx: -10, dy:   5 }, testname: '10 o\'clock innward' },
        { inst: { x: -15, y: - 5 }, dx:  10, dy: - 5, expect: { dx: -10, dy: - 5 }, testname: '10 o\'clock outward' },
        { inst: { x: - 5, y: -15 }, dx:   5, dy:  10, expect: { dx:   5, dy: -10 }, testname: '11 o\'clock innward' },
        { inst: { x: - 5, y: -15 }, dx: - 5, dy:  10, expect: { dx: - 5, dy: -10 }, testname: '11 o\'clock innward' },


        { inst: { x:   0, y: -15 }, dx:   5, dy:  10, expect: { dx:   5, dy: -10 }, testname: '12 o\'clock rightward' }
        ].forEach(function (this_) {
            it(' test for '+this_.testname, function () {
                if (!this_.elasticity) { this_.elasticity = 1; }
                if (!this_.inst.set_bbox_changed) { this_.inst.set_bbox_changed = function() { return null; } }
                if (!this_.runtime) { this_.runtime = behavior.runtime; }

                behavior.Instance.prototype.calculateBounceOffSpeed.call(this_, c);

                assert(this_.dx == this_.expect.dx, this_.dx+' == '+this_.expect.dx);
                assert(this_.dy == this_.expect.dy, this_.dy+' == '+this_.expect.dy);
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

