const os = require('os');
const path = require('path');
const utils = require('./utils.js');
const StateController = require('kite-installer/lib/state-controller.js');

var Ready = {
  currentPath: function() {
    var editor = atom.workspace.getActivePaneItem();
    if (editor === undefined) {
      return null;
    }
    return editor.buffer.file.path;
  },

  // ensure checks that Kite is installed, running, reachable, authenticated,
  // and enabled in the current directory. If any of these checks fail then an
  // appropriate noficiation is displayed with a button that lets the user fix
  // the problem.
  ensure: function() {
    var curpath = this.currentPath();
    StateController.handleState(curpath).then((state) => {
      console.log("current state is "+state);
      switch (state) {
        case StateController.STATES.UNSUPPORTED:
          console.log("kite is not supported");
          this.warnNotSupported();
          break;
        case StateController.STATES.UNINSTALLED:
          console.log("kite is not installed");
          this.warnNotInstalled();
          break;
        case StateController.STATES.INSTALLED:
          console.log("kite is installed but not running");
          this.warnNotRunning();
          break;
        case StateController.STATES.RUNNING:
          console.log("kite is running but not reachable");
          this.warnNotReachable();
          break;
        case StateController.STATES.REACHABLE:
          console.log("kite is reachable but not authenticated");
          this.warnNotAuthenticated();
          break;
        case StateController.STATES.AUTHENTICATED:
          console.log("kite is reachable but dir is not whitelisted");
          this.warnNotWhitelisted(curpath);
          break;
        case StateController.STATES.WHITELISTED:
          console.log("kite is ready");
          break;
      }
    }, (err) => {
      console.log("handleState failed: ", err);
    });
  },

  warnNotSupported: function() {
    atom.notifications.addError(
      "The Kite autocomplete daemon is not supported on this platform", {
      description: "Kite is currently only supported on macOS.",
      icon: "circle-slash",
      dismissable: true,
    });
  },

  warnNotInstalled: function() {
    var notification = atom.notifications.addWarning(
      "The Kite autocomplete daemon is not installed", {
      description: "In order to provide completions the Kite daemon needs to be installed.",
      icon: "circle-slash",
      dismissable: true,
      buttons: [{
        text: "Install Kite",
        onDidClick: () => {
          notification.dismiss();
          this.install();
        }
      }]
    });
    notification.onDidDismiss(this.onDismiss);
  },

  install: function() {
    console.log("installing kite...");
    StateController.installKiteRelease().then(() => {
      console.log("kite is installed, now attempting to start...");
      this.launch();
    }, (err) => {
      // installation failed, show an error notification
      console.log("installation failed: ", err);
      var notification = atom.notifications.addError("Unable to install Kite", {
        description: JSON.stringify(err),
        dismissable: true,
        buttons: [{
          text: "Retry",
          onDidClick: () => {
            notification.dismiss();
            this.install();
          }
        }]
      });
      notification.onDidDismiss(this.onDismiss);
    });
    // TODO: on failure display a notification with an option to retry
  },

  warnNotRunning: function() {
    var notification = atom.notifications.addWarning(
      "The Kite autocomplete daemon is not running", {
      description: "In order to provide completions the Kite daemon needs to be running.",
      icon: "circle-slash",
      dismissable: true,
      buttons: [{
        text: "Start Kite",
        onDidClick: () => {
          notification.dismiss();
          this.launch();
        }
      }]
    });
    notification.onDidDismiss(this.onDismiss);
  },

  launch: function() {
    console.log("starting kite...");
    StateController.runKite().then(() => {
      // TODO: remove this "sleep" after the runKite promise resolves only when kite is running
      setTimeout(() => {
        console.log("Kite started successfully, going back to ensure...");
        this.ensure();
      }, 5000);
    }, (err) => {
      var notification = atom.notifications.addError("Unable to start Kite autocomplete daemon", {
        description: JSON.stringify(err),
        dismissable: true,
        buttons: [{
          text: "Retry",
          onDidClick: () => {
            notification.dismiss();
            this.launch();
          }
        }]
      });
      notification.onDidDismiss(this.onDismiss);
    });
  },

  warnNotReachable: function() {
    atom.notifications.addError(
      "The Kite autocomplete daemon is running but not reachable", {
      description: "Try killing Kite from Activity Monitor.",
      dismissable: true,
    }).onDidDismiss(this.onDismiss);
  },

  warnNotAuthenticated: function() {
    var notification = atom.notifications.addWarning(
      "You need to log in to the Kite autocomplete daemon", {
      description: "In order to provide completions the Kite daemon needs to be authenticated (so that it can access the index of your code stored on the cloud).",
      icon: "circle-slash",
      dismissable: true,
      buttons: [{
        text: "Login",
        onDidClick: () => {
          notification.dismiss();
          this.authenticate();
        }
      }]
    });
    notification.onDidDismiss(this.onDismiss);
  },

  authenticate: function() {
    console.log("user chose to log in to kite...");

    // TODO: show some kind of login UI
    var email = "test@kite.com";
    var password = "123123";

    StateController.authenticateUser(email, password).then(() => {
      console.log("authentication succeeded, going back to ensure...");
      this.ensure();
    }, (err) => {
      console.log("authentication failed:", err);
      var notification = atom.notifications.addError("Unable to login", {
        description: JSON.stringify(err),
        dismissable: true,
        buttons: [{
          text: "Retry",
          onDidClick: () => {
            notification.dismiss();
            this.authenticate();
          }
        }]
      });
    });
  },

  warnNotWhitelisted: function(filepath) {
    var dir = path.dirname(filepath);
    var notification = atom.notifications.addWarning(
      "Kite completions are not enabled for "+filepath, {
      description: "Kite only processes files in enabled directories. If you enable Kite then files in this directory will be synced to the Kite backend, where they will be analyzed and indexed.",
      icon: "circle-slash",
      dismissable: true,
      buttons: [{
        text: "Enable Kite for "+dir,
        onDidClick: () => {
          notification.dismiss();
          this.whitelist(dir);
        }
      }]
    });
    notification.onDidDismiss(this.onDismiss);
  },

  whitelist: function(dirpath) {
    console.log("user chose to whitelist " + dirpath);
    StateController.whitelistPath(dirpath).then(() => {
      console.log("successfully whitelisted, going back to ensure...");
      this.ensure();
    }, (err) => {
      console.log("whitelist failed:", err);
      var notification = atom.notifications.addError("Unable to enable Kite for "+dirpath, {
        description: JSON.stringify(err),
        dismissable: true,
        buttons: [{
          text: "Retry",
          onDidClick: () => {
            notification.dismiss();
            this.whitelist(dirpath);
          }
        }]
      });
    });
  },

  onDismiss: function() {
    console.log("notification was dismissed");
  }
};

module.exports = Ready;
