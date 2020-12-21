let extensionField;

$(document).ready(() => {
  ContentstackUIExtension.init().then((extension) => {
    extensionField = extension;

    extensionField.window.enableAutoResizing();
  });

  window.extensionField = {};
});
