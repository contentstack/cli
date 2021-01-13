let extensionField;

$(document).ready(() => {
  ContentstackUIExtension.init().then((extension) => {
    extensionField = extension;
    let existingData = extensionField.field.getData()

    extensionField.window.enableAutoResizing();
  });

  $("#avatar").on('change', () => {
  	let file = $("#avatar").prop('files')
  	debugger
  	extensionField.field.setData(file)
  })

  window.extensionField = {};
});
