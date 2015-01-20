# Rubber Band
A rubber band behavior for Construct 2
This behavior can attach one object to another and exercise a force if these two objects get too far apart.
It can have additional gravity and drag configured to allow for some quite different use cases.

## State
The current implementation should be somewhat functional.
However the use of more than one band per instance is not advised due to undesired behavior under 'strong pull'.

There do not (yet?) exist any Expressions or Actions other than the bare minimum.
No performance optimizations have been done so far.
Also the save-load functionality is entirely untested. (saveToJSON, loadFromJSON)

### Known issues
* no isTied expression
* if items are shaked heavily the tied object might be catapulted somewhere into nirvana
* item starts jumping around under stressed rubber band if other forces are present
* crazy config values might create crazy behavior - won't fix. I like some of those. :)


## Disclaimer
This is still work in progress. Comments, feature requests and suggestions, especially regarding integration into Construct 2, are welcome.

## Development
The .c2addon can be build with grunt. Given a working [node.js](http://nodejs.org/) installation
```
npm install
grunt build
```
should do the trick.
