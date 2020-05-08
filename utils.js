const convertWikiNames = str => str.substring(0, 36).replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();

const convertWikiDate = str => str && str.replace(' ', 'T') + 'Z';

module.exports = {
  convertWikiNames,
  convertWikiDate
};
