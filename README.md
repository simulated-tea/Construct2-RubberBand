# Rubber Band
A rubber band behavior for Construct 2
This behavior can attach one object to another and exercise a force if these two objects get too far apart.
It can have additional gravity and drag configured to allow for some quite different use cases.

## State
The current implementation should be somewhat functional.

There do not (yet?) exist any Expressions or Actions beyond the bare minimum.
No performance optimizations have been done so far.
Also the save-load functionality is entirely untested. (saveToJSON, loadFromJSON)

### Known issues
* collision checks not yet implemented
* many actions are still missing: cannot change config at runtime
* if complex chains are shaken they might spin around like crazy and not come back to rest.
  Try increasing the drag or stiffness to avoid this.
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
