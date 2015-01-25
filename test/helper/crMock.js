"use strict";

var cr = {};
cr.behaviors = {};
cr.distanceTo = function(x, y, u, v) {
    return Math.sqrt((u - x)*(u - x) + (v - y)*(v - y));
};
cr.clamp = function(a, b, c) { return a }

module.exports = cr;
