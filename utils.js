const createSlug = require('speakingurl');
const departments = require('./config/departments.json');

const capitalize = s => (s && s[0].toUpperCase() + s.slice(1)) || "";

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

const slugify = label => createSlug(label.trim(), { lang: 'fr', custom: { '.': '.', 'Ǧ': 'g' } });

// Taken from https://stackoverflow.com/a/21623206/7900695
const distanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
};

const addDays = (date, days) => {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const removeTime = dateTime => new Date(dateTime.toDateString());

module.exports = {
  capitalize,
  convertWikiNames,
  convertWikiDate,
  convertGogoDate,
  getSlugFromUri,
  getDepartmentName,
  slugify,
  distanceBetweenPoints,
  addDays,
  removeTime
};
