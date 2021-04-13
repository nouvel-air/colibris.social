const createSlug = require('speakingurl');
const departments = require('./departments.json');

const convertWikiNames = str =>
  str
    .substring(0, 36)
    .replace(/([a-zA-Z])(?=[A-Z])/g, '$1-')
    .toLowerCase();

const convertWikiDate = str => str && str.replace(' ', 'T');

const convertGogoDate = str => {
  if( !str ) return undefined;
  const [date, time] = str.split(' à ');
  if( !time ) return undefined;
  const [day, month, year] = date.split('/');
  const [hours, minutes] = time.split(':');
  const formattedDate = new Date(year, month, day, hours, minutes);
  return formattedDate.toISOString();
}

const getSlugFromUri = str => str.replace(/\/$/, '').replace(/.*\//, '');

const getDepartmentName = zip => {
  if (zip) {
    const departmentNumber = zip.toString().slice(0, 2);
    const department = departments.find(d => d.num_dep.toString() === departmentNumber);
    if (department) return department.dep_name;
  }
};

const slugify = label => createSlug(label.trim(), { lang: 'fr', custom: { '.': '.' } });

module.exports = {
  convertWikiNames,
  convertWikiDate,
  convertGogoDate,
  getSlugFromUri,
  getDepartmentName,
  slugify
};
