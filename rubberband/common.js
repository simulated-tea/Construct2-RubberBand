// Scripts in this file are included in both the IDE and runtime, so you only
// need to write scripts common to both once.

function forAll(context, array, callback) {
    for (var i = 0; i < array.length; ++i) {
        callback.call(context, i);
    }
}
