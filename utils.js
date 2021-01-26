const createSlug = require('speakingurl');
const departments = require('./departments.json');

const convertWikiNames = str =>
  str
    .substring(0, 36)
    .replace(/([a-zA-Z])(?=[A-Z])/g, '$1-')
    .toLowerCase();

const convertWikiDate = str => str && str.replace(' ', 'T');

const getSlugFromUri = str => str.replace(/\/$/, '').replace(/.*\//, '');

const getDepartmentName = zip => {
  if (zip) {
    const departmentNumber = zip.toString().slice(0, 2);
    const department = departments.find(d => d.num_dep.toString() === departmentNumber);
    if (department) return department.dep_name;
  }
};

const slugify = label => createSlug(label.trim(), { lang: 'fr', custom: { '.': '.' } });

const delay = t => new Promise(resolve => setTimeout(resolve, t));

module.exports = {
  convertWikiNames,
  convertWikiDate,
  getSlugFromUri,
  getDepartmentName,
  slugify,
  delay
};
