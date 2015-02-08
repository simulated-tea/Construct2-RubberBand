# Rubber Band
A rubber band behavior for Construct 2
This behavior can attach one object to another and exercise a force if these two objects get too far apart.
It can have additional gravity and drag configured to allow for some quite different use cases.

## State
The current implementation is functional.
No hard performance optimizations have been done so far.

### Known issues
* ~~collision checks not yet implemented~~ collisions, beeing pretty involved, will at most be a separate behavior
* if complex chains are shaken intensely they might spin around like crazy and not come back to rest or fly off to inifinity.
  Try increasing the drag to avoid this (e.g drag >= stiffness).
* crazy config values might create crazy behavior - won't fix. I like some of those. :)

## Disclaimer
This is still work in progress. Comments, feature requests and suggestions, especially regarding integration into Construct 2 or per-frame computation and game mechanics in general, are welcome.

## Development
The .c2addon can be build with grunt. Given a working [node.js](http://nodejs.org/) installation
```
npm install
grunt build
```
should do the trick.
