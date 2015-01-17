# Rubber Band
A rubber band behavior for Construct 2
This behavior can attach one object to another and exercise a force if these two objects get too far apart.
It can have additional gravity and drag configured to allow for some quite different use cases.

# State
The current implementation should be fully functional.

There do not (yet?) exist any Expressions or Actions other than the bare minimum.
No performance optimizations have been done so far.

It is also currently limited to have only one instance of the behavior per object.
This is due to a 'ripping' effect if the bands get 'overstretched'.

# Disclaimer
This is still work in progress. Comments, feature requests and suggestions, especially regarding integration into Construct 2, are welcome.

# Development
The .c2addon can be build with grunt. Given a working [node.js](http://nodejs.org/) installation
```
npm install
grunt build
```
should do the trick.
