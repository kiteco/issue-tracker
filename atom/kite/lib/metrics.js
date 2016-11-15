var os = require('os');
const mixpanel = require('mixpanel');
const crypto = require('crypto');
const kitePkg = require('../package.json');

const MIXPANEL_TOKEN = '2ab52cc896c9c74a7452d65f00e4f938';

const OS_VERSION = os.type() + ' ' + os.release();

const client = mixpanel.init(MIXPANEL_TOKEN, {
  protocol: 'https',
});

// The list of all possible events
var events = {
  ACTIVATE: "activate",
};

// Generate a unique ID for this user and save it for future use.
function distinctID() {
  var id = atom.config.get('kite.distinctID');
  if (id === undefined) {
    id = crypto.randomBytes(32).toString('hex');
    atom.config.set('kite.distinctID', id);
  }
  return id;
}

// Send an event to mixpanel
function track(eventName, properties) {
  if (properties === undefined) {
    console.log("event: " + eventName);
  } else {
    console.log("event: " + eventName, properties);
  }
  eventData = {
      distinct_id: distinctID(),
      atom_version: atom.getVersion(),
      kite_plugin_version: kitePkg.version,
      os: OS_VERSION,
  };
  if (properties !== undefined) {
    for (var key in properties) {
      eventData[key] = properties[key];
    }
  }
  client.track(eventName, properties);
}

module.exports = {
  track: track,
};
