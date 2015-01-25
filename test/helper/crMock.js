"use strict";

var cr = {};
cr.behaviors = {};
cr.distanceTo = function(x, y, u, v) {
    return Math.sqrt((u - x)*(u - x) + (v - y)*(v - y));
};

module.exports = cr;
