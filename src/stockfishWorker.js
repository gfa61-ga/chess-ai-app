/* eslint-disable no-restricted-globals */

const engine = new Worker('stockfish.js');

// Όταν ο engine στέλνει μήνυμα, το προωθούμε στο κύριο νήμα.
engine.onmessage = function(e) {
  postMessage(e.data);
};

// Όταν λαμβάνουμε μήνυμα από το κύριο νήμα, το στέλνουμε στον engine.
onmessage = function(e) {
  engine.postMessage(e.data);
};
