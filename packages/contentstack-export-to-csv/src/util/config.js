module.exports = {
  limit:100,
  cancelString: 'Cancel and Exit',
  exportEntries: 'Export entries to a .CSV file',
  exportUsers: "Export organization users' data to a .CSV file",
  exportTeams: "Export organization teams' data to a .CSV file",
  exportTaxonomies: 'Export taxonomies to a .CSV file',
  adminError: "Unable to export data. Make sure you're an admin or owner of this organization",
  organizationNameRegex: /\'/,
  CLI_EXPORT_CSV_LOGIN_FAILED: "You need to login to execute this command. See: auth:login --help",
  CLI_EXPORT_CSV_ENTRIES_ERROR: "You need to either login or provide a management token to execute this command",
  CLI_EXPORT_CSV_API_FAILED: 'Something went wrong! Please try again'
};
